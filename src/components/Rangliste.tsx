import React, { useState } from 'react';
import { Registration, RaceEvent, FinisherResult } from '../types';

interface RanglisteProps {
  races: string[];
  registrations: Registration[];
  activeRace: string;
  setActiveRace: (race: string) => void;
  raceEvents: RaceEvent[];
  onRefreshRaceEvents: (raceName: string) => void;
}

interface CategoryConfig {
  name: string;
  minYear: number;
  maxYear: number;
}

export default function Rangliste({
  races,
  registrations,
  activeRace,
  setActiveRace,
  raceEvents,
  onRefreshRaceEvents
}: RanglisteProps) {
  const [selectedRace, setSelectedRace] = useState(activeRace || races[0] || '');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [selectedYearRange, setSelectedYearRange] = useState('Alle');

  // Dynamic Category & Age Configuration (as requested: "Man soll eintragen können, welche Kategorien es gibt und von welchem bis welchem Jahrgang das die Kategorien geht")
  const [categories, setCategories] = useState<CategoryConfig[]>([
    { name: 'Elite Herren', minYear: 1980, maxYear: 1999 },
    { name: 'Elite Damen', minYear: 1980, maxYear: 1999 },
    { name: 'U23', minYear: 2000, maxYear: 2005 },
    { name: 'Senioren', minYear: 1950, maxYear: 1979 },
  ]);

  const [newCatName, setNewCatName] = useState('');
  const [newCatMin, setNewCatMin] = useState(1990);
  const [newCatMax, setNewCatMax] = useState(2005);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCategories(prev => [
      ...prev.filter(c => c.name.toLowerCase() !== newCatName.trim().toLowerCase()), // avoid duplicate names
      {
        name: newCatName.trim(),
        minYear: newCatMin,
        maxYear: newCatMax,
      }
    ]);
    setNewCatName('');
  };

  const handleRemoveCategory = (name: string) => {
    setCategories((prev) => prev.filter((c) => c.name !== name));
  };

  const handlePrint = () => {
    window.print();
  };

  // Convert race events into parsed timing stats
  const getProcessedStandings = (): FinisherResult[] => {
    const bibs = Array.from(new Set(raceEvents.map(e => e.startnummer)));
    const list: FinisherResult[] = [];

    bibs.forEach((bib) => {
      const startEvt = raceEvents.filter(e => e.startnummer === bib && e.typ === 'START').sort((a,b) => Number(a.exactMs) - Number(b.exactMs))[0];
      const finishEvts = raceEvents.filter(e => e.startnummer === bib && e.typ === 'ZIEL').sort((a,b) => Number(a.exactMs) - Number(b.exactMs));
      const finishEvt = finishEvts[finishEvts.length - 1];

      const athlete = registrations.find(r => r.startnummer === bib);
      
      const res: FinisherResult = {
        startnummer: bib,
        name: athlete ? athlete.name : 'Gastschreiber',
        vorname: athlete ? athlete.vorname : `#${bib}`,
        gender: athlete ? athlete.gender : 'M',
        geburtsdatum: athlete ? athlete.geburtsdatum : '1990-01-01',
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
        const msPad = (n: number) => String(Math.floor(n / 10)).padStart(2, '0');

        if (hrs > 0) {
          res.elapsedLabel = `${hrs}:${pad(mins)}:${pad(secs)}.${msPad(diffMs)}`;
        } else {
          res.elapsedLabel = `${pad(mins)}:${pad(secs)}.${msPad(diffMs)}`;
        }
      }

      list.push(res);
    });

    // Sort by final times
    const finishers = list.filter(item => item.elapsedMs !== Infinity).sort((a, b) => a.elapsedMs - b.elapsedMs);
    const dnfs = list.filter(item => item.elapsedMs === Infinity);

    // Calculate relative differences to leader
    if (finishers.length > 0) {
      const leaderMs = finishers[0].elapsedMs;
      finishers.forEach((f, idx) => {
        f.pos = idx + 1;
        if (idx === 0) {
          f.diffLabel = '-';
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

  const handleDownloadCSV = () => {
    const escapeCSVField = (val: any): string => {
      const str = val === undefined || val === null ? "" : String(val);
      if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = "pos;startnummer;name;vorname;geburtsdatum;wohnort;club;zeit;differenz\r\n" + 
      filteredStandings.map(s => `${s.pos || '-'};${escapeCSVField(s.startnummer)};${escapeCSVField(s.name)};${escapeCSVField(s.vorname)};${escapeCSVField(s.geburtsdatum)};${escapeCSVField(s.wohnort)};${s.club ? 'Ja' : 'Nein'};${escapeCSVField(s.elapsedLabel)};${escapeCSVField(s.diffLabel)}`).join("\r\n");
    
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `rangliste_${selectedRace}.csv`);
    a.click();
  };

  const allStandings = getProcessedStandings();

  // Filter rankings by category & customized year classifications
  const filteredStandings = allStandings.filter((runner) => {
    const birthYear = parseInt(runner.geburtsdatum.split('-')[0]) || 1990;

    // Apply selected birth year dropdown ranges
    if (selectedYearRange !== 'Alle') {
      if (selectedYearRange === '2000 - 2005' && (birthYear < 2000 || birthYear > 2005)) return false;
      if (selectedYearRange === '1995 - 1999' && (birthYear < 1995 || birthYear > 1999)) return false;
      if (selectedYearRange === 'Vor 1995' && birthYear >= 1995) return false;
    }

    // Apply selected category dropdown from dynamic configurations
    if (selectedCategory !== 'Alle') {
      const config = categories.find((c) => c.name === selectedCategory);
      if (config) {
        // Matches athlete gender and age range
        if (birthYear < config.minYear || birthYear > config.maxYear) return false;
        
        // Elite Herren/Elite Damen gender checks
        if (config.name.toLowerCase().includes('herren') && runner.gender !== 'M') return false;
        if (config.name.toLowerCase().includes('damen') && runner.gender !== 'W') return false;
      }
    }

    return true;
  });

  // Re-map positions within the filtered category
  const finishersCount = filteredStandings.filter(f => f.elapsedMs !== Infinity).length;
  filteredStandings.forEach((f, idx) => {
    if (f.elapsedMs !== Infinity) {
      f.pos = idx + 1;
    }
  });

  return (
    <div className="flex-1 flex flex-col w-full h-full select-none">
      
      {/* Header section matches image 6 */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-black mb-1">Live Rangliste</h2>
          <p className="text-xs text-[#585f6c] font-sans">Offizielle Ergebnisse &amp; Telemetrie-Auswertung aus CSV-Rennzeiten.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handlePrint}
            className="border border-[#cfc4c5] bg-transparent text-black hover:bg-neutral-100 transition-colors px-4 py-2 text-xs font-mono rounded flex items-center space-x-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Drucken</span>
          </button>
          <button
            onClick={handleDownloadCSV}
            className="bg-black text-white hover:bg-neutral-800 transition-colors px-4 py-2 text-xs font-mono rounded flex items-center space-x-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>CSV Export</span>
          </button>
        </div>
      </header>

      {/* Control filter panel matches mockup */}
      <section className="bg-white border border-[#cfc4c5] p-6 mb-8 rounded shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          
          {/* Race Selection file search selection */}
          <div className="col-span-1 md:col-span-2">
            <label className="block font-sans text-xs text-[#585f6c] mb-2 uppercase font-semibold">Datenquelle (CSV)</label>
            <div className="relative">
              <select
                value={selectedRace}
                onChange={(e) => {
                  const newRace = e.target.value;
                  setSelectedRace(newRace);
                  setActiveRace(newRace);
                  onRefreshRaceEvents(newRace);
                }}
                className="block w-full pl-3 pr-10 py-2.5 text-xs font-mono border border-[#cfc4c5] bg-[#ffffff] text-black focus:outline-none focus:border-black rounded appearance-none cursor-pointer"
              >
                {races.map((r, i) => (
                  <option key={i} value={r}>📁 {r}.csv</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category range selector */}
          <div>
            <label className="block font-sans text-xs text-[#585f6c] mb-2 uppercase font-semibold">Kategorie</label>
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full pl-3 pr-10 py-2.5 text-xs font-mono border border-[#cfc4c5] bg-[#ffffff] text-black focus:outline-none focus:border-black rounded appearance-none cursor-pointer"
              >
                <option value="Alle">Alle Kategorien</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.minYear}-{c.maxYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Year filtering ranges requested */}
          <div>
            <label className="block font-sans text-xs text-[#585f6c] mb-2 uppercase font-semibold">Jahrgang</label>
            <div className="relative">
              <select
                value={selectedYearRange}
                onChange={(e) => setSelectedYearRange(e.target.value)}
                className="block w-full pl-3 pr-10 py-2.5 text-xs font-mono border border-[#cfc4c5] bg-[#ffffff] text-black focus:outline-none focus:border-black rounded appearance-none cursor-pointer"
              >
                <option value="Alle">Alle</option>
                <option value="2000 - 2005">2000 - 2005</option>
                <option value="1995 - 1999">1995 - 1999</option>
                <option value="Vor 1995">Vor 1995</option>
              </select>
            </div>
          </div>

        </div>
      </section>

      {/* Dynamic Category Configuration (Year ranges and titles form editor) */}
      <section className="bg-neutral-50 border border-[#cfc4c5] p-5 mb-8 rounded print:hidden">
        <h4 className="font-sans text-xs font-extrabold text-[#585f6c] uppercase mb-4 tracking-widest flex items-center gap-2">
          🔧 Kategorien-Konstrukteur &amp; JG-Bereiche
        </h4>

        {/* Existing categories with delete tag */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <div
              key={c.name}
              className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-[#cfc4c5] rounded text-xs font-mono text-black"
            >
              <span>{c.name}</span>
              <span className="text-[#5c5c5c] font-bold">({c.minYear}-{c.maxYear})</span>
              <button
                type="button"
                onClick={() => handleRemoveCategory(c.name)}
                className="text-red-500 hover:text-red-800 ml-1 font-bold cursor-pointer"
                title="Kategorie löschen"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Form to insert new age boundary categories dynamically as requested */}
        <form onSubmit={handleAddCategory} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[10px] uppercase font-mono text-[#585f6c] mb-1">Kategorie Name</label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Junioren"
              className="p-2 text-xs font-sans border border-[#cfc4c5] rounded w-full bg-white text-black"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-mono text-[#585f6c] mb-1">Jahrgang von (Min)</label>
            <input
              type="number"
              required
              value={newCatMin}
              onChange={(e) => setNewCatMin(parseInt(e.target.value))}
              className="p-2 text-xs font-mono border border-[#cfc4c5] rounded w-full bg-white text-black"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-mono text-[#585f6c] mb-1">Jahrgang bis (Max)</label>
            <input
              type="number"
              required
              value={newCatMax}
              onChange={(e) => setNewCatMax(parseInt(e.target.value))}
              className="p-2 text-xs font-mono border border-[#cfc4c5] rounded w-full bg-white text-black"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white hover:bg-[#e2e2e2] text-black border border-black font-mono text-xs py-2 px-4 rounded transition-colors cursor-pointer"
          >
            ➕ Kategorie hinzufügen
          </button>
        </form>
      </section>

      {/* Results Standing Board matches image 6 precise colors */}
      <div className="bg-white border border-[#cfc4c5] rounded-lg overflow-hidden flex-1 flex flex-col">
        {/* Printable header */}
        <div className="hidden print:block p-6 text-center border-b border-gray-400">
          <h1 className="font-sans text-3xl font-black text-black uppercase">{selectedRace}</h1>
          <p className="font-mono text-xs mt-2 text-gray-500">Offizielles Rennergebnis • AeroTrackTiming UHF System</p>
          <div className="mt-4 flex justify-between text-xs font-mono">
            <span>Kategorie: {selectedCategory}</span>
            <span>Jahrgänge: {selectedYearRange}</span>
            <span>Gedruckt am: {new Date().toLocaleDateString('de-DE')}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#cfc4c5]">
            <thead className="bg-[#f3f3f3] select-none text-left font-mono text-[11px] text-[#585f6c]">
              <tr>
                <th className="px-6 py-4 w-16">POS</th>
                <th className="px-6 py-4 w-24">START-NR.</th>
                <th className="px-6 py-4">ATHLET NAME / TEAM</th>
                <th className="px-6 py-4">KATEGORISIERUNG</th>
                <th className="px-6 py-4 text-right">ZEIT (BRUTTO)</th>
                <th className="px-6 py-4 text-right">DIFFERENZ (DIFF)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e2e2] bg-[#ffffff] font-sans">
              {filteredStandings.map((stand, idx) => {
                const isLeader = idx === 0 && stand.elapsedMs !== Infinity;
                const isFinished = stand.elapsedMs !== Infinity;
                
                // compute category label
                const birthYear = parseInt(stand.geburtsdatum.split('-')[0]) || 1990;
                const matchingCat = categories.find(c => {
                  if (birthYear < c.minYear || birthYear > c.maxYear) return false;
                  if (c.name.toLowerCase().includes('herren') && stand.gender !== 'M') return false;
                  if (c.name.toLowerCase().includes('damen') && stand.gender !== 'W') return false;
                  return true;
                });
                const catLabel = matchingCat ? matchingCat.name : (stand.gender === 'M' ? 'Herren' : 'Damen');

                return (
                  <tr
                    key={stand.startnummer}
                    className={`hover:bg-[#f3f3f3]/50 transition-colors cursor-default ${
                      isLeader ? 'bg-[#e2e2e2]/70 font-bold' : ''
                    } ${!isFinished ? 'bg-[#fafafa]' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isLeader ? (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-[#ffffff] font-mono text-xs font-bold shadow-sm">
                          1
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-black px-2">{isFinished ? stand.pos : '-'}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-xs text-black bg-[#eeeeee] px-2 py-1 border border-[#cfc4c5]">
                        #{stand.startnummer}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-black">{stand.name}, {stand.vorname}</div>
                      <div className="font-mono text-[10px] text-[#585f6c] mt-1">{stand.wohnort} • {stand.geburtsdatum}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 inline-flex text-[10px] leading-4 font-semibold rounded bg-neutral-100 text-black border border-[#cfc4c5]">
                        {catLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm">
                      <span className={isLeader ? 'text-black font-bold' : (!isFinished ? 'text-red-500 font-bold' : 'text-neutral-800')}>
                        {stand.elapsedLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-xs text-neutral-600">
                      {isFinished ? (isLeader ? '-' : <span className="text-red-600 font-semibold">{stand.diffLabel}</span>) : '-'}
                    </td>
                  </tr>
                );
              })}
              {filteredStandings.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#585f6c] font-mono text-xs">
                    Keine Resultate für dieses Rennen mit den gewählten Filter-Kriterien vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Results page footer matches image 6 count footer */}
        <div className="bg-[#f3f3f3] px-6 py-3 border-t border-[#cfc4c5] flex items-center justify-between print:hidden">
          <div className="font-mono text-[10px] text-[#585f6c]">
            Anzeige: {filteredStandings.length} von {allStandings.length} Gesamteinträgen der Quelle
          </div>
          <div className="flex gap-2">
            <span className="font-mono text-[9px] text-gray-500">AeroTrack • Offizielle Zeitprüfung</span>
          </div>
        </div>
      </div>
    </div>
  );
}
