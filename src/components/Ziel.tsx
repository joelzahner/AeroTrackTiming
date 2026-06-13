import React, { useState, useEffect } from 'react';
import { Registration, TagAssignment, RaceEvent, FinisherResult } from '../types';

interface ZielProps {
  races: string[];
  registrations: Registration[];
  tagAssignments: TagAssignment[];
  activeRace: string;
  setActiveRace: (race: string) => void;
  onRaceCreate: (name: string) => void;
  onAddRaceEvent: (bib: string, typ: 'START' | 'ZIEL') => void;
  raceEvents: RaceEvent[];
  onRefresh: () => void;
}

export default function Ziel({
  races,
  registrations,
  tagAssignments,
  activeRace,
  setActiveRace,
  onRaceCreate,
  onAddRaceEvent,
  raceEvents,
  onRefresh
}: ZielProps) {
  const [raceInput, setRaceInput] = useState('');
  const [isRaceConfirmed, setIsRaceConfirmed] = useState(false);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(true);
  const [sysTimeLabel, setSysTimeLabel] = useState('00:00:00.00');

  // Animated visual RFID bars state
  const [barHeights, setBarHeights] = useState<number[]>([]);

  // Simulation: List tags that can be crossed/triggered
  const [simFilter, setSimFilter] = useState('');

  // Setup visual simulated bars on mount
  useEffect(() => {
    setBarHeights(Array.from({ length: 30 }, () => Math.floor(Math.random() * 80) + 20));
  }, []);

  // Animate RF signal bars if stream is active
  useEffect(() => {
    if (!isLiveStreamActive) return;
    const interval = setInterval(() => {
      setBarHeights(Array.from({ length: 30 }, () => Math.floor(Math.random() * 80) + 20));
    }, 150);
    return () => clearInterval(interval);
  }, [isLiveStreamActive]);

  // Precision 1/100s clock state
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

  // Confirm Race Selection
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

  // Triggering simulated tag scan
  const handleSimulateTagCrossing = (assignment: TagAssignment) => {
    // Adds a ZIEL event to the active race CSV
    onAddRaceEvent(assignment.startnummer, 'ZIEL');
  };

  // Process finisher standings
  // We need to match START and ZIEL events for each bib to calculate total time, sorted by rank!
  const getProcessedStandings = (): FinisherResult[] => {
    const bibs = Array.from(new Set(raceEvents.map(e => e.startnummer)));
    const list: FinisherResult[] = [];

    bibs.forEach((bib) => {
      // Find start and finish events for this bib
      const startEvt = raceEvents.filter(e => e.startnummer === bib && e.typ === 'START').sort((a,b) => Number(a.exactMs) - Number(b.exactMs))[0];
      const finishEvts = raceEvents.filter(e => e.startnummer === bib && e.typ === 'ZIEL').sort((a,b) => Number(a.exactMs) - Number(b.exactMs));
      const finishEvt = finishEvts[finishEvts.length - 1]; // pick latest finish

      const athlete = registrations.find(r => r.startnummer === bib);
      
      const res: FinisherResult = {
        startnummer: bib,
        name: athlete ? athlete.name : 'Gastschreiber',
        vorname: athlete ? athlete.vorname : `#${bib}`,
        gender: athlete ? athlete.gender : 'M',
        geburtsdatum: athlete ? athlete.geburtsdatum : '1990',
        wohnort: athlete ? athlete.wohnort : 'Extern',
        club: athlete ? athlete.club : false,
        startTime: startEvt ? startEvt.timestamp : undefined,
        startMs: startEvt ? Number(startEvt.exactMs) : undefined,
        finishTime: finishEvt ? finishEvt.timestamp : undefined,
        finishMs: finishEvt ? Number(finishEvt.exactMs) : undefined,
        elapsedLabel: 'DNF',
        elapsedMs: Infinity,
        diffLabel: '-'
      };

      if (res.startMs && res.finishMs) {
        const delta = res.finishMs - res.startMs;
        res.elapsedMs = delta;

        // format visual label
        const diffMs = delta % 1000;
        const totalSecs = Math.floor(delta / 1000);
        const secs = totalSecs % 60;
        const totalMins = Math.floor(totalSecs / 60);
        const mins = totalMins % 60;
        const hrs = Math.floor(totalMins / 60);

        const pad = (n: number) => String(n).padStart(2, '0');
        const msPad = (n: number) => String(Math.floor(n / 10)).padStart(2, '0'); // hundredths format like screenshot

        if (hrs > 0) {
          res.elapsedLabel = `${hrs}:${pad(mins)}:${pad(secs)}.${msPad(diffMs)}`;
        } else {
          res.elapsedLabel = `${pad(mins)}:${pad(secs)}.${msPad(diffMs)}`;
        }
      }

      list.push(res);
    });

    // Sort by elapsedMs. Keep DNF (elapsedMs = Infinity) at the bottom
    const finishers = list.filter(item => item.elapsedMs !== Infinity).sort((a, b) => a.elapsedMs - b.elapsedMs);
    const dnfs = list.filter(item => item.elapsedMs === Infinity);

    // Calculate relative differences to leader
    if (finishers.length > 0) {
      const leaderMs = finishers[0].elapsedMs;
      finishers.forEach((f, idx) => {
        f.pos = idx + 1;
        if (idx === 0) {
          f.diffLabel = '+0.00';
        } else {
          const diff = f.elapsedMs - leaderMs;
          const totalSecs = Math.floor(diff / 1000);
          const secs = totalSecs % 60;
          const mins = Math.floor(totalSecs / 60);
          const ms = diff % 1000;
          const pad = (n: number) => String(n).padStart(2, '0');
          const msPad = (n: number) => String(Math.floor(n / 10)).padStart(2, '0');
          
          if (mins > 0) {
            f.diffLabel = `+${mins}:${pad(secs)}.${msPad(ms)}`;
          } else {
            f.diffLabel = `+${secs}.${msPad(ms)}`;
          }
        }
      });
    }

    return [...finishers, ...dnfs];
  };

  const processedStandings = getProcessedStandings();
  const finishersCount = processedStandings.filter(f => f.elapsedMs !== Infinity).length;

  // Get latest triggered finish event
  const latestFinishEvent = raceEvents.filter(e => e.typ === 'ZIEL').slice(-1)[0];
  const latestFinishBib = latestFinishEvent ? latestFinishEvent.startnummer : '';
  const latestFinishAthlete = registrations.find(r => r.startnummer === latestFinishBib);

  if (!isRaceConfirmed) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-[#f9f9f9] border border-[#cfc4c5] p-8 rounded-lg select-none">
        <h2 className="font-sans text-xl font-bold text-black mb-2">Ziel-Zeiterfassung • Rennen auswählen</h2>
        <p className="font-sans text-xs text-[#585f6c] mb-6 leading-relaxed">
          Bitte wählen Sie das aktive Rennen aus für welches die UHF RFID Zielankunftszeiten eingetragen werden sollen.
        </p>

        {/* Existing race select */}
        <div className="mb-6">
          <label className="block font-mono text-xs text-[#585f6c] uppercase tracking-widest mb-2">Renndatensatz aktivieren (CSV)</label>
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
                    📁 <span className="font-mono text-[11px] font-bold">{r}.csv</span>
                  </span>
                  <span className="text-[10px] text-gray-500 uppercase font-mono">Verfolgen →</span>
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
            <label className="block font-mono text-xs text-[#585f6c] uppercase tracking-widest mb-2" htmlFor="new-race-finish">
              Neues Zielerfassungs-Rennen eintragen
            </label>
            <input
              id="new-race-finish"
              type="text"
              required
              value={raceInput}
              onChange={(e) => setRaceInput(e.target.value)}
              placeholder="e.g. Grand Prix Zürich 2026"
              className="w-full p-3 bg-white border border-[#cfc4c5] rounded text-sm font-sans focus:outline-none focus:border-black text-black"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-black hover:bg-neutral-800 text-white font-mono text-xs font-bold py-3.5 text-center rounded transition-all cursor-pointer"
          >
            🏁 Neues Rennen zur Zielerfassung anlegen
          </button>
        </form>
      </div>
    );
  }

  // Filter tag assignments to simulate
  const filteredTags = tagAssignments.filter(tag => {
    const term = simFilter.toLowerCase();
    return tag.startnummer.includes(term) || tag.epc.toLowerCase().includes(term);
  });

  return (
    <div className="flex-1 flex flex-col w-full h-full select-none">
      {/* Top controls and selectors */}
      <div className="flex flex-wrap gap-4 justify-between items-center bg-[#ffffff] p-4 border border-[#cfc4c5] rounded mb-6 shrink-0">
        <div className="w-full md:w-1/3">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setIsRaceConfirmed(false)}
              className="text-[10px] border border-[#cfc4c5] px-1.5 py-0.5 rounded font-mono text-black bg-[#f3f3f3] hover:bg-white transition-colors cursor-pointer"
            >
              Wechseln ⇄
            </button>
            <label className="block font-mono text-[10px] text-[#585f6c] uppercase tracking-wider">ACTIVE RACE CSV</label>
          </div>
          <div className="font-sans text-xs font-bold text-black border border-[#cfc4c5] p-2 bg-[#f9f9f9] rounded flex justify-between items-center">
            <span>📁 {activeRace}.csv</span>
            <span className="text-[9px] font-mono text-green-600 font-bold animate-pulse">● READER ACTIVE</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col">
            <span className="font-mono text-[10px] text-[#585f6c] mb-1 uppercase">READER TUNING</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-4 bg-green-500 rounded-sm"></div>
              <div className="w-1.5 h-5 bg-green-500 rounded-sm"></div>
              <div className="w-1.5 h-6 bg-green-500 rounded-sm"></div>
              <div className="w-1.5 h-7 bg-green-500 rounded-sm"></div>
              <div className="w-1.5 h-8 bg-gray-200 rounded-sm"></div>
              <span className="font-mono text-xs font-bold text-green-600 ml-1">-65 dBm</span>
            </div>
          </div>
          <div className="flex flex-col border-l border-[#e2e2e2] pl-4">
            <span className="font-mono text-[10px] text-[#585f6c] mb-1">READ SPEED</span>
            <span className="font-mono text-xs font-bold text-black">142 epc/sec</span>
          </div>
          <div className="flex flex-col border-l border-[#e2e2e2] pl-4">
            <span className="font-mono text-[10px] text-[#585f6c] mb-1">GPS TIME INDEX</span>
            <span className="font-mono text-xs font-bold text-black" id="sys-time">{sysTimeLabel}</span>
          </div>
        </div>
      </div>

      {/* Main Grid telemetry cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 items-stretch">
        
        {/* Left Side: Live feeds */}
        <div className="lg:col-span-8 flex flex-col gap-6 justify-between">
          
          {/* Latest Finish visual layout matches image 5 exactly */}
          <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded p-6 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-4">
              <span className="px-2 py-0.5 bg-neutral-200 text-[#585f6c] font-mono text-[10px] rounded border border-[#cfc4c5]">
                {isLiveStreamActive ? 'LIVE ANTENNE ACTIVE' : 'STREAM STALE'}
              </span>
            </div>
            
            <h2 className="font-mono text-xs text-[#585f6c] mb-4 uppercase tracking-widest">LATEST DETECTION</h2>
            
            <div className="flex-1 flex flex-col justify-center items-center py-6">
              <div id="latest-finish-time" className="font-mono text-5xl md:text-6xl font-extrabold text-black mb-2 animate-pulse">
                {latestFinishEvent ? latestFinishEvent.timestamp : '--:--:--.--'}
              </div>
              <div className="flex items-center gap-4 border-t border-[#e2e2e2] pt-4 w-full justify-center">
                <span className="font-sans text-xl font-bold text-[#5c5c5c]">BIB</span>
                <span id="latest-finish-bib" className="font-mono text-2xl font-black text-black">
                  {latestFinishBib ? latestFinishBib.padStart(3, '0') : '000'}
                </span>
                <span className="mx-4 w-px h-6 bg-[#cfc4c5]"></span>
                <span id="latest-finish-name" className="font-sans text-lg font-bold text-black">
                  {latestFinishAthlete ? `${latestFinishAthlete.vorname} ${latestFinishAthlete.name}` : 'Augeprüftes UHF-Band'}
                </span>
              </div>
            </div>

            {/* Pulsating stream visualization bars */}
            <div className="h-10 w-full mt-4 flex items-end gap-[3px] border-t border-neutral-100 pt-3 opacity-60">
              {barHeights.map((ht, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{
                    height: `${ht}%`,
                    backgroundColor: i % 4 === 0 ? '#10B981' : '#000000',
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Raw RFID feeds */}
          <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded flex-1 flex flex-col overflow-hidden min-h-[180px]">
            <div className="p-4 border-b border-[#cfc4c5] flex justify-between items-center bg-[#ffffff]">
              <h2 className="font-mono text-xs text-[#585f6c] uppercase font-bold tracking-wider">Antennen RFID-Raw Band (Real-time)</h2>
              <button
                onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
                className="text-[10px] font-mono hover:underline uppercase p-0.5 text-black font-semibold cursor-pointer"
              >
                {isLiveStreamActive ? 'PAUSE STREAM' : 'RESUME STREAM'}
              </button>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar bg-white">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[#fafafa] border-b border-[#cfc4c5] font-mono text-[11px] text-[#585f6c]">
                  <tr>
                    <th className="py-2 px-4 font-normal">TIMESTAMP</th>
                    <th className="py-2 px-4 font-normal">EPC ID (RFID CAPTURED)</th>
                    <th className="py-2 px-4 font-normal">RSSI</th>
                    <th className="py-2 px-4 font-normal text-right">ANT</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs text-neutral-600">
                  {raceEvents.filter(e => e.typ === 'ZIEL').slice(-6).reverse().map((evt, idx) => {
                    // find matching assignment to show epc
                    const match = tagAssignments.find(t => t.startnummer === evt.startnummer);
                    return (
                      <tr key={idx} className="border-b border-[#f3f3f3] hover:bg-[#fafafa]">
                        <td className="py-2 px-4 text-black font-bold">{evt.timestamp}</td>
                        <td className="py-2 px-4 select-all text-[#5c5c5c]">
                          {match ? match.epc : `E280 1160 6000 020F 0B19 ${evt.startnummer.padStart(4, '0')}`}
                        </td>
                        <td className="py-2 px-4 text-green-600 font-bold">-{Math.floor(Math.random() * 20) + 45} dBm</td>
                        <td className="py-2 px-4 text-right">A1</td>
                      </tr>
                    );
                  })}
                  {raceEvents.filter(e => e.typ === 'ZIEL').length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-[#5c5c5c] font-mono text-xs">
                        Warte auf UHF Transponder Signale im Ziel-Antennenbereich...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side Standings results matches image 5 perfectly */}
        <div className="lg:col-span-4 bg-[#f9f9f9] border border-[#cfc4c5] rounded-lg flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-[#cfc4c5] bg-[#ffffff] flex justify-between items-center">
            <h2 className="font-mono text-xs text-[#585f6c] font-bold uppercase tracking-wider">Ergebnisliste (Live in .csv)</h2>
            <span className="px-1.5 py-0.5 bg-neutral-100 text-black font-mono text-[9px] rounded border border-[#cfc4c5]">
              {finishersCount} Finished
            </span>
          </div>

          {/* List of processed finishers */}
          <div className="flex-grow overflow-y-auto custom-scrollbar bg-white p-2 flex flex-col gap-2 h-[340px]">
            {processedStandings.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-sans text-xs">
                Keine Resultate registriert. Simulieren Sie eine Zielankunft durch Triggern eines Tags unten.
              </div>
            ) : (
              processedStandings.map((stand, i) => {
                const isFinished = stand.elapsedMs !== Infinity;
                return (
                  <div
                    key={stand.startnummer}
                    className="flex justify-between items-center p-3 border border-[#cfc4c5] rounded bg-[#ffffff] hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 flex items-center justify-center bg-black text-[#ffffff] font-mono text-xs rounded font-bold">
                        {stand.startnummer.padStart(3, '0')}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-sans text-xs font-bold text-black">{stand.name}, {stand.vorname}</span>
                        <span className="font-mono text-[10px] text-[#585f6c]">{stand.wohnort}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end text-right">
                      <span className="font-mono text-xs font-bold text-black">
                        {stand.elapsedLabel}
                      </span>
                      <span className={`font-mono text-[10px] ${isFinished ? 'text-green-600' : 'text-red-500'}`}>
                        {isFinished ? stand.diffLabel : 'DNF'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Simulation Tool right inside the card footer */}
          <div className="p-4 border-t border-[#cfc4c5] bg-[#f9f9f9]">
            <div className="mb-2">
              <label className="block font-mono text-[10px] text-[#585f6c] font-bold uppercase mb-1">RFID UHF SIMULATOR ANTENNE</label>
              <input
                type="text"
                placeholder="Sim-Fokus Filtern..."
                value={simFilter}
                onChange={(e) => setSimFilter(e.target.value)}
                className="w-full p-1 bg-white border border-[#cfc4c5] rounded font-mono text-[10px] text-black outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto custom-scrollbar border border-[#e2e2e2] bg-white p-1 rounded">
              {filteredTags.map((tag) => (
                <button
                  key={tag.startnummer}
                  type="button"
                  onClick={() => handleSimulateTagCrossing(tag)}
                  className="p-1 px-2 border border-[#cfc4c5] hover:bg-neutral-100 hover:border-black text-left rounded text-[9px] font-mono text-black transition-colors flex justify-between items-center cursor-pointer"
                  title={`Simuliert das Vorbeifahren von Startnummer ${tag.startnummer} an der Zielantenne`}
                >
                  <span>Bib #{tag.startnummer}</span>
                  <span className="text-[#5c5c5c] font-bold">Trigger 📡</span>
                </button>
              ))}
              {filteredTags.length === 0 && (
                <p className="col-span-2 text-center text-[9px] font-mono text-gray-500 p-2">Keine Tags zugewiesen.</p>
              )}
            </div>
            <p className="text-[9px] text-[#7e7576] font-mono mt-2 text-center">Klicken Sie oben auf "Trigger" um den Sensor anzusprechen.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
