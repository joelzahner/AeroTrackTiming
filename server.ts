import express from "express";
import path from "path";
import fs from "fs";
import { exec, spawn, ChildProcess } from "child_process";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import ExcelJS from "exceljs";

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

function getTagsFile(): string {
  return path.join(getDataDir(), "tags.csv");
}

function getRegistrationsFile(): string {
  return path.join(getDataDir(), "registrations.csv");
}

function getRacesMetadataFile(): string {
  return path.join(getDataDir(), "races_metadata.json");
}

// Helper to parse "HH:MM:SS.hh" into milliseconds from the start of the day
function parseTimeToMs(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  if (parts.length < 3) return 0;
  const hrs = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  const secParts = parts[2].split(".");
  const secs = parseInt(secParts[0], 10) || 0;
  let ms = 0;
  if (secParts[1]) {
    const msStr = secParts[1].padEnd(3, "0").slice(0, 3);
    ms = parseInt(msStr, 10) || 0;
  }
  return ((hrs * 3600 + mins * 60 + secs) * 1000) + ms;
}

// Migrate old races folder to new race directories with separate start/finish CSVs
function migrateOldRaces(dirPath: string) {
  const oldRacesDir = path.join(dirPath, "races");
  if (!fs.existsSync(oldRacesDir)) return;

  try {
    const regFile = path.join(dirPath, "registrations.csv");
    let registrations: any[] = [];
    if (fs.existsSync(regFile)) {
      const regContent = fs.readFileSync(regFile, "utf8");
      registrations = parseCSV(regContent, ["vorname", "name", "geburtsdatum", "startnummer", "wohnort", "gender", "club"]);
    }

    const files = fs.readdirSync(oldRacesDir);
    for (const file of files) {
      if (file.endsWith(".csv")) {
        const raceName = file.replace(".csv", "");
        const sanitizedRaceName = raceName.replace(/[\\\/:\*\?"<>\|]/g, "_").trim();
        const oldFilePath = path.join(oldRacesDir, file);
        const newRaceDir = path.join(dirPath, sanitizedRaceName);

        // Read old race events
        const oldContent = fs.readFileSync(oldFilePath, "utf8");
        const oldEvents = parseCSV(oldContent, ["startnummer", "typ", "timestamp", "exactMs"]);

        // Create new directory
        if (!fs.existsSync(newRaceDir)) {
          fs.mkdirSync(newRaceDir, { recursive: true });
        }

        const startFile = path.join(newRaceDir, "startzeiten.csv");
        const finishFile = path.join(newRaceDir, "zielzeiten.csv");

        let startLines = "\ufeffstartnummer;vorname;nachname;jahrgang;startzeit;exactMs\r\n";
        let finishLines = "\ufeffstartnummer;vorname;nachname;jahrgang;zielzeit;exactMs\r\n";

        for (const evt of oldEvents) {
          const bib = evt.startnummer;
          if (!bib) continue;
          
          const athlete = registrations.find(r => String(r.startnummer) === String(bib));
          const vorname = athlete ? athlete.vorname : "";
          const nachname = athlete ? athlete.name : "";
          const jahrgang = athlete ? athlete.geburtsdatum : "";
          const timestamp = evt.timestamp || "";
          const exactMs = evt.exactMs || Date.now();

          const line = `${escapeCSVField(bib)};${escapeCSVField(vorname)};${escapeCSVField(nachname)};${escapeCSVField(jahrgang)};${escapeCSVField(timestamp)};${exactMs}\r\n`;

          if (evt.typ === "START") {
            startLines += line;
          } else if (evt.typ === "ZIEL") {
            finishLines += line;
          }
        }

        fs.writeFileSync(startFile, startLines, "utf8");
        fs.writeFileSync(finishFile, finishLines, "utf8");

        // Delete old file
        fs.unlinkSync(oldFilePath);
        console.log(`Migrated old race file ${file} to folder ${sanitizedRaceName}`);
      }
    }

    // Delete old races directory
    fs.rmdirSync(oldRacesDir);
    console.log("Successfully migrated all old races and removed 'races' directory");
  } catch (err) {
    console.error("Failed to migrate old races:", err);
  }
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
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const tagsFile = path.join(dirPath, "tags.csv");
  ensureBOMAndSep(tagsFile, "startnummer,epc,timestamp,status");

  const registrationsFile = path.join(dirPath, "registrations.csv");
  ensureBOMAndSep(registrationsFile, "vorname,name,geburtsdatum,startnummer,wohnort,gender,club");

  // Run migration of old races folder if present
  migrateOldRaces(dirPath);

  // Iterate over race directories to ensure BOM and structure of existing startzeiten.csv / zielzeiten.csv
  try {
    const items = fs.readdirSync(dirPath);
    items.forEach((item) => {
      const fullPath = path.join(dirPath, item);
      if (fs.statSync(fullPath).isDirectory() && !["node_modules", ".git", "races"].includes(item)) {
        const startFile = path.join(fullPath, "startzeiten.csv");
        const finishFile = path.join(fullPath, "zielzeiten.csv");
        if (fs.existsSync(startFile)) {
          ensureBOMAndSep(startFile, "startnummer,vorname,nachname,jahrgang,startzeit,exactMs");
        }
        if (fs.existsSync(finishFile)) {
          ensureBOMAndSep(finishFile, "startnummer,vorname,nachname,jahrgang,zielzeit,exactMs");
        }
      }
    });
  } catch (err) {
    console.error("Failed to migrate existing race directories:", err);
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
  const raceDir = path.join(getDataDir(), raceName);
  const filePath = path.join(raceDir, "zielzeiten.csv");
  
  if (!fs.existsSync(filePath)) return;

  // Duplicate check: only one ZIEL per bib per race
  const raceContent = fs.readFileSync(filePath, "utf8");
  const raceEvents = parseCSV(raceContent, ["startnummer", "vorname", "nachname", "jahrgang", "zielzeit", "exactMs"]);
  const alreadyFinished = raceEvents.some(
    (e: any) => String(e.startnummer) === String(bib)
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

  // Fetch registration details
  const regFile = getRegistrationsFile();
  let vorname = "";
  let name = "";
  let geburtsdatum = "";
  if (fs.existsSync(regFile)) {
    try {
      const regContent = fs.readFileSync(regFile, "utf8");
      const regs = parseCSV(regContent, ["vorname", "name", "geburtsdatum", "startnummer", "wohnort", "gender", "club"]);
      const athlete = regs.find((r: any) => String(r.startnummer) === String(bib));
      if (athlete) {
        vorname = athlete.vorname || "";
        name = athlete.name || "";
        geburtsdatum = athlete.geburtsdatum || "";
      }
    } catch (regErr) {
      console.error("Failed to read registrations for auto-detection:", regErr);
    }
  }

  const line = `${escapeCSVField(bib)};${escapeCSVField(vorname)};${escapeCSVField(name)};${escapeCSVField(geburtsdatum)};${escapeCSVField(timestamp)};${exactMs}\r\n`;
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
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) return res.json([]);
    const files = fs.readdirSync(dataDir);
    const races = files.filter((file) => {
      const fullPath = path.join(dataDir, file);
      // Only directories that aren't node_modules, .git, or races are race folders
      return fs.statSync(fullPath).isDirectory() && 
             !["node_modules", ".git", "races"].includes(file);
    });
    res.json(races);
  } catch (err) {
    res.status(500).json({ error: "Failed to list races." });
  }
});

// Race metadata endpoint to get distances
app.get("/api/races-metadata", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.json({});
  }
  try {
    const metadataFile = getRacesMetadataFile();
    if (!fs.existsSync(metadataFile)) {
      return res.json({});
    }
    const data = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
    res.json(data);
  } catch (err) {
    console.error("Failed to read races metadata:", err);
    res.status(500).json({ error: "Failed to read races metadata." });
  }
});

// Race metadata endpoint to update distance
app.post("/api/races/:raceName/metadata", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  const raceName = req.params.raceName;
  const { distance } = req.body;
  try {
    const metadataFile = getRacesMetadataFile();
    let data: Record<string, any> = {};
    if (fs.existsSync(metadataFile)) {
      try {
        data = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
      } catch (e) {
        console.error("Failed to parse races metadata json, resetting:", e);
      }
    }
    if (!data[raceName]) {
      data[raceName] = {};
    }
    data[raceName].distance = Number(distance) || 0;
    fs.writeFileSync(metadataFile, JSON.stringify(data, null, 2), "utf8");
    res.json({ success: true, metadata: data[raceName] });
  } catch (err) {
    console.error("Failed to save race metadata:", err);
    res.status(500).json({ error: "Failed to save race metadata." });
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
    const raceDir = path.join(getDataDir(), sanitizedName);
    if (!fs.existsSync(raceDir)) {
      fs.mkdirSync(raceDir, { recursive: true });
    }
    
    const startFile = path.join(raceDir, "startzeiten.csv");
    const finishFile = path.join(raceDir, "zielzeiten.csv");
    
    if (!fs.existsSync(startFile)) {
      fs.writeFileSync(startFile, "\ufeffstartnummer;vorname;nachname;jahrgang;startzeit;exactMs\r\n", "utf8");
    }
    if (!fs.existsSync(finishFile)) {
      fs.writeFileSync(finishFile, "\ufeffstartnummer;vorname;nachname;jahrgang;zielzeit;exactMs\r\n", "utf8");
    }
    
    res.json({ name: sanitizedName });
  } catch (err) {
    res.status(500).json({ error: "Failed to create race directory." });
  }
});

app.get("/api/races/:raceName", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }
  const raceName = req.params.raceName;
  const raceDir = path.join(getDataDir(), raceName);
  if (!fs.existsSync(raceDir)) {
    return res.status(404).json({ error: `Race '${raceName}' does not exist.` });
  }
  try {
    const startFile = path.join(raceDir, "startzeiten.csv");
    const finishFile = path.join(raceDir, "zielzeiten.csv");
    
    let events: any[] = [];
    
    if (fs.existsSync(startFile)) {
      const startContent = fs.readFileSync(startFile, "utf8");
      const startRows = parseCSV(startContent, ["startnummer", "vorname", "nachname", "jahrgang", "startzeit", "exactMs"]);
      startRows.forEach(row => {
        if (row.startnummer) {
          events.push({
            startnummer: String(row.startnummer),
            typ: "START",
            timestamp: row.startzeit || "",
            exactMs: Number(row.exactMs) || parseTimeToMs(row.startzeit)
          });
        }
      });
    }
    
    if (fs.existsSync(finishFile)) {
      const finishContent = fs.readFileSync(finishFile, "utf8");
      const finishRows = parseCSV(finishContent, ["startnummer", "vorname", "nachname", "jahrgang", "zielzeit", "exactMs"]);
      finishRows.forEach(row => {
        if (row.startnummer) {
          events.push({
            startnummer: String(row.startnummer),
            typ: "ZIEL",
            timestamp: row.zielzeit || "",
            exactMs: Number(row.exactMs) || parseTimeToMs(row.zielzeit)
          });
        }
      });
    }
    
    res.json(events);
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
  const raceDir = path.join(getDataDir(), raceName);
  if (!fs.existsSync(raceDir)) {
    return res.status(404).json({ error: "Race directory not found." });
  }
  const { startnummer, typ, timestamp, exactMs } = req.body;
  if (!startnummer || !typ) {
    return res.status(400).json({ error: "Startnummer and typ must be specified." });
  }

  const filename = typ === "START" ? "startzeiten.csv" : "zielzeiten.csv";
  const filePath = path.join(raceDir, filename);

  // Duplicate check for ZIEL events
  if (typ === "ZIEL") {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        const events = parseCSV(content, ["startnummer", "vorname", "nachname", "jahrgang", "zielzeit", "exactMs"]);
        const alreadyFinished = events.some(
          (e: any) => String(e.startnummer) === String(startnummer)
        );
        if (alreadyFinished) {
          return res.status(409).json({ error: `Startnummer ${startnummer} hat bereits eine Zielzeit in diesem Rennen.` });
        }
      }
    } catch (e) {
      // Continue anyway
    }
  }

  try {
    // Fetch registration details
    const regFile = getRegistrationsFile();
    let vorname = "";
    let name = "";
    let geburtsdatum = "";
    if (fs.existsSync(regFile)) {
      const regContent = fs.readFileSync(regFile, "utf8");
      const regs = parseCSV(regContent, ["vorname", "name", "geburtsdatum", "startnummer", "wohnort", "gender", "club"]);
      const athlete = regs.find((r: any) => String(r.startnummer) === String(startnummer));
      if (athlete) {
        vorname = athlete.vorname || "";
        name = athlete.name || "";
        geburtsdatum = athlete.geburtsdatum || "";
      }
    }

    const ms = exactMs || Date.now();
    const line = `${escapeCSVField(startnummer)};${escapeCSVField(vorname)};${escapeCSVField(name)};${escapeCSVField(geburtsdatum)};${escapeCSVField(timestamp || "")};${ms}\r\n`;
    
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
  const raceDir = path.join(getDataDir(), raceName);
  if (!fs.existsSync(raceDir)) {
    return res.status(404).json({ error: "Race directory not found." });
  }
  const { events } = req.body;
  if (!Array.isArray(events)) {
    return res.status(400).json({ error: "Events array is required." });
  }
  try {
    // Fetch registrations once for bulk lookup
    const regFile = getRegistrationsFile();
    let registrations: any[] = [];
    if (fs.existsSync(regFile)) {
      const regContent = fs.readFileSync(regFile, "utf8");
      registrations = parseCSV(regContent, ["vorname", "name", "geburtsdatum", "startnummer", "wohnort", "gender", "club"]);
    }

    const now = Date.now();
    let startLines = "";
    let finishLines = "";

    events.forEach((evt) => {
      const bib = evt.startnummer;
      const typ = evt.typ;
      if (!bib || !typ) return;

      const athlete = registrations.find((r: any) => String(r.startnummer) === String(bib));
      const vorname = athlete ? athlete.vorname : "";
      const name = athlete ? athlete.name : "";
      const geburtsdatum = athlete ? athlete.geburtsdatum : "";

      const ms = evt.exactMs || now;
      const timestamp = evt.timestamp || "";

      const line = `${escapeCSVField(bib)};${escapeCSVField(vorname)};${escapeCSVField(name)};${escapeCSVField(geburtsdatum)};${escapeCSVField(timestamp)};${ms}\r\n`;

      if (typ === "START") {
        startLines += line;
      } else {
        finishLines += line;
      }
    });

    if (startLines) {
      const startFile = path.join(raceDir, "startzeiten.csv");
      fs.appendFileSync(startFile, startLines, "utf8");
    }
    if (finishLines) {
      const finishFile = path.join(raceDir, "zielzeiten.csv");
      fs.appendFileSync(finishFile, finishLines, "utf8");
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk save race events." });
  }
});

// Helper function to format elapsed time
function formatElapsed(delta: number): string {
  if (delta === Infinity || isNaN(delta)) return "DNF";
  const diffMs = delta % 1000;
  const totalSecs = Math.floor(delta / 1000);
  const secs = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const mins = totalMins % 60;
  const hrs = Math.floor(totalMins / 60);

  const pad = (n: number) => String(n).padStart(2, '0');
  const msPad = (n: number) => String(Math.floor(n / 10)).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}.${msPad(diffMs)}`;
  } else {
    return `${pad(mins)}:${pad(secs)}.${msPad(diffMs)}`;
  }
}

// Helper function to format difference/gap
function formatDiff(diffMs: number): string {
  if (diffMs <= 0 || isNaN(diffMs)) return "-";
  const totalSecs = Math.floor(diffMs / 1000);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60);
  const ms = diffMs % 1000;
  const pad = (n: number) => String(n).padStart(2, '0');
  const msPad = (n: number) => String(Math.floor(n / 10)).padStart(2, '0');
  
  if (mins > 0) {
    return `+${mins}:${pad(secs)}.${msPad(ms)}`;
  } else {
    return `+${secs}.${msPad(ms)}`;
  }
}

// Helper function to format distance
function formatDistance(meters: number): string {
  if (!meters) return "-";
  if (meters < 10000) {
    return `${meters} m`;
  } else {
    const km = meters / 1000;
    return `${Number(km.toFixed(2))} km`;
  }
}

// Helper to get category gender with fallback for legacy categories
function getCategoryGender(cat: any): 'M' | 'W' | 'Alle' {
  if (cat && (cat.gender === 'M' || cat.gender === 'W' || cat.gender === 'Alle')) {
    return cat.gender;
  }
  // Guess from name
  const nameLower = (cat && cat.name || '').toLowerCase();
  if (
    nameLower.includes('frau') ||
    nameLower.includes('damen') ||
    nameLower.includes('mädchen') ||
    nameLower.includes('girl') ||
    nameLower.includes('women') ||
    nameLower.includes('woman') ||
    nameLower.includes('female') ||
    nameLower.includes('lady') ||
    nameLower.includes('ladies')
  ) {
    return 'W';
  }
  if (
    nameLower.includes('männer') ||
    nameLower.includes('maenner') ||
    nameLower.includes('herren') ||
    nameLower.includes('knaben') ||
    nameLower.includes('boy') ||
    nameLower.includes('men') ||
    nameLower.includes('man') ||
    nameLower.includes('male')
  ) {
    return 'M';
  }
  return 'Alle';
}

function applyCellStyles(destCell: any, srcStyle: any) {
  if (!srcStyle) return;
  if (srcStyle.font) destCell.font = srcStyle.font;
  if (srcStyle.fill) destCell.fill = srcStyle.fill;
  if (srcStyle.border) destCell.border = srcStyle.border;
  if (srcStyle.alignment) destCell.alignment = srcStyle.alignment;
  if (srcStyle.numFmt) destCell.numFmt = srcStyle.numFmt;
}

// Find template workbook path in development and production (packaged Electron)
const getTemplatePath = (): string => {
  const candidates = [
    path.join(__dirname, "Rangliste_Vorlage.xlsx"),
    path.join(__dirname, "..", "Rangliste_Vorlage.xlsx"),
    path.join(process.cwd(), "Rangliste_Vorlage.xlsx")
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0]; // fallback
};

// Excel Ranglisten Export
app.post("/api/races/export-excel", async (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.status(400).json({ error: "App not configured yet." });
  }

  const { selectedRaces, categories } = req.body;
  if (!Array.isArray(selectedRaces) || selectedRaces.length === 0) {
    return res.status(400).json({ error: "At least one race must be selected." });
  }

  const activeCategories = Array.isArray(categories) && categories.length > 0 
    ? categories 
    : [{ name: "Alle", minYear: 1900, maxYear: 2100, club: "Alle" }];

  try {
    // 1. Fetch Registrations
    const regFile = getRegistrationsFile();
    let registrations: any[] = [];
    if (fs.existsSync(regFile)) {
      const regContent = fs.readFileSync(regFile, "utf8");
      registrations = parseCSV(regContent, ["vorname", "name", "geburtsdatum", "startnummer", "wohnort", "gender", "club"]);
    }

    // 2. Fetch Distances metadata
    const metadataFile = getRacesMetadataFile();
    let raceDistances: Record<string, number> = {};
    if (fs.existsSync(metadataFile)) {
      try {
        const metData = JSON.parse(fs.readFileSync(metadataFile, "utf8"));
        Object.keys(metData).forEach(rName => {
          raceDistances[rName] = Number(metData[rName].distance) || 0;
        });
      } catch (e) {
        console.error("Failed to parse races metadata in export:", e);
      }
    }

    // 3. Process Standings for each Selected Race
    const raceStandings: Record<string, any[]> = {};
    const raceStandingsCategorized: Record<string, Record<string, any[]>> = {};

    selectedRaces.forEach(raceName => {
      const raceDir = path.join(getDataDir(), raceName);
      const startFile = path.join(raceDir, "startzeiten.csv");
      const finishFile = path.join(raceDir, "zielzeiten.csv");

      const events: any[] = [];
      if (fs.existsSync(startFile)) {
        const startContent = fs.readFileSync(startFile, "utf8");
        const startRows = parseCSV(startContent, ["startnummer", "vorname", "nachname", "jahrgang", "startzeit", "exactMs"]);
        startRows.forEach(row => {
          if (row.startnummer) {
            events.push({
              startnummer: String(row.startnummer),
              typ: "START",
              timestamp: row.startzeit || "",
              exactMs: Number(row.exactMs) || parseTimeToMs(row.startzeit)
            });
          }
        });
      }

      if (fs.existsSync(finishFile)) {
        const finishContent = fs.readFileSync(finishFile, "utf8");
        const finishRows = parseCSV(finishContent, ["startnummer", "vorname", "nachname", "jahrgang", "zielzeit", "exactMs"]);
        finishRows.forEach(row => {
          if (row.startnummer) {
            events.push({
              startnummer: String(row.startnummer),
              typ: "ZIEL",
              timestamp: row.zielzeit || "",
              exactMs: Number(row.exactMs) || parseTimeToMs(row.zielzeit)
            });
          }
        });
      }

      const bibs = Array.from(new Set(events.map(e => e.startnummer)));
      const list: any[] = [];

      bibs.forEach(bib => {
        const startEvt = events.filter(e => e.startnummer === bib && e.typ === 'START').sort((a,b) => Number(a.exactMs) - Number(b.exactMs))[0];
        const finishEvts = events.filter(e => e.startnummer === bib && e.typ === 'ZIEL').sort((a,b) => Number(a.exactMs) - Number(b.exactMs));
        const finishEvt = finishEvts[finishEvts.length - 1];

        const athlete = registrations.find(r => String(r.startnummer) === String(bib));
        
        const startMs = startEvt ? Number(startEvt.exactMs) : undefined;
        const finishMs = finishEvt ? Number(finishEvt.exactMs) : undefined;
        const elapsedMs = (startMs && finishMs) ? (finishMs - startMs) : Infinity;

        list.push({
          startnummer: bib,
          name: athlete ? athlete.name : 'Gastschreiber',
          vorname: athlete ? athlete.vorname : `#${bib}`,
          gender: athlete ? athlete.gender : 'M',
          geburtsdatum: athlete ? String(athlete.geburtsdatum) : '1990',
          wohnort: athlete ? athlete.wohnort : 'Extern',
          club: athlete ? athlete.club : false,
          elapsedMs,
          elapsedLabel: elapsedMs === Infinity ? "DNF" : formatElapsed(elapsedMs)
        });
      });

      raceStandings[raceName] = list;
      raceStandingsCategorized[raceName] = {};

      // Categorize and Rank
      activeCategories.forEach(cat => {
        const filtered = list.filter(runner => {
          const birthYear = parseInt(runner.geburtsdatum.split('-')[0]) || 1990;
          if (birthYear < cat.minYear || birthYear > cat.maxYear) return false;
          
          if (cat.club === "Ja" && !runner.club) return false;
          if (cat.club === "Nein" && runner.club) return false;
          
          const catGender = getCategoryGender(cat);
          if (catGender !== "Alle" && runner.gender !== catGender) return false;

          return true;
        });

        const finishers = filtered.filter(r => r.elapsedMs !== Infinity).sort((a, b) => a.elapsedMs - b.elapsedMs);
        const dnfs = filtered.filter(r => r.elapsedMs === Infinity);

        const distance = raceDistances[raceName] || 0;

        finishers.forEach((runner, idx) => {
          runner.pos = idx + 1;
          runner.diffLabel = idx === 0 ? "-" : formatDiff(runner.elapsedMs - finishers[0].elapsedMs);
          runner.speed = distance > 0 ? ((distance * 3600) / runner.elapsedMs).toFixed(2) : "-";
        });

        dnfs.forEach(runner => {
          runner.pos = undefined;
          runner.diffLabel = "-";
          runner.speed = "-";
        });

        raceStandingsCategorized[raceName][cat.name] = [...finishers, ...dnfs];
      });
    });

    // 4. Process Gesamtwertung (Overall Ranking)
    // Gather all bib numbers present in selected races or registrations
    const bibsInSelectedRaces = new Set<string>();
    selectedRaces.forEach(rName => {
      raceStandings[rName].forEach(s => bibsInSelectedRaces.add(s.startnummer));
    });
    registrations.forEach(r => bibsInSelectedRaces.add(String(r.startnummer)));
    
    const overallList: any[] = [];
    bibsInSelectedRaces.forEach(bib => {
      const athlete = registrations.find(r => String(r.startnummer) === String(bib));
      
      let totalMs = 0;
      let dnfAny = false;
      const raceTimes = selectedRaces.map(rName => {
        const raceStanding = raceStandings[rName].find(s => String(s.startnummer) === String(bib));
        const ms = raceStanding ? raceStanding.elapsedMs : Infinity;
        if (ms === Infinity) dnfAny = true;
        return {
          raceName: rName,
          elapsedMs: ms,
          elapsedLabel: ms === Infinity ? "DNF" : formatElapsed(ms)
        };
      });

      if (dnfAny) {
        totalMs = Infinity;
      } else {
        totalMs = raceTimes.reduce((sum, rt) => sum + rt.elapsedMs, 0);
      }

      overallList.push({
        startnummer: bib,
        name: athlete ? athlete.name : 'Gastschreiber',
        vorname: athlete ? athlete.vorname : `#${bib}`,
        gender: athlete ? athlete.gender : 'M',
        geburtsdatum: athlete ? String(athlete.geburtsdatum) : '1990',
        wohnort: athlete ? athlete.wohnort : 'Extern',
        club: athlete ? athlete.club : false,
        raceTimes,
        totalMs,
        totalLabel: totalMs === Infinity ? "DNF" : formatElapsed(totalMs)
      });
    });

    const overallStandingsCategorized: Record<string, any[]> = {};
    activeCategories.forEach(cat => {
      const filtered = overallList.filter(runner => {
        const birthYear = parseInt(runner.geburtsdatum.split('-')[0]) || 1990;
        if (birthYear < cat.minYear || birthYear > cat.maxYear) return false;

        if (cat.club === "Ja" && !runner.club) return false;
        if (cat.club === "Nein" && runner.club) return false;
        
        const catGender = getCategoryGender(cat);
        if (catGender !== "Alle" && runner.gender !== catGender) return false;

        return true;
      });

      const finishers = filtered.filter(r => r.totalMs !== Infinity).sort((a, b) => a.totalMs - b.totalMs);
      const dnfs = filtered.filter(r => r.totalMs === Infinity);

      finishers.forEach((runner, idx) => {
        runner.pos = idx + 1;
        runner.diffLabel = idx === 0 ? "-" : formatDiff(runner.totalMs - finishers[0].totalMs);
      });

      dnfs.forEach(runner => {
        runner.pos = undefined;
        runner.diffLabel = "-";
      });

      overallStandingsCategorized[cat.name] = [...finishers, ...dnfs];
    });

    // 5. Open Excel Template and Extract Styles
    const templatePath = getTemplatePath();
    if (!fs.existsSync(templatePath)) {
      return res.status(500).json({ error: `Excel-Vorlage '${templatePath}' nicht gefunden.` });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    // Extract style elements from template sheets
    const r1Sheet = workbook.getWorksheet("Rennen 1");
    if (!r1Sheet) {
      return res.status(500).json({ error: "Vorlage-Sheet 'Rennen 1' fehlt." });
    }

    const templateCatTitleCell = r1Sheet.getCell("A1");
    const catTitleStyle = {
      font: templateCatTitleCell.font,
      fill: templateCatTitleCell.fill,
      border: templateCatTitleCell.border,
      alignment: templateCatTitleCell.alignment
    };

    const headerStyles: any[] = [];
    for (let col = 1; col <= 8; col++) {
      const cell = r1Sheet.getCell(2, col);
      headerStyles.push({
        font: cell.font,
        fill: cell.fill,
        border: cell.border,
        alignment: cell.alignment
      });
    }

    const dataStyles: any[] = [];
    for (let col = 1; col <= 8; col++) {
      const cell = r1Sheet.getCell(3, col);
      dataStyles.push({
        font: cell.font,
        fill: cell.fill,
        border: cell.border,
        alignment: cell.alignment
      });
    }

    const r1ColWidths: number[] = [];
    for (let col = 1; col <= 8; col++) {
      r1ColWidths.push(r1Sheet.getColumn(col).width || 13);
    }

    // Extract styles from template Gesamtwertung sheet
    const gwSheet = workbook.getWorksheet("Gesamtwertung");
    if (!gwSheet) {
      return res.status(500).json({ error: "Vorlage-Sheet 'Gesamtwertung' fehlt." });
    }

    const templateGwCatTitleCell = gwSheet.getCell("A1");
    const gwCatTitleStyle = {
      font: templateGwCatTitleCell.font,
      fill: templateGwCatTitleCell.fill,
      border: templateGwCatTitleCell.border,
      alignment: templateGwCatTitleCell.alignment
    };

    const gwHeaderStyles: any[] = [];
    for (let col = 1; col <= 8; col++) {
      const cell = gwSheet.getCell(2, col);
      gwHeaderStyles.push({
        font: cell.font,
        fill: cell.fill,
        border: cell.border,
        alignment: cell.alignment
      });
    }

    const gwDataStyles: any[] = [];
    for (let col = 1; col <= 8; col++) {
      const cell = gwSheet.getCell(3, col);
      gwDataStyles.push({
        font: cell.font,
        fill: cell.fill,
        border: cell.border,
        alignment: cell.alignment
      });
    }

    const gwColWidths: number[] = [];
    for (let col = 1; col <= 8; col++) {
      gwColWidths.push(gwSheet.getColumn(col).width || 13);
    }

    // 6. Generate New Sheets for Selected Races
    selectedRaces.forEach(raceName => {
      let safeName = raceName.replace(/[\\\/:\*\?\[\]]/g, "_");
      if (safeName.length > 31) safeName = safeName.slice(0, 31);
      
      let nameCount = 1;
      let finalName = safeName;
      while (workbook.getWorksheet(finalName)) {
        finalName = `${safeName.slice(0, 27)}_${nameCount++}`;
      }

      const ws = workbook.addWorksheet(finalName);
      ws.columns = r1ColWidths.map((w, idx) => ({
        key: `col_${idx + 1}`,
        width: w
      }));

      let currentRow = 1;

      activeCategories.forEach((cat) => {
        // Merge category title row (A to G for first row to leave H for distance, otherwise A to H)
        if (currentRow === 1) {
          ws.mergeCells(1, 1, 1, 7);
          const titleCell = ws.getCell(1, 1);
          titleCell.value = cat.name;

          const distanceCell = ws.getCell(1, 8);
          const distMeters = raceDistances[raceName] || 0;
          distanceCell.value = distMeters > 0 ? `Distanz: ${formatDistance(distMeters)}` : "Distanz: -";

          // Apply styling to columns 1-7
          for (let col = 1; col <= 7; col++) {
            applyCellStyles(ws.getCell(1, col), catTitleStyle);
          }
          // Apply styling and right alignment to distance cell
          applyCellStyles(distanceCell, catTitleStyle);
          distanceCell.alignment = { horizontal: "right", vertical: "middle" };
        } else {
          ws.mergeCells(currentRow, 1, currentRow, 8);
          const titleCell = ws.getCell(currentRow, 1);
          titleCell.value = cat.name;

          for (let col = 1; col <= 8; col++) {
            applyCellStyles(ws.getCell(currentRow, col), catTitleStyle);
          }
        }
        ws.getRow(currentRow).height = 15.75;
        currentRow++;

        const headers = ['Rang', 'Vorname', 'Nachname', 'Jahrgang', 'Wohnort', 'Rennzeit', 'Rückstand', '⌀km/h'];
        headers.forEach((h, colIdx) => {
          const cell = ws.getCell(currentRow, colIdx + 1);
          cell.value = h;
          applyCellStyles(cell, headerStyles[colIdx] || headerStyles[0]);
        });
        ws.getRow(currentRow).height = 16.5;
        currentRow++;

        const catRunners = raceStandingsCategorized[raceName][cat.name] || [];
        if (catRunners.length === 0) {
          const cell = ws.getCell(currentRow, 1);
          cell.value = "Keine Einträge";
          cell.font = { name: "Calibri", size: 11, italic: true };
          ws.getRow(currentRow).height = 15.75;
          currentRow++;
        } else {
          catRunners.forEach(runner => {
            const rowData = [
              runner.pos || "-",
              runner.vorname,
              runner.name,
              runner.geburtsdatum,
              runner.wohnort,
              runner.elapsedLabel,
              runner.diffLabel,
              runner.speed === "-" ? "-" : Number(runner.speed)
            ];

            rowData.forEach((val, colIdx) => {
              const cell = ws.getCell(currentRow, colIdx + 1);
              cell.value = val;
              applyCellStyles(cell, dataStyles[colIdx] || dataStyles[0]);
            });
            ws.getRow(currentRow).height = 15.75;
            currentRow++;
          });
        }
        ws.getRow(currentRow).height = 15.75;
        currentRow++; // Spacer row
      });
    });

    // 7. Generate Gesamtwertung sheet
    const wsGw = workbook.addWorksheet("Gesamtwertung_Neu");
    const columnsDef = [
      { width: gwColWidths[0] }, // Rang
      { width: gwColWidths[1] }, // Vorname
      { width: gwColWidths[2] }, // Nachname
      { width: gwColWidths[3] }, // Jahrgang
      { width: gwColWidths[4] }  // Wohnort
    ];
    selectedRaces.forEach(() => {
      columnsDef.push({ width: gwColWidths[5] }); // Zeit [Race Name]
    });
    columnsDef.push({ width: gwColWidths[6] }); // Gesamtzeit
    columnsDef.push({ width: gwColWidths[7] }); // Rückstand
    wsGw.columns = columnsDef;

    let gwCurrentRow = 1;

    activeCategories.forEach((cat) => {
      const totalCols = 5 + selectedRaces.length + 2;
      wsGw.mergeCells(gwCurrentRow, 1, gwCurrentRow, totalCols);
      
      const titleCell = wsGw.getCell(gwCurrentRow, 1);
      titleCell.value = cat.name;

      for (let col = 1; col <= totalCols; col++) {
        applyCellStyles(wsGw.getCell(gwCurrentRow, col), gwCatTitleStyle);
      }
      wsGw.getRow(gwCurrentRow).height = 15.75;
      gwCurrentRow++;

      const headers = ['Rang', 'Vorname', 'Nachname', 'Jahrgang', 'Wohnort'];
      selectedRaces.forEach(r => headers.push(`Zeit ${r}`));
      headers.push('Gesamtzeit', 'Rückstand');

      headers.forEach((h, colIdx) => {
        const cell = wsGw.getCell(gwCurrentRow, colIdx + 1);
        cell.value = h;
        
        let styleTemplate;
        if (colIdx < 5) {
          styleTemplate = gwHeaderStyles[colIdx];
        } else if (colIdx < 5 + selectedRaces.length) {
          styleTemplate = gwHeaderStyles[5]; // Zeit Rennen 1 style
        } else if (colIdx === 5 + selectedRaces.length) {
          styleTemplate = gwHeaderStyles[6]; // Gesamtzeit style
        } else {
          styleTemplate = gwHeaderStyles[7]; // Rückstand style
        }
        applyCellStyles(cell, styleTemplate || gwHeaderStyles[0]);
      });
      wsGw.getRow(gwCurrentRow).height = 16.5;
      gwCurrentRow++;

      const catRunners = overallStandingsCategorized[cat.name] || [];
      if (catRunners.length === 0) {
        const cell = wsGw.getCell(gwCurrentRow, 1);
        cell.value = "Keine Einträge";
        cell.font = { name: "Calibri", size: 11, italic: true };
        wsGw.getRow(gwCurrentRow).height = 15.75;
        gwCurrentRow++;
      } else {
        catRunners.forEach(runner => {
          const rowData = [
            runner.pos || "-",
            runner.vorname,
            runner.name,
            runner.geburtsdatum,
            runner.wohnort
          ];
          runner.raceTimes.forEach(rt => {
            rowData.push(rt.elapsedLabel);
          });
          rowData.push(runner.totalLabel);
          rowData.push(runner.diffLabel);

          rowData.forEach((val, colIdx) => {
            const cell = wsGw.getCell(gwCurrentRow, colIdx + 1);
            cell.value = val;
            
            let styleTemplate;
            if (colIdx < 5) {
              styleTemplate = gwDataStyles[colIdx];
            } else if (colIdx < 5 + selectedRaces.length) {
              styleTemplate = gwDataStyles[5];
            } else if (colIdx === 5 + selectedRaces.length) {
              styleTemplate = gwDataStyles[6];
            } else {
              styleTemplate = gwDataStyles[7];
            }
            applyCellStyles(cell, styleTemplate || gwDataStyles[0]);
          });
          wsGw.getRow(gwCurrentRow).height = 15.75;
          gwCurrentRow++;
        });
      }
      wsGw.getRow(gwCurrentRow).height = 15.75;
      gwCurrentRow++; // Spacer row
    });

    // 8. Delete Original Template Sheets
    const originalSheets = ["Rennen 1", "Rennen 2", "Gesamtwertung"];
    originalSheets.forEach(sName => {
      const sheet = workbook.getWorksheet(sName);
      if (sheet) {
        workbook.removeWorksheet(sName);
      }
    });

    // Rename Gesamtwertung_Neu to Gesamtwertung
    const finalGwSheet = workbook.getWorksheet("Gesamtwertung_Neu");
    if (finalGwSheet) {
      finalGwSheet.name = "Gesamtwertung";
    }

    // 9. Send Excel File to Client
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=rangliste_export.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (err: any) {
    console.error("Excel generation failed:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: `Fehler beim Erstellen der Excel-Datei: ${err.message}` });
    }
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
    const dataDir = getDataDir();

    if (fs.existsSync(tagsFile)) fs.unlinkSync(tagsFile);
    if (fs.existsSync(registrationsFile)) fs.unlinkSync(registrationsFile);
    
    if (fs.existsSync(dataDir)) {
      const items = fs.readdirSync(dataDir);
      items.forEach((item) => {
        const fullPath = path.join(dataDir, item);
        if (fs.statSync(fullPath).isDirectory()) {
          if (![".git", "node_modules"].includes(item)) {
            fs.rmSync(fullPath, { recursive: true, force: true });
          }
        }
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
