const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isProd = app.isPackaged || process.env.NODE_ENV === 'production';
let serverProcess = null;

const http = require('http');

function waitForServer(url, timeoutMs = 20000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(url, (res) => {
        resolve(true);
      });
      req.on('error', () => {
        if (Date.now() - startTime > timeoutMs) {
          resolve(false);
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: "AeroTrackTiming",
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  let retries = 0;
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (validatedURL.startsWith('http://localhost:3000') && retries < 30) {
      retries++;
      setTimeout(() => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://localhost:3000');
        }
      }, 300);
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      require('electron').shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  
  // mainWindow.webContents.openDevTools();
}

// Ensure single instance lock
const additionalData = { myKey: 'aerotracktiming' };
const gotTheLock = app.requestSingleInstanceLock(additionalData);

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isMinimized()) windows[0].restore();
      windows[0].focus();
    }
  });

  app.whenReady().then(async () => {
    if (isProd) {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '3000';
      try {
        require(path.join(__dirname, 'dist', 'server.cjs'));
        console.log("Server started in main process");
      } catch (err) {
        console.error("Failed to start server:", err);
      }
      // Delay window creation slightly to ensure Express is listening
      setTimeout(createWindow, 500);
    } else {
      console.log("Starting development server...");
      try {
        const tsxCli = require.resolve('tsx/cli');
        serverProcess = spawn(process.execPath, [tsxCli, 'server.ts'], {
          stdio: 'inherit',
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
        });
      } catch (e) {
        // Fallback to node directly
        serverProcess = spawn('node', [path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs'), 'server.ts'], {
          stdio: 'inherit'
        });
      }

      serverProcess.on('error', (err) => {
        console.error('Failed to start development server:', err);
      });

      // Wait until the Express & Vite dev server responds before opening the window
      await waitForServer('http://localhost:3000');
      createWindow();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function cleanup() {
  if (serverProcess) {
    console.log("Stopping development server...");
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      exec(`taskkill /pid ${serverProcess.pid} /T /F`, (err) => {
        if (err) {
          // Ignore errors if the process was already dead
        }
      });
    } else {
      serverProcess.kill('SIGTERM');
    }
    serverProcess = null;
  }
}

app.on('will-quit', cleanup);
process.on('exit', cleanup);
