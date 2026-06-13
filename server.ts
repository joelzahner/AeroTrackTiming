import express from "express";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { createServer as createViteServer } from "vite";

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
function initializeStorage(dirPath: string) {
  const racesDir = path.join(dirPath, "races");
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  if (!fs.existsSync(racesDir)) {
    fs.mkdirSync(racesDir, { recursive: true });
  }

  const tagsFile = path.join(dirPath, "tags.csv");
  if (!fs.existsSync(tagsFile)) {
    fs.writeFileSync(tagsFile, "startnummer,epc,timestamp,status\n", "utf8");
    // Seed some initial tags for beautiful layout out of the box
    fs.appendFileSync(tagsFile, "104,E280 1160 6000 020B 1500 081C,14:32:01.442,Locked\n");
    fs.appendFileSync(tagsFile, "103,E280 1160 6000 020B 1500 081A,14:30:12.891,Locked\n");
    fs.appendFileSync(tagsFile, "102,E280 1160 6000 020B 1500 0819,14:28:45.102,Locked\n");
    fs.appendFileSync(tagsFile, "101,E280 1160 6000 020B 1500 0815,14:25:33.001,Invalid\n");
    fs.appendFileSync(tagsFile, "100,E280 1160 6000 020B 1500 0812,14:22:11.754,Locked\n");
    fs.appendFileSync(tagsFile, "099,E280 1160 6000 020B 1500 0810,14:20:05.222,Locked\n");
  }

  const registrationsFile = path.join(dirPath, "registrations.csv");
  if (!fs.existsSync(registrationsFile)) {
    fs.writeFileSync(registrationsFile, "vorname,name,geburtsdatum,startnummer,wohnort,gender,club\n", "utf8");
    // Seed initial registrations matching images
    fs.appendFileSync(registrationsFile, "Johannes,Weber,1985-04-12,101,Bern,M,true\n");
    fs.appendFileSync(registrationsFile, "Sarah,Müller,1992-08-23,102,Basel,W,false\n");
    fs.appendFileSync(registrationsFile, "Thomas,Keller,1988-11-02,103,Zürich,M,true\n");
    fs.appendFileSync(registrationsFile, "Elena,Baumann,1995-02-15,104,Luzern,W,true\n");
    fs.appendFileSync(registrationsFile, "Peter,Schmid,1979-07-30,105,Winterthur,M,false\n");
    fs.appendFileSync(registrationsFile, "Anna,Huber,2001-05-14,106,St. Gallen,W,false\n");
    fs.appendFileSync(registrationsFile, "Lukas,Frei,1990-10-08,107,Chur,M,true\n");
  }

  // Seed mock races if no files exist
  const defaultRaces = ["Ötztaler Radmarathon 2024 - Stage 1", "Zürcher Kantonalmeisterschaft_2023", "Alpen_Tour_Etappe_4"];
  defaultRaces.forEach((r) => {
    const file = path.join(racesDir, `${r}.csv`);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "startnummer,typ,timestamp,exactMs\n", "utf8");
      // Seed some starts and finishes for demonstration
      if (r === "Ötztaler Radmarathon 2024 - Stage 1") {
        fs.appendFileSync(file, "104,START,05:44:00.00,178124064000\n");
        fs.appendFileSync(file, "104,ZIEL,05:56:45.12,178124829120\n");
        fs.appendFileSync(file, "088,START,05:44:05.00,178124069000\n");
        fs.appendFileSync(file, "088,ZIEL,05:56:53.95,178124837950\n");
        fs.appendFileSync(file, "112,START,05:44:10.00,178124074000\n");
        fs.appendFileSync(file, "112,ZIEL,05:57:11.22,178124855220\n");
        fs.appendFileSync(file, "45,START,05:44:15.00,178124079000\n");
        fs.appendFileSync(file, "45,ZIEL,05:57:30.50,178124874500\n");
      } else {
        // General mock data
        fs.appendFileSync(file, "104,START,01:40:00.00,178124064000\n");
        fs.appendFileSync(file, "104,ZIEL,03:25:23.14,178124829140\n");
        fs.appendFileSync(file, "112,START,01:40:00.00,178124064000\n");
        fs.appendFileSync(file, "112,ZIEL,03:25:24.08,178124830085\n");
        fs.appendFileSync(file, "098,START,01:40:00.00,178124064000\n");
        fs.appendFileSync(file, "098,ZIEL,03:25:25.50,178124831500\n");
        fs.appendFileSync(file, "130,START,01:40:00.00,178124064000\n");
        fs.appendFileSync(file, "130,ZIEL,03:25:50.11,178124856112\n");
        fs.appendFileSync(file, "101,START,01:40:00.00,178124064000\n"); // DNF
      }
    }
  });
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
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

// Parsing CSV Helper
function parseCSV(content: string): any[] {
  const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const results: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rowRaw = lines[i];
    const values: string[] = [];
    let current = "";
    let insideQuotes = false;
    for (let charIndex = 0; charIndex < rowRaw.length; charIndex++) {
      const c = rowRaw[charIndex];
      if (c === '"') {
        insideQuotes = !insideQuotes;
      } else if (c === ',' && !insideQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    values.push(current.trim());

    if (values.length >= headers.length) {
      const parsedRow: any = {};
      headers.forEach((header, idx) => {
        parsedRow[header] = values[idx] || "";
      });
      results.push(parsedRow);
    }
  }
  return results;
}

// ---------------- API ENDPOINTS ----------------

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
  // Use PowerShell folder browser dialog on Windows (single-line semicolon separated to prevent syntax issues)
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

// 1. Tag Zuweisung API
app.get("/api/tags", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.json([]);
  }
  try {
    const tagsFile = getTagsFile();
    if (!fs.existsSync(tagsFile)) return res.json([]);
    const content = fs.readFileSync(tagsFile, "utf8");
    const data = parseCSV(content);
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
    const line = `${escapeCSVField(startnummer)},${escapeCSVField(epc)},${escapeCSVField(timestamp || "")},${escapeCSVField(status || "Locked")}\n`;
    fs.appendFileSync(tagsFile, line);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save tag assignment." });
  }
});

// 2. Anmeldung (Registrierung) API
app.get("/api/registrations", (req, res) => {
  if (!activeConfig.isConfigured) {
    return res.json([]);
  }
  try {
    const regFile = getRegistrationsFile();
    if (!fs.existsSync(regFile)) return res.json([]);
    const content = fs.readFileSync(regFile, "utf8");
    const data = parseCSV(content);
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
    const line = `${escapeCSVField(vorname)},${escapeCSVField(name)},${escapeCSVField(geburtsdatum || "")},${escapeCSVField(startnummer)},${escapeCSVField(wohnort || "")},${escapeCSVField(gender || "M")},${club ? "true" : "false"}\n`;
    fs.appendFileSync(regFile, line);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to save registration." });
  }
});

// 3, 4, 5. Rings for Races API
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
      fs.writeFileSync(filePath, "startnummer,typ,timestamp,exactMs\n", "utf8");
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
    const data = parseCSV(content);
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
  try {
    const ms = exactMs || Date.now();
    const line = `${escapeCSVField(startnummer)},${escapeCSVField(typ)},${escapeCSVField(timestamp || "")},${ms}\n`;
    fs.appendFileSync(filePath, line);
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
      fileContent += `${escapeCSVField(evt.startnummer)},${escapeCSVField(evt.typ)},${escapeCSVField(evt.timestamp || "")},${ms}\n`;
    });
    fs.appendFileSync(filePath, fileContent);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to bulk save race events." });
  }
});

// Reset simulation data
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

startServer();

