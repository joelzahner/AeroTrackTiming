const { app, BrowserWindow } = require('electron');
const path = require('path');

const isProd = app.isPackaged || process.env.NODE_ENV === 'production';

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

  mainWindow.loadURL('http://localhost:3000');
  
  if (!isProd) {
    mainWindow.webContents.openDevTools();
  }
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

  app.whenReady().then(() => {
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
