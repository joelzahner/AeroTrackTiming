import React, { useState } from 'react';
import { Registration } from '../types';

interface MassenstartProps {
  races: string[];
  registrations: Registration[];
  activeRace: string;
  setActiveRace: (race: string) => void;
  onRaceCreate: (name: string) => void;
  onAddRaceEventsBulk: (bibs: string[], typ: 'START' | 'ZIEL') => void;
}

export default function Massenstart({
  races,
  registrations,
  activeRace,
  setActiveRace,
  onRaceCreate,
  onAddRaceEventsBulk
}: MassenstartProps) {
  const [raceInput, setRaceInput] = useState('');
  const [isRaceConfirmed, setIsRaceConfirmed] = useState(false);
  const [bibInput, setBibInput] = useState('');
  const [stagedBibs, setStagedBibs] = useState<string[]>([]);
  const [lastTriggerInfo, setLastTriggerInfo] = useState<{ time: string; count: number } | null>(null);
  const [isStartingSim, setIsStartingSim] = useState(false);

  // Parse custom string (with support for commas, spaces, and ranges like 110-115)
  const handleParseList = () => {
    if (!bibInput.trim()) return;

    // Splits on commas, spaces, and cleans empty strings
    const blocks = bibInput.split(/[,\s]+/).map(b => b.trim()).filter(Boolean);
    const parsed: string[] = [];

    blocks.forEach((block) => {
      if (block.includes('-')) {
        // Hyphen range parsing
        const rangeParts = block.split('-');
        if (rangeParts.length === 2) {
          const start = parseInt(rangeParts[0], 10);
          const end = parseInt(rangeParts[1], 10);
          if (!isNaN(start) && !isNaN(end) && start <= end && (end - start < 100)) {
            for (let i = start; i <= end; i++) {
              parsed.push(String(i));
            }
          }
        }
      } else {
        const num = parseInt(block, 10);
        if (!isNaN(num)) {
          parsed.push(String(num));
        }
      }
    });

    // Deduplicate and append to current staged bibs
    const uniqueCombined = Array.from(new Set([...stagedBibs, ...parsed]));
    setStagedBibs(uniqueCombined);
    setBibInput('');
  };

  const removeStagedNumber = (num: string) => {
    setStagedBibs((prev) => prev.filter((b) => b !== num));
  };

  const handleClearStaging = () => {
    setStagedBibs([]);
  };

  const triggerMassStart = () => {
    if (stagedBibs.length === 0) {
      alert("Tragen Sie zuerst Startnummern in die Liste ein.");
      return;
    }

    setIsStartingSim(true);

    const now = new Date();
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const hundredths = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
    const stamp = `${hrs}:${mins}:${secs}.${hundredths}`;

    const count = stagedBibs.length;

    // Call bulk trigger callback immediately
    onAddRaceEventsBulk(stagedBibs, 'START');

    setLastTriggerInfo({
      time: stamp,
      count: count
    });

    setStagedBibs([]);
    setIsStartingSim(false);
  };

  const handleSelectRace = (selected: string) => {
    setActiveRace(selected);
    setIsRaceConfirmed(true);
  };

  const handleCreateRaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!raceInput.trim()) return;
    onRaceCreate(raceInput.trim());
    setIsRaceConfirmed(true);
  };

  if (!isRaceConfirmed) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-[#f9f9f9] border border-[#cfc4c5] p-8 rounded-lg">
        <h2 className="font-sans text-xl font-bold text-black mb-2">Massenstart • Rennen auswählen</h2>
        <p className="font-sans text-xs text-[#585f6c] mb-6 leading-relaxed">
          Bitte aktivieren Sie ein bestehendes Rennen oder erstellen Sie eine neue CSV-Datei für die synchronisierten Startzeiten.
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
                  onClick={() => handleSelectRace(r)}
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
            <label className="block font-mono text-xs text-[#585f6c] uppercase tracking-widest mb-2" htmlFor="new-race-mass">
              Neues Massenstart-Rennen eintragen
            </label>
            <input
              id="new-race-mass"
              type="text"
              required
              value={raceInput}
              onChange={(e) => setRaceInput(e.target.value)}
              placeholder="e.g. Volkslauf Massenstart 2026"
              className="w-full p-3 bg-white border border-[#cfc4c5] rounded text-sm font-sans focus:outline-none focus:border-black text-black"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-black hover:bg-neutral-800 text-white font-mono text-xs font-bold py-3.5 text-center rounded transition-all cursor-pointer"
          >
            🏁 Neues Rennen für Massenstart anlegen
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full select-none">
      {/* Control navigation header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 shrink-0">
        <div>
          <button
            onClick={() => setIsRaceConfirmed(false)}
            className="p-1 px-2.5 border border-[#cfc4c5] rounded hover:bg-white text-xs font-mono text-black transition-colors cursor-pointer mb-2"
          >
            ← Zurück zur Auswahl
          </button>
          <p className="font-sans text-xs text-[#585f6c] mt-1">
            Konfiguration für synchronisierten Start. Ein gemeinsamer Zeitstempel wird für alle Staging-BIBs erfasst.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f3f3f3] border border-[#cfc4c5] rounded">
          <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>
          <span className="font-mono text-[10px] text-black">CSV Bereit</span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch flex-1 min-h-0">
        
        {/* Left column: input text & trigger */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          
          {/* Text Area Card */}
          <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded-lg p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#e2e2e2] pb-3 mb-2">
              <h3 className="font-mono text-xs text-black font-bold uppercase tracking-wider">Startnummern Eingabe</h3>
              <span className="material-symbols-outlined text-[#585f6c] text-sm">keyboard</span>
            </div>
            
            <div className="flex flex-col gap-2">
              <label htmlFor="bibs-text-input" className="font-sans text-[11px] font-bold text-[#5c5c5c]">
                Kommagetrennte Liste, Leerzeichen oder Ranges
              </label>
              <textarea
                id="bibs-text-input"
                rows={4}
                value={bibInput}
                onChange={(e) => setBibInput(e.target.value)}
                placeholder="Bsp: 101, 102, 105, 110-120"
                className="w-full bg-white border border-[#cfc4c5] rounded p-3 font-mono text-xs text-black focus:border-black focus:ring-0 outline-none transition-all resize-none"
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleParseList}
                className="flex-1 bg-white hover:bg-neutral-50 text-black border border-black font-mono text-xs py-2 rounded transition-colors flex justify-center items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">playlist_add</span>
                Liste Prüfen
              </button>
              <button
                type="button"
                onClick={() => setBibInput('')}
                className="border border-[#cfc4c5] text-[#585f6c] hover:bg-red-50 hover:text-red-700 font-mono text-xs py-2 px-4 rounded transition-colors cursor-pointer"
              >
                Löschen
              </button>
            </div>
          </div>

          {/* Trigger start event Card */}
          <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded-lg p-6 flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-black"></div>
            
            <div className="flex flex-col items-center justify-center py-4">
              <span className="font-mono text-xs text-[#585f6c] mb-3 uppercase tracking-widest">Start Auslöser</span>
              
              <button
                onClick={triggerMassStart}
                disabled={stagedBibs.length === 0 || isStartingSim}
                className="w-full max-w-xs aspect-[3/1] bg-black text-[#ffffff] hover:bg-neutral-800 disabled:bg-gray-100 disabled:text-gray-400 active:scale-[0.98] transition-all font-sans text-xl font-bold tracking-widest rounded shadow-sm flex items-center justify-center gap-3 relative overflow-hidden cursor-pointer"
              >
                {isStartingSim ? (
                  <span className="material-symbols-outlined text-2xl animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-2xl">rocket_launch</span>
                )}
                <span>START</span>
              </button>
            </div>

            <div className="bg-[#f3f3f3] p-4 rounded border border-[#cfc4c5] flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-[#585f6c]">Bereite Starter (Staging):</span>
                <span className="font-mono text-sm text-black font-bold">{stagedBibs.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-[#585f6c]">Geplante Startzeit:</span>
                <span className="font-mono text-xs text-black font-bold uppercase">Sofort</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: staged list */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded-lg flex-1 flex flex-col overflow-hidden min-h-[400px]">
            <div className="flex justify-between items-center p-4 border-b border-[#cfc4c5] bg-[#ffffff]">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-black">groups</span>
                <h3 className="font-mono text-xs text-black font-bold uppercase tracking-wider">Staging Area ({activeRace})</h3>
              </div>
              <div className="flex gap-2">
                {stagedBibs.length > 0 && (
                  <button
                    onClick={handleClearStaging}
                    className="text-[10px] uppercase font-mono px-2 py-1 text-red-600 hover:text-red-800 bg-red-50 border border-red-200 rounded cursor-pointer"
                  >
                    Staging leeren
                  </button>
                )}
                <span className="px-2 py-1 bg-[#f3f3f3] rounded font-mono text-[10px] text-[#585f6c] border border-[#cfc4c5]">
                  {stagedBibs.length} Starter aktiv
                </span>
              </div>
            </div>

            {/* list rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white" id="staging-list">
              {stagedBibs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 py-20 opacity-65">
                  <span className="material-symbols-outlined text-4xl mb-2">fact_check</span>
                  <span className="font-mono text-xs">Keine Startnummern in der Warteschlange</span>
                  <p className="font-sans text-[11px] text-[#7e7576] mt-2 text-center max-w-xs">
                    Geben Sie Startnummern links ein, um das Grid für den Massensynchronstart vorzubereiten.
                  </p>
                </div>
              ) : (
                stagedBibs.map((num, idx) => {
                  const athlete = registrations.find((r) => r.startnummer === num);
                  const isRegistered = !!athlete;
                  const bgClass = idx % 2 === 0 ? 'bg-[#ffffff]' : 'bg-[#fafafa]';

                  return (
                    <div
                      key={num}
                      className={`grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#e2e2e2] items-center ${bgClass} hover:bg-neutral-50 transition-colors group`}
                    >
                      <div className="col-span-2 font-mono text-sm font-bold text-black flex items-center gap-1">
                        <span>#{num}</span>
                      </div>
                      <div className="col-span-5 font-sans text-xs font-semibold text-black">
                        {isRegistered ? `${athlete.vorname} ${athlete.name}` : 'Unregistrierter Dummy'}
                      </div>
                      <div className="col-span-4 flex items-center gap-2">
                        {isRegistered ? (
                          <>
                            <span className="material-symbols-outlined text-sm text-green-500">check_circle</span>
                            <span className="font-mono text-[10px] text-green-700">Validiert ({athlete.wohnort})</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm text-yellow-500">warning</span>
                            <span className="font-mono text-[10px] text-yellow-700">Gastfahrer</span>
                          </>
                        )}
                      </div>
                      <div className="col-span-1 text-right">
                        <button
                          type="button"
                          onClick={() => removeStagedNumber(num)}
                          className="text-[#585f6c] hover:text-red-700 cursor-pointer"
                          title="Fahrer entfernen"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer information bar */}
            <div className="p-4 border-t border-[#cfc4c5] bg-[#f9f9f9] flex justify-between items-center text-xs">
              <div className="flex items-center gap-2 text-[#585f6c]">
                <span className="material-symbols-outlined text-xs">description</span>
                <span className="font-mono text-[10px]">Einträge werden in {activeRace}/startzeiten.csv exportiert</span>
              </div>
            </div>
          </div>

          {/* Stated log of last mass start trigger */}
          {lastTriggerInfo && (
            <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded p-4 flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center border border-[#cfc4c5] shrink-0">
                <span className="material-symbols-outlined text-black">history</span>
              </div>
              <div className="flex-grow flex flex-col">
                <span className="font-mono text-[10px] text-[#585f6c]">Letzter Massenstart</span>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm font-bold text-black">{lastTriggerInfo.time}</span>
                  <span className="font-mono text-[10px] text-neutral-600">| Gruppe von {lastTriggerInfo.count} Athleten</span>
                </div>
              </div>
              <div className="text-green-600 font-mono text-[10px] font-bold">✔ Gespeichert</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
