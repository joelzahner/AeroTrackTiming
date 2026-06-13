import express from "express";
import path from "path";
import fs from "fs";
import { exec, spawn, ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Prepare config directory in user APPDATA (cross-platform fallback to user home / local config)
const CONFIG_DIR = path.join(
  process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library/Preferences') : path.join(process.env.HOME || '', '.config')),
  "AeroTrackTiming"
);
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface AppConfig {
  csvStoragePath: string;
  isConfigured: boolean;
}

let activeConfig = loadConfig();

function loadConfig(): AppConfig {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (data.csvStoragePath) {
        return data;
      }
    } catch (e) {
      console.error("Failed to parse config.json, using default path", e);
    }
  }
  
  // Default path: User's Documents folder
  const defaultPath = path.join(
    process.env.USERPROFILE || process.env.HOME || process.cwd(),
    "Documents",
    "AeroTrackTiming"
  );
  return { csvStoragePath: defaultPath, isConfigured: false };
}

function saveConfig(config: AppConfig) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

// Helpers for dynamic file system routes
function getDataDir(): string {
  return activeConfig.csvStoragePath;
}

function getRacesDir(): string {
  return path.join(getDataDir(), "races");
}

function getTagsFile(): string {
  return path.join(getDataDir(), "tags.csv");
}

function getRegistrationsFile(): string {
  return path.join(getDataDir(), "registrations.csv");
}

// Ensure base files and templates exist in the target directory
function ensureBOMAndSep(filePath: string, defaultHeader: string) {
  const defaultHeaderSemicolon = defaultHeader.replace(/,/g, ";");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "\ufeff" + defaultHeaderSemicolon + "\r\n", "utf8");
    return;
  }
  try {
    let content = fs.readFileSync(filePath, "utf8");
    let changed = false;
    
    // Normalize line endings to CRLF for Excel/Windows compatibility
    const normalizedContent = content.replace(/\r?\n/g, "\r\n");
    if (normalizedContent !== content) {
      content = normalizedContent;
      changed = true;
    }
    
    // If it has sep=, remove it because Excel ignores BOM when sep= is present
    if (content.startsWith("\ufeffsep=") || content.startsWith("sep=")) {
      let contentWithoutSep = content;
      if (content.startsWith("\ufeff")) {
        contentWithoutSep = content.slice(1);
      }
      const newlineIndex = contentWithoutSep.indexOf("\r\n");
      if (newlineIndex !== -1) {
        content = contentWithoutSep.slice(newlineIndex + 2);
      } else {
        const lfIndex = contentWithoutSep.indexOf("\n");
        if (lfIndex !== -1) {
          content = contentWithoutSep.slice(lfIndex + 1);
        }
      }
      changed = true;
    }

    if (!content.startsWith("\ufeff")) {
      content = "\ufeff" + content;
      changed = true;
    }
    
    // Convert commas to semicolons if they exist as delimiters in the header
    const firstLine = content.slice(1).split("\r\n")[0];
    if (firstLine.includes(",") && !firstLine.includes(";")) {
      content = content.replace(/,/g, ";");
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Migrated ${filePath} to UTF-8 BOM, CRLF and semicolon delimiters`);
    }
  } catch (err) {
    console.error(`Failed to migrate file ${filePath}:`, err);
  }
}

function initializeStorage(dirPath: string) {
  const racesDir = path.join(dirPath, "races");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  if (!fs.existsSync(racesDir)) {
    fs.mkdirSync(racesDir, { recursive: true });
  }

  const tagsFile = path.join(dirPath, "tags.csv");
  ensureBOMAndSep(tagsFile, "startnummer,epc,timestamp,status");

  const registrationsFile = path.join(dirPath, "registrations.csv");
  ensureBOMAndSep(registrationsFile, "vorname,name,geburtsdatum,startnummer,wohnort,gender,club");

  try {
    if (fs.existsSync(racesDir)) {
      const files = fs.readdirSync(racesDir);
      files.forEach((file) => {
        if (file.endsWith(".csv")) {
          ensureBOMAndSep(path.join(racesDir, file), "startnummer,typ,timestamp,exactMs");
        }
      });
    }
  } catch (err) {
    console.error("Failed to migrate existing race files:", err);
  }
}

// Initialize directory structure if configured on load
if (activeConfig.isConfigured) {
  try {
    initializeStorage(activeConfig.csvStoragePath);
  } catch (err) {
    console.error("Failed to initialize storage directory on boot:", err);
  }
}

// Helper to escape simple CSV fields
function escapeCSVField(val: string): string {
  if (typeof val !== "string") return String(val);
  if (val.includes(";") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// Parsing CSV Helper – with proper boolean handling
function parseCSV(content: string, expectedHeaders?: string[]): any[] {
  if (content.startsWith("\ufeff")) {
    content = content.slice(1);
  }
  if (content.startsWith("sep=")) {
    const newlineIndex = content.indexOf("\n");
    if (newlineIndex !== -1) {
      content = content.slice(newlineIndex + 1);
    }
  }
  const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];

  // Detect delimiter dynamically (either semicolon or comma)
  const delimiter = lines[0].includes(";") ? ";" : ",";

  let headers: string[];
  let startIdx: number;

  if (expectedHeaders && expectedHeaders.length > 0) {
    const firstLineFields = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    // Check if the first line contains any of the expected headers (case-insensitive)
    const isHeader = expectedHeaders.some(expected => 
      firstLineFields.includes(expected.toLowerCase())
    );

    if (isHeader) {
      headers = lines[0].split(delimiter).map(h => h.trim());
      startIdx = 1;
    } else {
      headers = expectedHeaders;
      startIdx = 0;
    }
  } else {
    headers = lines[0].split(delimiter).map(h => h.trim());
    startIdx = 1;
  }

  const results: any[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const rowRaw = lines[i];
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;
    for (let charIndex = 0; charIndex < rowRaw.length; charIndex++) {
      const c = rowRaw[charIndex];
      if (c === '"') {
        insideQuotes = !insideQuotes;
      } else if (c === delimiter && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    values.push(current.trim());

    const parsedRow: any = {};
    headers.forEach((header, idx) => {
      let val: any = values[idx] !== undefined ? values[idx] : "";
      // Convert boolean fields
      if (header === "club") {
        val = val === "true" || val === "1" || val === "yes";
      }
      parsedRow[header] = val;
    });
    results.push(parsedRow);
  }
  return results;
}

// ============================================================
//  RFID READER BRIDGE MANAGEMENT
// ============================================================

interface RfidState {
  mode: "disconnected" | "reader" | "simulation";
  bridgeProcess: ChildProcess | null;
  lastEpc: string;
  lastPc: string;
  lastCrc: string;
  lastTimestamp: string;
  lastRssi: number;
  connected: boolean;
  comPort: string;
  baudRate: number;
  antennaIndex: number;
  statusMessages: string[];
  // Buffer of unread tags (consumed by polling)
  tagBuffer: Array<{ epc: string; pc: string; crc: string; timestamp: string }>;
  // For Ziel monitoring
  monitoring: boolean;
  monitorRace: string;
}

const rfidState: RfidState = {
  mode: "simulation",
  bridgeProcess: null,
  lastEpc: "",
  lastPc: "",
  lastCrc: "",
  lastTimestamp: "",
  lastRssi: -50,
  connected: false,
  comPort: "COM8",
  baudRate: 38400,
  antennaIndex: 1,
  statusMessages: [],
  tagBuffer: [],
  monitoring: false,
  monitorRace: "",
};

function getBridgeExePath(): string {
  // Look for the compiled bridge exe
  const candidates = [
    path.join(__dirname, "Reader", "ReaderBridge", "bin", "Debug", "ReaderBridge.exe"),
    path.join(process.cwd(), "Reader", "ReaderBridge", "bin", "Debug", "ReaderBridge.exe"),
    path.join(process.cwd(), "Reader", "ReaderBridge", "bin", "Release", "ReaderBridge.exe"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[1]; // default
}

function startBridge(comPort: string, baudRate: number, antennaIndex: number): boolean {
  if (rfidState.bridgeProcess) {
    stopBridge();
  }

  const exePath = getBridgeExePath();
  if (!fs.existsSync(exePath)) {
    rfidState.statusMessages.push(`Bridge executable not found: ${exePath}`);
    rfidState.mode = "simulation";
    return false;
  }

  try {
    const child = spawn(exePath, [
      "--port", comPort,
      "--baud", String(baudRate),
      "--antenna", String(antennaIndex)
    ], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let lineBuffer = "";

    child.stdout?.on("data", (data: Buffer) => {
      lineBuffer += data.toString("utf8");
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() || "";
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          if (msg.type === "tag") {
            rfidState.lastEpc = msg.epc || "";
            rfidState.lastPc = msg.pc || "";
            rfidState.lastCrc = msg.crc || "";
            rfidState.lastTimestamp = msg.timestamp || new Date().toISOString();
            rfidState.lastRssi = msg.rssi || Math.floor(Math.random() * 20) - 55;
            // Add to buffer for polling
            rfidState.tagBuffer.push({
              epc: rfidState.lastEpc,
              pc: rfidState.lastPc,
              crc: rfidState.lastCrc,
              timestamp: rfidState.lastTimestamp,
            });
            // Keep buffer manageable
            if (rfidState.tagBuffer.length > 100) {
              rfidState.tagBuffer = rfidState.tagBuffer.slice(-50);
            }

            // If monitoring is active, automatically register ZIEL event
            if (rfidState.monitoring && rfidState.monitorRace) {
              handleAutoZielDetection(rfidState.lastEpc);
            }
          } else if (msg.type === "status") {
            rfidState.statusMessages.push(msg.message || "");
            if (rfidState.statusMessages.length > 50) {
              rfidState.statusMessages = rfidState.statusMessages.slice(-25);
            }
          } else if (msg.type === "error") {
            rfidState.statusMessages.push(`ERROR: ${msg.message}`);
          }
        } catch (parseErr) {
          // Non-JSON output, ignore
        }
      }
    });

    child.stderr?.on("data", (data: Buffer) => {
      rfidState.statusMessages.push(`STDERR: ${data.toString("utf8").trim()}`);
    });

    child.on("close", (code: number | null) => {
      rfidState.statusMessages.push(`Bridge process exited with code ${code}`);
      rfidState.connected = false;
      rfidState.bridgeProcess = null;
      if (rfidState.mode === "reader") {
        rfidState.mode = "simulation";
      }
    });

    child.on("error", (err: Error) => {
      rfidState.statusMessages.push(`Bridge process error: ${err.message}`);
      rfidState.connected = false;
      rfidState.bridgeProcess = null;
      rfidState.mode = "simulation";
    });

    rfidState.bridgeProcess = child;
    rfidState.connected = true;
    rfidState.mode = "reader";
    rfidState.comPort = comPort;
    rfidState.baudRate = baudRate;
    rfidState.antennaIndex = antennaIndex;
    return true;
  } catch (err: any) {
    rfidState.statusMessages.push(`Failed to start bridge: ${err.message}`);
    rfidState.mode = "simulation";
    return false;
  }
}

function stopBridge() {
  if (rfidState.bridgeProcess) {
    try {
      rfidState.bridgeProcess.stdin?.write("QUIT\n");
      setTimeout(() => {
        if (rfidState.bridgeProcess) {
          rfidState.bridgeProcess.kill("SIGTERM");
          rfidState.bridgeProcess = null;
        }
      }, 1000);
    } catch (e) {
      rfidState.bridgeProcess?.kill("SIGTERM");
      rfidState.bridgeProcess = null;
    }
  }
  rfidState.connected = false;
  rfidState.mode = "disconnected";
  rfidState.monitoring = false;
}

// Auto-detection: When a tag is scanned while monitoring, create ZIEL event
function handleAutoZielDetection(epc: string) {
  if (!activeConfig.isConfigured || !rfidState.monitorRace) return;

  // Find startnummer for this EPC
  const tagsFile = getTagsFile();
  if (!fs.existsSync(tagsFile)) return;
  const tagsContent = fs.readFileSync(tagsFile, "utf8");
  const tags = parseCSV(tagsContent, ["startnummer", "epc", "timestamp", "status"]);
  
  // Match EPC (case-insensitive, ignore spaces)
  const normalizedEpc = epc.replace(/\s/g, "").toUpperCase();
  const matchingTag = tags.find((t: any) => {
    const tagEpc = (t.epc || "").replace(/\s/g, "").toUpperCase();
    return tagEpc === normalizedEpc;
  });

  if (!matchingTag) return;

  const bib = matchingTag.startnummer;
  const raceName = rfidState.monitorRace;
  const racesDir = getRacesDir();
  const filePath = path.join(racesDir, `${raceName}.csv`);
  
  if (!fs.existsSync(filePath)) return;

  // Duplicate check: only one ZIEL per bib per race
  const raceContent = fs.readFileSync(filePath, "utf8");
  const raceEvents = parseCSV(raceContent, ["startnummer", "typ", "timestamp", "exactMs"]);
  const alreadyFinished = raceEvents.some(
    (e: any) => e.startnummer === bib && e.typ === "ZIEL"
  );
  if (alreadyFinished) return;

  // Write ZIEL event
  const now = new Date();
  const hrs = String(now.getHours()).padStart(2, "0");
  const mins = String(now.getMinutes()).padStart(2, "0");
  const secs = String(now.getSeconds()).padStart(2, "0");
  const hundredths = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, "0");
  const timestamp = `${hrs}:${mins}:${secs}.${hundredths}`;
  const exactMs = Date.now();

  const line = `${escapeCSVField(bib)};ZIEL;${escapeCSVField(timestamp)};${exactMs}\r\n`;
  fs.appendFileSync(filePath, line, "utf8");
  rfidState.statusMessages.push(`AUTO-ZIEL: Bib #${bib} um ${timestamp}`);
}

// ============================================================
//  API ENDPOINTS
// ============================================================

// settings API
app.get("/api/settings", (req, res) => {
  res.json({
    csvStoragePath: activeConfig.csvStoragePath,
    isConfigured: activeConfig.isConfigured
  });
});

app.post("/api/settings", (req, res) => {
  const { csvStoragePath } = req.body;
  if (!csvStoragePath) {
    return res.status(400).json({ error: "Storage path is required." });
  }
  try {
    const targetPath = path.resolve(csvStoragePath);
    initializeStorage(targetPath);
    activeConfig = { csvStoragePath: targetPath, isConfigured: true };
    saveConfig(activeConfig);
    res.json({ success: true, csvStoragePath: targetPath });
  } catch (err: any) {
    res.status(500).json({ error: `Ordner konnte nicht initialisiert werden: ${err.message}` });
  }
});

app.post("/api/settings/select-directory", (req, res) => {
  // Use PowerShell folder browser dialog on Windows
  const command = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = 'Wählen Sie den AeroTrackTiming Speicherordner für CSV-Dateien'; $dialog.ShowNewFolderButton = $true; $result = $dialog.ShowDialog(); if ($result -eq 'OK') { Write-Output $dialog.SelectedPath } else { Write-Output 'CANCELLED' }"`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error("PowerShell folder picker error:", error);
      return res.status(500).json({ error: "Auswahldialog fehlgeschlagen." });
    }
    const pathOutput = stdout.trim();
    if (pathOutput === "CANCELLED" || !pathOutput) {
      return res.json({ cancelled: true });
    }
    res.json({ path: pathOutput });
  });
});

// ============================================================
//  RFID API ENDPOINTS
// ============================================================

app.get("/api/rfid/status", (req, res) => {
  res.json({
    mode: rfidState.mode,
    connected: rfidState.connected,
    comPort: rfidState.comPort,
    baudRate: rfidState.baudRate,
    antennaIndex: rfidState.antennaIndex,
    lastEpc: rfidState.lastEpc,
    lastTimestamp: rfidState.lastTimestamp,
    monitoring: rfidState.monitoring,
    monitorRace: rfidState.monitorRace,
    bufferSize: rfidState.tagBuffer.length,
    recentMessages: rfidState.statusMessages.slice(-10),
  });
});

app.post("/api/rfid/connect", (req, res) => {
  const { port, baudRate, antennaIndex } = req.body;
  const comPort = port || rfidState.comPort || "COM8";
  const baud = baudRate || rfidState.baudRate || 38400;
  const antenna = antennaIndex ?? rfidState.antennaIndex ?? 1;

  const ok = startBridge(comPort, baud, antenna);
  res.json({
    success: ok,
    mode: rfidState.mode,
    connected: rfidState.connected,
  });
});

app.post("/api/rfid/disconnect", (req, res) => {
  stopBridge();
  res.json({ success: true, mode: rfidState.mode });
});

app.get("/api/rfid/ports", (req, res) => {
  // List COM ports on Windows via PowerShell
  exec(`powershell -NoProfile -Command "[System.IO.Ports.SerialPort]::GetPortNames() | ForEach-Object { Write-Output $_ }"`, (error, stdout) => {
    if (error) {
      return res.json({ ports: [] });
    }
    const ports = stdout.trim().split("\n").map(p => p.trim()).filter(Boolean);
    res.json({ ports });
  });
});

// Get next unread tag from buffer (for polling)
app.get("/api/rfid/last-scan", (req, res) => {
  if (rfidState.tagBuffer.length > 0) {
    const tag = rfidState.tagBuffer.shift()!;
    res.json({
      found: true,
      epc: tag.epc,
      pc: tag.pc,
      crc: tag.crc,
      timestamp: tag.timestamp,
      rssi: rfidState.lastRssi,
    });
  } else {
    res.json({ found: false });
  }
});

// Simulate a tag scan (for testing without hardware)
app.post("/api/rfid/simulate-scan", (req, res) => {
  const { epc } = req.body;
  if (!epc) {
    return res.status(400).json({ error: "EPC is required." });
  }
  const now = new Date();
  rfidState.lastEpc = epc;
  rfidState.lastTimestamp = now.toISOString();
  rfidState.lastRssi = Math.floor(Math.random() * 20) - 55;
  rfidState.tagBuffer.push({
    epc,
    pc: "3000",
    crc: "0000",
    timestamp: now.toISOString(),
  });

  // If monitoring, handle auto-detection
  if (rfidState.monitoring && rfidState.monitorRace) {
    handleAutoZielDetection(epc);
  }

  res.json({ success: true, epc });
});

app.post("/api/rfid/start-monitoring", (req, res) => {
  const { raceName } = req.body;
  if (!raceName) {
    return res.status(400).json({ error: "Race name is required." });
  }
  rfidState.monitoring = true;
  rfidState.monitorRace = raceName;
  res.json({ success: true, monitoring: true, raceName });
});

app.post("/api/rfid/stop-monitoring", (req, res) => {
  rfidState.monitoring = false;
  rfidState.monitorRace = "";
  res.json({ success: true, monitoring: false });
});

// ============================================================
//  1. Tag Zuweisung API
// ============================================================

app.get("/api/tags", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.json([]);
  }
  try {
    const tagsFile = getTagsFile();
    if (!fs.existsSync(tagsFile)) return res.json([]);
    const content = fs.readFileSync(tagsFile, "utf8");
    const data = parseCSV(content, ["startnummer", "epc", "timestamp", "status"]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read tags configuration." });
  }
});

app.post("/api/tags", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  const { startnummer, epc, timestamp, status } = req.body;
  if (!startnummer || !epc) {
    return res.status(400).json({ error: "Startnummer and EPC are required." });
  }
  try {
    const tagsFile = getTagsFile();
    const line = `${escapeCSVField(startnummer)};${escapeCSVField(epc)};${escapeCSVField(timestamp || "")};${escapeCSVField(status || "Locked")}\r\n`;
    fs.appendFileSync(tagsFile, line, "utf8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save tag assignment." });
  }
});

// ============================================================
//  2. Anmeldung (Registrierung) API
// ============================================================

app.get("/api/registrations", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.json([]);
  }
  try {
    const regFile = getRegistrationsFile();
    if (!fs.existsSync(regFile)) return res.json([]);
    const content = fs.readFileSync(regFile, "utf8");
    const data = parseCSV(content, ["vorname", "name", "geburtsdatum", "startnummer", "wohnort", "gender", "club"]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read registrations file." });
  }
});

app.post("/api/registrations", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  const { vorname, name, geburtsdatum, startnummer, wohnort, gender, club } = req.body;
  if (!vorname || !name || !startnummer) {
    return res.status(400).json({ error: "Vorname, Name and Startnummer are required." });
  }
  try {
    const regFile = getRegistrationsFile();
    const line = `${escapeCSVField(vorname)};${escapeCSVField(name)};${escapeCSVField(geburtsdatum || "")};${escapeCSVField(startnummer)};${escapeCSVField(wohnort || "")};${escapeCSVField(gender || "M")};${club ? "true" : "false"}\r\n`;
    fs.appendFileSync(regFile, line, "utf8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save registration." });
  }
});

// ============================================================
//  3, 4, 5. Races API
// ============================================================

app.get("/api/races", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.json([]);
  }
  try {
    const racesDir = getRacesDir();
    if (!fs.existsSync(racesDir)) return res.json([]);
    const files = fs.readdirSync(racesDir);
    const races = files
      .filter((file) => file.endsWith(".csv"))
      .map((file) => file.replace(".csv", ""));
    res.json(races);
  } catch (err) {
    res.status(500).json({ error: "Failed to list races." });
  }
});

app.post("/api/races", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  const { name } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Race name is required." });
  }
  try {
    const sanitizedName = name.replace(/[\\\/:\*\?"<>\|]/g, "_").trim();
    const racesDir = getRacesDir();
    const filePath = path.join(racesDir, `${sanitizedName}.csv`);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, "\ufeffstartnummer;typ;timestamp;exactMs\r\n", "utf8");
    }
    res.json({ name: sanitizedName });
  } catch (err) {
    res.status(500).json({ error: "Failed to create race file." });
  }
});

app.get("/api/races/:raceName", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  const raceName = req.params.raceName;
  const racesDir = getRacesDir();
  const filePath = path.join(racesDir, `${raceName}.csv`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `Race '${raceName}' does not exist.` });
  }
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const data = parseCSV(content, ["startnummer", "typ", "timestamp", "exactMs"]);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to read race data." });
  }
});

// Append event to a race (START or ZIEL)
app.post("/api/races/:raceName/event", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  const raceName = req.params.raceName;
  const racesDir = getRacesDir();
  const filePath = path.join(racesDir, `${raceName}.csv`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Race file not found." });
  }
  const { startnummer, typ, timestamp, exactMs } = req.body;
  if (!startnummer || !typ) {
    return res.status(400).json({ error: "Startnummer and typ to be specified." });
  }

  // Duplicate check for ZIEL events
  if (typ === "ZIEL") {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const events = parseCSV(content, ["startnummer", "typ", "timestamp", "exactMs"]);
      const alreadyFinished = events.some(
        (e: any) => e.startnummer === String(startnummer) && e.typ === "ZIEL"
      );
      if (alreadyFinished) {
        return res.status(409).json({ error: `Startnummer ${startnummer} hat bereits eine Zielzeit in diesem Rennen.` });
      }
    } catch (e) {
      // Continue anyway
    }
  }

  try {
    const ms = exactMs || Date.now();
    const line = `${escapeCSVField(startnummer)};${escapeCSVField(typ)};${escapeCSVField(timestamp || "")};${ms}\r\n`;
    fs.appendFileSync(filePath, line, "utf8");
    res.json({ success: true, timestamp, exactMs: ms });
  } catch (err) {
    res.status(500).json({ error: "Failed to save race event." });
  }
});

app.post("/api/races/:raceName/events-bulk", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  const raceName = req.params.raceName;
  const racesDir = getRacesDir();
  const filePath = path.join(racesDir, `${raceName}.csv`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Race file not found." });
  }
  const { events } = req.body;
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: "Events array is required." });
  }
  try {
    const now = Date.now();
    let fileContent = "";
    events.forEach((evt) => {
      const ms = evt.exactMs || now;
      fileContent += `${escapeCSVField(evt.startnummer)};${escapeCSVField(evt.typ)};${escapeCSVField(evt.timestamp || "")};${ms}\r\n`;
    });
    fs.appendFileSync(filePath, fileContent, "utf8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk save race events." });
  }
});

// Reset data
app.post("/api/reset", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  try {
    const tagsFile = getTagsFile();
    const registrationsFile = getRegistrationsFile();
    const racesDir = getRacesDir();

    if (fs.existsSync(tagsFile)) fs.unlinkSync(tagsFile);
    if (fs.existsSync(registrationsFile)) fs.unlinkSync(registrationsFile);
    if (fs.existsSync(racesDir)) {
      const files = fs.readdirSync(racesDir);
      files.forEach((f) => {
        fs.unlinkSync(path.join(racesDir, f));
      });
    }
    // Seed new files
    initializeStorage(getDataDir());
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset data." });
  }
});

// Serve frontend with Vite configuration or statically
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    if (typeof process.send === "function") {
      process.send({ type: "ready" });
    }
  });

  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${PORT} is already in use. Assuming server is already running.`);
      if (typeof process.send === "function") {
        process.send({ type: "ready" });
      }
    } else {
      console.error("Server error:", err);
    }
  });
}

// Cleanup on exit
process.on("exit", () => {
  stopBridge();
});
process.on("SIGINT", () => {
  stopBridge();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopBridge();
  process.exit(0);
});

startServer();
