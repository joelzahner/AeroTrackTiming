import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TagZuweisung from './components/TagZuweisung';
import Anmeldung from './components/Anmeldung';
import StartZeitfahren from './components/StartZeitfahren';
import Massenstart from './components/Massenstart';
import Ziel from './components/Ziel';
import Rangliste from './components/Rangliste';
import { Registration, TagAssignment, RaceEvent } from './types';

// Helper to format 1/100s precise timestamps
function formatExactTimestamp(date: Date): string {
  const hrs = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  const secs = String(date.getSeconds()).padStart(2, '0');
  const ms = String(Math.floor(date.getMilliseconds() / 10)).padStart(2, '0');
  return `${hrs}:${mins}:${secs}.${ms}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('tag');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Storage Settings States
  const [settings, setSettings] = useState<{ csvStoragePath: string; isConfigured: boolean }>({
    csvStoragePath: '',
    isConfigured: true, // Default to true to prevent flickering before settings check completes
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [settingsChecked, setSettingsChecked] = useState(false);

  // Core telemetry States
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tagAssignments, setTagAssignments] = useState<TagAssignment[]>([]);
  const [races, setRaces] = useState<string[]>([]);
  const [activeRace, setActiveRace] = useState<string>('Ötztaler Radmarathon 2024 - Stage 1');
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);

  // Telemetry tag parsing simulation state
  const [activeEpc, setActiveEpc] = useState<string>('');

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('sidebar_width');
    return saved ? Number(saved) : 260;
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar_width', String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ---------------- FETCH SETTINGS ----------------

  const fetchSettings = async (): Promise<{ csvStoragePath: string; isConfigured: boolean } | null> => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSettingsChecked(true);
        return data;
      }
    } catch (err) {
      console.warn('API error fetching settings:', err);
    }
    return null;
  };

  const handleSaveSettings = async (pathStr: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvStoragePath: pathStr }),
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ csvStoragePath: data.csvStoragePath, isConfigured: true });
        // Fetch new data from the new directory
        fetchRegistrations();
        fetchTagAssignments();
        fetchRaces();
        setShowConfigModal(false);
        return true;
      } else {
        const errData = await res.json();
        alert(errData.error || 'Fehler beim Speichern des Ordners.');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Speichern fehlgeschlagen.');
    }
    return false;
  };

  const handleSelectDirectory = async (setCurrentInput: (p: string) => void) => {
    try {
      const res = await fetch('/api/settings/select-directory', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.path && !data.cancelled) {
          setCurrentInput(data.path);
        }
      }
    } catch (err) {
      console.error('Failed to select directory:', err);
    }
  };

  // ---------------- FETCH OPERATIONS ----------------

  const fetchRegistrations = async () => {
    try {
      const res = await fetch('/api/registrations');
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data);
      }
    } catch (err) {
      console.warn('API error fetching registrations:', err);
    }
  };

  const fetchTagAssignments = async () => {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const data = await res.json();
        setTagAssignments(data);
      }
    } catch (err) {
      console.warn('API error fetching tags:', err);
    }
  };

  const fetchRaces = async () => {
    try {
      const res = await fetch('/api/races');
      if (res.ok) {
        const data = await res.json();
        setRaces(data);
      }
    } catch (err) {
      console.warn('API error fetching races:', err);
    }
  };

  const fetchRaceEvents = async (raceName: string) => {
    if (!raceName) return;
    try {
      const res = await fetch(`/api/races/${encodeURIComponent(raceName)}`);
      if (res.ok) {
        const data = await res.json();
        setRaceEvents(data);
      }
    } catch (err) {
      console.warn(`API error fetching race events for '${raceName}':`, err);
    }
  };

  // ---------------- WRITE INTERACTIONS ----------------

  const handleAddRegistration = async (reg: Registration) => {
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reg),
      });
      if (res.ok) {
        fetchRegistrations();
      }
    } catch (err) {
      console.error('Failed to add registration:', err);
    }
  };

  const handleAddTagAssignment = async (startnummer: string, epc: string) => {
    const timestamp = formatExactTimestamp(new Date());
    const row = { startnummer, epc, timestamp, status: 'Locked' };
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      if (res.ok) {
        fetchTagAssignments();
      }
    } catch (err) {
      console.error('Failed to add tag assignment:', err);
    }
  };

  const handleRaceCreate = async (name: string) => {
    try {
      const res = await fetch('/api/races', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveRace(data.name);
        fetchRaces();
      }
    } catch (err) {
      console.error('Failed to create race:', err);
    }
  };

  const handleAddRaceEvent = async (bib: string, typ: 'START' | 'ZIEL') => {
    const timestamp = formatExactTimestamp(new Date());
    const exactMs = Date.now();
    try {
      const res = await fetch(`/api/races/${encodeURIComponent(activeRace)}/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startnummer: bib, typ, timestamp, exactMs }),
      });
      if (res.ok) {
        fetchRaceEvents(activeRace);
      }
    } catch (err) {
      console.error('Failed to add race event:', err);
    }
  };

  const handleAddRaceEventsBulk = async (bibs: string[], typ: 'START' | 'ZIEL') => {
    const timestamp = formatExactTimestamp(new Date());
    const exactMs = Date.now();
    const events = bibs.map((bib) => ({ startnummer: bib, typ, timestamp, exactMs }));
    try {
      const res = await fetch(`/api/races/${encodeURIComponent(activeRace)}/events-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
      if (res.ok) {
        fetchRaceEvents(activeRace);
      }
    } catch (err) {
      console.error('Failed to dispatch mass start bulk events:', err);
    }
  };

  const handleResetData = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        fetchRegistrations();
        fetchTagAssignments();
        fetchRaces();
        setRaceEvents([]);
        setActiveRace('Ötztaler Radmarathon 2024 - Stage 1');
        alert("Zeitmessungsdaten wurden auf Werkseinstellungen zurückgesetzt!");
      }
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  // Sync state on load
  useEffect(() => {
    const init = async () => {
      const currentSettings = await fetchSettings();
      if (currentSettings && currentSettings.isConfigured) {
        fetchRegistrations();
        fetchTagAssignments();
        fetchRaces();
      }
    };
    init();
  }, []);

  // Update event list on switching races
  useEffect(() => {
    if (activeRace && settings.isConfigured) {
      fetchRaceEvents(activeRace);
    }
  }, [activeRace, settings.isConfigured]);

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'tag':
        return (
          <TagZuweisung
            onScanSimulate={(epc) => setActiveEpc(epc)}
            activeEpc={activeEpc}
            setActiveEpc={setActiveEpc}
            assignments={tagAssignments}
            onRefresh={fetchTagAssignments}
            onAddAssignment={handleAddTagAssignment}
          />
        );
      case 'anmeldung':
        return (
          <Anmeldung
            registrations={registrations}
            onAddRegistration={handleAddRegistration}
            onRefresh={fetchRegistrations}
          />
        );
      case 'start':
        return (
          <StartZeitfahren
            races={races}
            registrations={registrations}
            activeRace={activeRace}
            setActiveRace={setActiveRace}
            onRaceCreate={handleRaceCreate}
            onAddRaceEvent={handleAddRaceEvent}
            raceEvents={raceEvents}
            onRefreshRaces={fetchRaces}
          />
        );
      case 'massenstart':
        return (
          <Massenstart
            races={races}
            registrations={registrations}
            activeRace={activeRace}
            setActiveRace={setActiveRace}
            onRaceCreate={handleRaceCreate}
            onAddRaceEventsBulk={handleAddRaceEventsBulk}
          />
        );
      case 'ziel':
        return (
          <Ziel
            races={races}
            registrations={registrations}
            tagAssignments={tagAssignments}
            activeRace={activeRace}
            setActiveRace={setActiveRace}
            onRaceCreate={handleRaceCreate}
            onAddRaceEvent={handleAddRaceEvent}
            raceEvents={raceEvents}
            onRefresh={() => fetchRaceEvents(activeRace)}
          />
        );
      case 'rangliste':
        return (
          <Rangliste
            races={races}
            registrations={registrations}
            activeRace={activeRace}
            setActiveRace={setActiveRace}
            raceEvents={raceEvents}
          />
        );
      default:
        return (
          <div className="p-8 text-center font-mono text-xs">
            Unbekannter Bildschirm ausgewählt.
          </div>
        );
    }
  };

  // Render Ersteinrichtung (Setup Overlay) if not configured yet
  if (settingsChecked && !settings.isConfigured) {
    return (
      <SetupOverlay
        defaultPath={settings.csvStoragePath}
        onSave={handleSaveSettings}
        onSelectDir={handleSelectDirectory}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1b1b1b] font-sans">
      
      {/* Offside core desktop sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleResetData}
        width={sidebarWidth}
        setWidth={setSidebarWidth}
        csvStoragePath={settings.csvStoragePath}
        onChangeStoragePath={() => setShowConfigModal(true)}
      />

      {/* Responsive mobile header block */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-[#e2e2e2] z-50 sticky top-0 shrink-0">
        <div>
          <h1 className="font-sans text-lg font-black text-black leading-none">AeroTrack</h1>
          <span className="font-mono text-[9px] text-gray-500 uppercase tracking-widest leading-none">RFID Engine</span>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-1.5 border border-[#cfc4c5] bg-gray-50 rounded font-mono text-[10px] text-black"
          >
            ORDNER ⚙
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1 px-2 border border-[#cfc4c5] bg-gray-50 rounded text-xs px-2.5 py-1.5 font-mono font-bold text-black"
          >
            {mobileMenuOpen ? 'SCHLIESSEN ✕' : 'MENÜ ☰'}
          </button>
        </div>
      </header>

      {/* Mobile drawer drop menu */}
      {mobileMenuOpen && (
        <nav className="md:hidden bg-white border-b border-[#cfc4c5] p-4 flex flex-col space-y-1.5 z-40 relative">
          {[
            { id: 'tag', label: '1. Tag Zuweisung', icon: 'sell' },
            { id: 'anmeldung', label: '2. Anmeldung', icon: 'person_add' },
            { id: 'start', label: '3. Start Zeitfahren', icon: 'timer' },
            { id: 'massenstart', label: '4. Massenstart', icon: 'group' },
            { id: 'ziel', label: '5. Ziel', icon: 'flag' },
            { id: 'rangliste', label: '6. Rangliste', icon: 'leaderboard' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`flex items-center space-x-3 px-4 py-3 rounded text-left transition-all ${
                activeTab === item.id ? 'bg-[#e2e2e2] text-black font-bold' : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-sans text-xs font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>
      )}

      {/* Primary viewport content viewport */}
      <main
        style={{ paddingLeft: isMobile ? undefined : `${sidebarWidth + 32}px` }}
        className="min-h-screen flex flex-col p-6 md:p-12 transition-all duration-75"
      >
        <div className="flex-1 flex flex-col w-full">
          {renderActiveScreen()}
        </div>
      </main>

      {/* Dynamic storage location change settings modal */}
      <ConfigModal
        isOpen={showConfigModal}
        currentPath={settings.csvStoragePath}
        onClose={() => setShowConfigModal(false)}
        onSave={handleSaveSettings}
        onSelectDir={handleSelectDirectory}
      />

    </div>
  );
}

// ---------------- SUB-COMPONENTS FOR SETTINGS ----------------

interface SetupOverlayProps {
  defaultPath: string;
  onSave: (p: string) => Promise<boolean>;
  onSelectDir: (cb: (p: string) => void) => Promise<void>;
}

function SetupOverlay({ defaultPath, onSave, onSelectDir }: SetupOverlayProps) {
  const [pathInput, setPathInput] = useState(defaultPath);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathInput.trim()) {
      alert('Bitte geben Sie einen gültigen Pfad an.');
      return;
    }
    setLoading(true);
    await onSave(pathInput);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f3f3] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neutral-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neutral-300/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="bg-white border border-[#cfc4c5] p-8 md:p-12 rounded-lg max-w-xl w-full shadow-2xl relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[32px] text-black">sensors</span>
            <h1 className="font-sans text-3xl font-black text-black tracking-tight">AeroTrack</h1>
          </div>
          <span className="font-mono text-[10px] text-[#585f6c] uppercase tracking-widest block mb-6 border-b border-[#e2e2e2] pb-4">
            UHF RFID Zeiterfassungssystem
          </span>
          <h2 className="font-sans text-xl font-bold text-black mb-3">Ersteinrichtung: Speicherort festlegen</h2>
          <p className="font-sans text-sm text-[#585f6c] leading-relaxed">
            Bitte wählen Sie aus, in welchem Ordner die CSV-Dateien für Ihre Zeitmessungen, Transponder-Zuweisungen und Anmeldungen gespeichert werden sollen. 
            Dieser Ordner wird auch offline auf Ihrem Desktop-System verwendet.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs text-[#585f6c] uppercase tracking-wider block" htmlFor="setup-path">
              CSV-Speicherordner
            </label>
            <div className="flex gap-2">
              <input
                id="setup-path"
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                placeholder="C:\Pfad\zum\Ordner"
                className="flex-1 bg-[#f9f9f9] border border-[#cfc4c5] p-3 font-mono text-xs rounded text-black focus:outline-none focus:border-black focus:ring-0"
              />
              <button
                type="button"
                onClick={() => onSelectDir(setPathInput)}
                className="bg-neutral-100 hover:bg-neutral-200 border border-[#cfc4c5] text-black px-4 py-3 font-mono text-xs rounded transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">folder_open</span>
                Durchsuchen
              </button>
            </div>
            <p className="font-sans text-[11px] text-[#585f6c]">
              Hinweis: Falls der Ordner noch nicht existiert, wird er automatisch erstellt und mit Standarddateien initialisiert.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white hover:bg-neutral-800 py-4 font-mono text-sm leading-6 transition-colors border border-black rounded flex justify-center items-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>Initialisiere...</span>
            ) : (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                Speichern &amp; App starten
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

interface ConfigModalProps {
  currentPath: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (p: string) => Promise<boolean>;
  onSelectDir: (cb: (p: string) => void) => Promise<void>;
}

function ConfigModal({ currentPath, isOpen, onClose, onSave, onSelectDir }: ConfigModalProps) {
  const [pathInput, setPathInput] = useState(currentPath);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPathInput(currentPath);
    }
  }, [isOpen, currentPath]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathInput.trim()) {
      alert('Bitte geben Sie einen gültigen Pfad an.');
      return;
    }
    setLoading(true);
    const success = await onSave(pathInput);
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white border border-[#cfc4c5] p-6 rounded-lg max-w-lg w-full shadow-2xl relative flex flex-col gap-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-sans text-lg font-bold text-black">Speicherort ändern</h3>
            <span className="font-mono text-[9px] text-[#585f6c] uppercase tracking-wider block mt-0.5">
              CSV-Verzeichnis konfigurieren
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-black font-mono text-sm p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="font-sans text-xs text-[#585f6c] leading-relaxed">
          Sie können den Ordner für die CSV-Dateien jederzeit ändern. Bereits vorhandene CSV-Dateien im neuen Ordner werden automatisch geladen. Wenn der neue Ordner leer ist, wird er mit Standard-Vorlagen initialisiert.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] text-[#585f6c] uppercase tracking-wider block" htmlFor="modal-path">
              Aktueller Pfad
            </label>
            <div className="flex gap-2">
              <input
                id="modal-path"
                type="text"
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                className="flex-1 bg-[#f9f9f9] border border-[#cfc4c5] p-2.5 font-mono text-xs rounded text-black focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={() => onSelectDir(setPathInput)}
                className="bg-neutral-100 hover:bg-neutral-200 border border-[#cfc4c5] text-black px-3 py-2 font-mono text-xs rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span className="material-symbols-outlined text-[14px]">folder_open</span>
                Durchsuchen
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2 border-t border-[#e2e2e2] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#cfc4c5] hover:bg-neutral-50 font-mono text-xs rounded text-black cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white font-mono text-xs rounded cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Speichere...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
