import React, { useState, useEffect, useRef } from 'react';
import { Registration, RaceEvent } from '../types';

interface StartZeitfahrenProps {
  races: string[];
  registrations: Registration[];
  activeRace: string;
  setActiveRace: (race: string) => void;
  onRaceCreate: (name: string) => void;
  onAddRaceEvent: (bib: string, typ: 'START' | 'ZIEL') => void;
  raceEvents: RaceEvent[];
  onRefreshRaces: () => void;
}

export default function StartZeitfahren({
  races,
  registrations,
  activeRace,
  setActiveRace,
  onRaceCreate,
  onAddRaceEvent,
  raceEvents,
  onRefreshRaces
}: StartZeitfahrenProps) {
  const [raceInput, setRaceInput] = useState('');
  const [isRaceConfirmed, setIsRaceConfirmed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Precision 1/100s clock state
  const [sysTimeLabel, setSysTimeLabel] = useState('00:00:00.00');

  // Load and sort registered bib numbers
  const registeredBibs = registrations
    .map(r => r.startnummer)
    .sort((a, b) => parseInt(a) - parseInt(b));

  const currentBib = registeredBibs[currentIndex] || '';
  const currentAthlete = registrations.find(r => r.startnummer === currentBib);

  // Precision Live Clock effect matches image precisely
  useEffect(() => {
    let animFrameId: number;
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      const hundredths = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setSysTimeLabel(`${hrs}:${mins}:${secs}.${hundredths}`);
      animFrameId = requestAnimationFrame(updateTime);
    };
    updateTime();
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  // Listen to space bar press to trigger Start
  useEffect(() => {
    if (!isRaceConfirmed) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeElement = document.activeElement;
        // Avoid triggering space if typing in an input
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault(); // prevent scrolling
        triggerStart();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRaceConfirmed, currentBib, currentIndex, registeredBibs]);

  // Race confirmation handler
  const handleConfirmRace = (selected: string) => {
    if (!selected) return;
    setActiveRace(selected);
    setIsRaceConfirmed(true);
    setCurrentIndex(0);
  };

  const handleCreateRaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!raceInput.trim()) return;
    onRaceCreate(raceInput.trim());
    setIsRaceConfirmed(true);
    setCurrentIndex(0);
  };

  const triggerStart = () => {
    if (!currentBib) {
      alert("Keine Starter mehr in der Registrierungsliste.");
      return;
    }
    // Record Start event to backend
    onAddRaceEvent(currentBib, 'START');
    
    // Jump to next index in registrations sequence
    setCurrentIndex(prev => prev + 1);
  };

  // Skip or manual bib selection trigger
  const handleJumpToBib = (startNum: string) => {
    const idx = registeredBibs.indexOf(startNum);
    if (idx !== -1) {
      setCurrentIndex(idx);
    } else {
      alert(`Startnummer ${startNum} wurde nicht bei den Anmeldungen gefunden.`);
    }
  };

  // Staging future queue (the next 4 athletes in the list)
  const queueAthletes = registeredBibs.slice(currentIndex + 1, currentIndex + 5).map(bib => {
    const athlete = registrations.find(r => r.startnummer === bib);
    return {
      bib,
      name: athlete ? `${athlete.vorname} ${athlete.name}` : 'Unbekannter Starter',
      category: athlete?.gender === 'M' ? 'Elite Herren' : 'Elite Damen',
    };
  });

  if (!isRaceConfirmed) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-[#f9f9f9] border border-[#cfc4c5] p-8 rounded-lg">
        <h2 className="font-sans text-xl font-bold text-black mb-2">Start Zeitfahren • Rennen auswählen</h2>
        <p className="font-sans text-xs text-[#585f6c] mb-6 leading-relaxed">
          Bitte wählen Sie ein bestehendes Rennen aus oder erstellen Sie ein neues, welches als CSV-Datenquelle in Ihrem Rennordner hinterlegt wird.
        </p>

        {/* Existing race select */}
        <div className="mb-6">
          <label className="block font-mono text-xs text-[#585f6c] uppercase tracking-widest mb-2">Bestehendes Rennen auswählen (CSV)</label>
          {races.length === 0 ? (
            <p className="p-3 text-xs border border-dashed text-gray-500 rounded font-mono bg-white">Keine CSV-Datenquellen gefunden.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {races.map((r) => (
                <button
                  key={r}
                  onClick={() => handleConfirmRace(r)}
                  className="w-full text-left p-3.5 bg-white border border-[#cfc4c5] hover:bg-neutral-50 transition-colors font-sans text-xs font-semibold text-black rounded relative flex justify-between items-center cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    📁 <span className="font-mono text-[11px] font-bold">{r}/</span>
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase font-mono">Aktivieren →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-[#e2e2e2]"></div>
          <span className="flex-shrink mx-4 text-xs font-mono text-[#7e7576]">ODER</span>
          <div className="flex-grow border-t border-[#e2e2e2]"></div>
        </div>

        {/* Create new race form */}
        <form onSubmit={handleCreateRaceSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block font-mono text-xs text-[#585f6c] uppercase tracking-widest mb-2" htmlFor="new-race-name">
              Neues Zeitfahren-Rennen eintragen
            </label>
            <input
              id="new-race-name"
              type="text"
              required
              value={raceInput}
              onChange={(e) => setRaceInput(e.target.value)}
              placeholder="e.g. Clubmeisterschaft 2026 Sprint"
              className="w-full p-3 bg-white border border-[#cfc4c5] rounded text-sm font-sans focus:outline-none focus:border-black text-black"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-black hover:bg-neutral-800 text-white font-mono text-xs font-bold py-3.5 text-center rounded transition-all cursor-pointer"
          >
            ➕ Neues Rennen anlegen &amp; starten
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full">
      {/* Upper control header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsRaceConfirmed(false)}
            className="p-1 px-2.5 border border-[#cfc4c5] rounded hover:bg-white text-xs font-mono text-black transition-colors cursor-pointer"
          >
            ← Zurück zur Auswahl
          </button>
          <div className="font-sans text-xs flex items-center gap-2 bg-white px-3 py-1.5 border border-[#cfc4c5] rounded">
            📁 <span className="font-mono text-[11px] font-bold text-black">{activeRace}/</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-[#cfc4c5] rounded px-3 py-1.5 shadow-sm select-none">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-mono text-[10px] text-black uppercase tracking-widest">CSV: ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Main Cockpit Layout Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 items-stretch">
        
        {/* Left main cockpit (next starter detail) */}
        <div className="lg:col-span-8 bg-white border border-[#cfc4c5] rounded flex flex-col p-8 relative overflow-hidden justify-between select-none">
          {/* Subtle dotted technical canvas */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1b1b1b 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          
          <div className="font-mono text-xs text-[#585f6c] mb-2 uppercase tracking-wider flex justify-between items-center z-10 w-full">
            <span>Nächster Starter</span>
            <span className="bg-black text-[#ffffff] px-2 py-0.5 rounded text-[9px] font-mono">AUTO-SEQUENCE</span>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center text-center z-10 py-12">
            {currentBib ? (
              <>
                <div id="TT-starter-bib" className="font-sans text-[120px] md:text-[160px] leading-none font-extrabold text-black tracking-tighter">
                  {currentBib.padStart(3, '0')}
                </div>
                <div id="TT-starter-name" className="font-sans text-3xl font-black text-black mt-4">
                  {currentAthlete ? `${currentAthlete.vorname} ${currentAthlete.name}` : 'Unregistrierte Nummer'}
                </div>
                <div id="TT-starter-city" className="font-mono text-xs text-[#585f6c] mt-2 uppercase tracking-widest">
                  {currentAthlete ? `${currentAthlete.wohnort}` : 'Keine Anmeldung'}
                </div>
              </>
            ) : (
              <div className="text-[#585f6c] font-mono text-sm py-16 text-center">
                🏁 Keine weiteren registrierten Starter.<br />
                Fügen Sie über "Anmeldung" weitere Fahrer hinzu.
              </div>
            )}
          </div>

          <div className="flex justify-between items-end z-10 border-t border-[#e2e2e2] pt-4 mt-4 w-full">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] text-[#585f6c]">Geplante Startnummer</span>
              <div className="flex gap-2 items-center mt-1">
                <input
                  type="text"
                  placeholder="BIB"
                  value={currentBib}
                  onChange={(e) => handleJumpToBib(e.target.value.replace(/[^0-9]/g, ''))}
                  className="font-mono text-xs bg-gray-50 border border-[#cfc4c5] p-1 w-14 rounded text-center focus:border-black focus:outline-none"
                  title="Geben Sie eine Startnummer ein, um zu dieser zu springen."
                />
                <span className="text-[10px] text-[#7e7576] font-mono">Index: {currentIndex + 1} / {registeredBibs.length}</span>
              </div>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-mono text-[10px] text-[#585f6c]">Kategorie</span>
              <span className="font-mono text-xs font-bold text-black mt-1">
                {currentAthlete ? (currentAthlete.gender === 'M' ? 'Elite Herren' : 'Elite Damen') : 'Unbekannt'}
              </span>
            </div>
          </div>
        </div>

        {/* Right controls (timer, click trigger) */}
        <div className="lg:col-span-4 flex flex-col gap-6 justify-between select-none">
          {/* Live system clock panel */}
          <div className="bg-white border border-[#cfc4c5] rounded p-6 flex flex-col items-center justify-center flex-1">
            <span className="font-mono text-xs text-[#585f6c] uppercase tracking-widest w-full text-left mb-4">Systemzeit (GPS Sync)</span>
            <div className="w-full text-center border border-[#cfc4c5] bg-[#f9f9f9] p-4 rounded">
              <div id="precision-gps-clock" className="font-mono text-2xl md:text-3xl font-bold text-black tabular-nums">
                {sysTimeLabel}
              </div>
            </div>
          </div>

          {/* Action button panel */}
          <div className="bg-white border border-[#cfc4c5] rounded p-6 flex flex-col justify-end">
            <div className="font-mono text-xs text-[#585f6c] mb-4 flex justify-between">
              <span>Aktion</span>
              <span className="text-black font-bold">Press [SPACE] or Click</span>
            </div>
            
            <button
              id="btn-trigger-start"
              type="button"
              onClick={triggerStart}
              disabled={!currentBib}
              className="w-full bg-black hover:bg-neutral-800 disabled:bg-gray-100 disabled:text-gray-400 text-white font-mono text-lg py-8 rounded hover:shadow active:scale-[0.98] transition-all focus:outline-none flex flex-col items-center justify-center cursor-pointer font-bold select-none"
            >
              <span className="material-symbols-outlined text-[40px] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
              START
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM UPCOMING QUEUE list */}
      <div className="mt-6 bg-white border border-[#cfc4c5] rounded overflow-hidden shrink-0 select-none">
        <div className="px-4 py-3 border-b border-[#cfc4c5] bg-[#f9f9f9] flex justify-between items-center">
          <span className="font-mono text-xs text-black uppercase tracking-wider font-semibold">Warteschlange (Nächste Starter)</span>
          <span className="font-mono text-[10px] text-[#585f6c]">Aktive Vorschau</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="font-mono text-[11px] text-[#585f6c] border-b border-[#cfc4c5] bg-[#f9f9f9]">
                <th className="px-6 py-2 font-normal w-16">Startnr.</th>
                <th className="px-6 py-2 font-normal">Athleten Name</th>
                <th className="px-6 py-2 font-normal">Kategorie</th>
                <th className="px-6 py-2 font-normal text-right">Vorbereitung</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs text-[#5c5c5c]">
              {queueAthletes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-[#5c5c5c]">
                    Keine weiteren Läufer in der Warteschlange.
                  </td>
                </tr>
              ) : (
                queueAthletes.map((athlete, i) => (
                  <tr
                    key={i}
                    className={`border-b border-[#e2e2e2] last:border-0 hover:bg-[#f9f9f9] transition-all ${
                      i > 0 ? 'opacity-50' : 'opacity-90'
                    }`}
                  >
                    <td className="px-6 py-3 text-black font-bold">#{athlete.bib}</td>
                    <td className="px-6 py-3 font-sans text-sm font-medium text-black">{athlete.name}</td>
                    <td className="px-6 py-3">{athlete.category}</td>
                    <td className="px-6 py-3 text-right text-green-600">Bereitmachen • in { (i+1) * 30 }s</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
