import React, { useState, useEffect } from 'react';
import { Registration, RaceEvent, CategoryConfig } from '../types';

interface RanglisteProps {
  races: string[];
  registrations: Registration[];
  activeRace: string;
  setActiveRace: (race: string) => void;
  raceEvents: RaceEvent[];
  onRefreshRaceEvents: (raceName: string) => void;
}

interface OverallFinisherResult {
  pos?: number;
  startnummer: string;
  name: string;
  vorname: string;
  gender: 'M' | 'W';
  geburtsdatum: string;
  wohnort: string;
  club: boolean;
  raceTimes: Array<{ raceName: string; elapsedLabel: string; elapsedMs: number }>;
  totalMs: number;
  totalLabel: string;
  diffLabel: string;
}

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
export function getCategoryGender(cat: CategoryConfig): 'M' | 'W' | 'Alle' {
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

export default function Rangliste({
  races,
  registrations,
  activeRace,
  setActiveRace,
  raceEvents,
  onRefreshRaceEvents
}: RanglisteProps) {
  // Selected races checkboxes
  const [selectedRaces, setSelectedRaces] = useState<string[]>(activeRace ? [activeRace] : races.slice(0, 1));
  const [raceDistances, setRaceDistances] = useState<Record<string, number>>({});
  
  // Dynamic categories with localStorage persistence. Defaults to empty [].
  const [categories, setCategories] = useState<CategoryConfig[]>(() => {
    const saved = localStorage.getItem('aerotrack_categories');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('Alle');
  const [activeViewTab, setActiveViewTab] = useState<string>('');
  const [allRacesEvents, setAllRacesEvents] = useState<Record<string, RaceEvent[]>>({});

  // Category creation states
  const [newCatName, setNewCatName] = useState('');
  const [newCatMin, setNewCatMin] = useState(1990);
  const [newCatMax, setNewCatMax] = useState(2005);
  const [newCatClub, setNewCatClub] = useState<'Ja' | 'Nein'>('Ja');
  const [newCatGender, setNewCatGender] = useState<'M' | 'W' | 'Alle'>('Alle');

  // Persistence of categories
  useEffect(() => {
    localStorage.setItem('aerotrack_categories', JSON.stringify(categories));
  }, [categories]);

  // Fetch all race distances
  useEffect(() => {
    const fetchDistances = async () => {
      try {
        const res = await fetch('/api/races-metadata');
        if (res.ok) {
          const data = await res.json();
          const dists: Record<string, number> = {};
          Object.keys(data).forEach(k => {
            dists[k] = Number(data[k].distance) || 0;
          });
          setRaceDistances(dists);
        }
      } catch (err) {
        console.error("Failed to fetch race distances metadata:", err);
      }
    };
    fetchDistances();
  }, [races]);

  // Fetch race events for all selected races
  useEffect(() => {
    const fetchAllEvents = async () => {
      const newEvents: Record<string, RaceEvent[]> = {};
      for (const raceName of selectedRaces) {
        try {
          const res = await fetch(`/api/races/${encodeURIComponent(raceName)}`);
          if (res.ok) {
            newEvents[raceName] = await res.json();
          }
        } catch (err) {
          console.error(`Failed to fetch events for race ${raceName}:`, err);
        }
      }
      setAllRacesEvents(newEvents);
    };
    if (selectedRaces.length > 0) {
      fetchAllEvents();
    } else {
      setAllRacesEvents({});
    }
  }, [selectedRaces]);

  // Configure view tabs (Selected races + Gesamtwertung if multiple)
  const viewTabs = [...selectedRaces];
  if (selectedRaces.length > 1) {
    viewTabs.push("Gesamtwertung");
  }

  // Ensure active view tab is valid
  useEffect(() => {
    if (viewTabs.length > 0 && !viewTabs.includes(activeViewTab)) {
      setActiveViewTab(viewTabs[0]);
    }
  }, [selectedRaces, activeViewTab, viewTabs]);

  const handleSaveDistance = async (raceName: string, distance: number) => {
    setRaceDistances(prev => ({ ...prev, [raceName]: distance }));
    try {
      await fetch(`/api/races/${encodeURIComponent(raceName)}/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distance }),
      });
    } catch (err) {
      console.error("Failed to save race distance:", err);
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCategories(prev => [
      ...prev.filter(c => c.name.toLowerCase() !== newCatName.trim().toLowerCase()),
      {
        name: newCatName.trim(),
        minYear: newCatMin,
        maxYear: newCatMax,
        club: newCatClub,
        gender: newCatGender
      }
    ]);
    setNewCatName('');
  };

  const handleRemoveCategory = (name: string) => {
    setCategories((prev) => prev.filter((c) => c.name !== name));
    if (selectedCategory === name) {
      setSelectedCategory('Alle');
    }
  };

  const handleDownloadExcel = async () => {
    if (selectedRaces.length === 0) {
      alert("Bitte wählen Sie mindestens ein Rennen aus.");
      return;
    }
    try {
      const res = await fetch('/api/races/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedRaces,
          categories
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rangliste_${selectedRaces.join('_')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Fehler beim Erstellen der Excel-Datei.');
      }
    } catch (err) {
      console.error("Failed to download Excel file:", err);
      alert('Download fehlgeschlagen.');
    }
  };

  // Convert race events into parsed timing stats for a single race
  const getProcessedStandingsForRace = (raceName: string): any[] => {
    const events = allRacesEvents[raceName] || [];
    const bibs = Array.from(new Set(events.map(e => e.startnummer)));
    const list: any[] = [];

    bibs.forEach((bib) => {
      const startEvt = events.filter(e => e.startnummer === bib && e.typ === 'START').sort((a,b) => Number(a.exactMs) - Number(b.exactMs))[0];
      const finishEvts = events.filter(e => e.startnummer === bib && e.typ === 'ZIEL').sort((a,b) => Number(a.exactMs) - Number(b.exactMs));
      const finishEvt = finishEvts[finishEvts.length - 1];

      const athlete = registrations.find(r => r.startnummer === bib);
      
      const startMs = startEvt ? Number(startEvt.exactMs) : undefined;
      const finishMs = finishEvt ? Number(finishEvt.exactMs) : undefined;
      const elapsedMs = (startMs && finishMs) ? (finishMs - startMs) : Infinity;

      list.push({
        startnummer: bib,
        name: athlete ? athlete.name : 'Gastschreiber',
        vorname: athlete ? athlete.vorname : `#${bib}`,
        gender: athlete ? athlete.gender : 'M',
        geburtsdatum: athlete ? athlete.geburtsdatum : '1990',
        wohnort: athlete ? athlete.wohnort : 'Extern',
        club: athlete ? athlete.club : false,
        elapsedMs,
        elapsedLabel: elapsedMs === Infinity ? "DNF" : formatElapsed(elapsedMs),
        diffLabel: '-'
      });
    });

    return list;
  };

  const getFilteredStandings = (standings: any[]): any[] => {
    if (selectedCategory === 'Alle') {
      const finishers = standings.filter(f => f.elapsedMs !== Infinity).sort((a, b) => a.elapsedMs - b.elapsedMs);
      const dnfs = standings.filter(f => f.elapsedMs === Infinity);
      finishers.forEach((runner, idx) => {
        runner.pos = idx + 1;
        runner.diffLabel = idx === 0 ? "-" : formatDiff(runner.elapsedMs - finishers[0].elapsedMs);
      });
      dnfs.forEach(runner => {
        runner.pos = undefined;
        runner.diffLabel = "-";
      });
      return [...finishers, ...dnfs];
    }

    const cat = categories.find(c => c.name === selectedCategory);
    if (!cat) return [];

    const filtered = standings.filter(runner => {
      const birthYear = parseInt(runner.geburtsdatum.split('-')[0]) || 1990;
      if (birthYear < cat.minYear || birthYear > cat.maxYear) return false;
      
      if (cat.club === "Ja" && !runner.club) return false;
      if (cat.club === "Nein" && runner.club) return false;
      
      const catGender = getCategoryGender(cat);
      if (catGender !== "Alle" && runner.gender !== catGender) return false;

      return true;
    });

    const finishers = filtered.filter(f => f.elapsedMs !== Infinity).sort((a, b) => a.elapsedMs - b.elapsedMs);
    const dnfs = filtered.filter(f => f.elapsedMs === Infinity);

    finishers.forEach((runner, idx) => {
      runner.pos = idx + 1;
      runner.diffLabel = idx === 0 ? "-" : formatDiff(runner.elapsedMs - finishers[0].elapsedMs);
    });
    dnfs.forEach(runner => {
      runner.pos = undefined;
      runner.diffLabel = "-";
    });

    return [...finishers, ...dnfs];
  };

  // Compile Overall Standings (Gesamtwertung)
  const getProcessedOverallStandings = (): OverallFinisherResult[] => {
    const bibsInSelectedRaces = new Set<string>();
    selectedRaces.forEach(rName => {
      const evts = allRacesEvents[rName] || [];
      evts.forEach(e => bibsInSelectedRaces.add(e.startnummer));
    });
    registrations.forEach(r => bibsInSelectedRaces.add(r.startnummer));

    const list: OverallFinisherResult[] = [];

    bibsInSelectedRaces.forEach(bib => {
      const athlete = registrations.find(r => r.startnummer === bib);
      
      let totalMs = 0;
      let dnfAny = false;
      const raceTimes = selectedRaces.map(rName => {
        const standings = getProcessedStandingsForRace(rName);
        const standing = standings.find(s => s.startnummer === bib);
        const ms = standing ? standing.elapsedMs : Infinity;
        if (ms === Infinity) dnfAny = true;
        return {
          raceName: rName,
          elapsedLabel: ms === Infinity ? "DNF" : formatElapsed(ms),
          elapsedMs: ms
        };
      });

      if (dnfAny) {
        totalMs = Infinity;
      } else {
        totalMs = raceTimes.reduce((sum, rt) => sum + rt.elapsedMs, 0);
      }

      list.push({
        startnummer: bib,
        name: athlete ? athlete.name : 'Gastschreiber',
        vorname: athlete ? athlete.vorname : `#${bib}`,
        gender: athlete ? athlete.gender : 'M',
        geburtsdatum: athlete ? athlete.geburtsdatum : '1990',
        wohnort: athlete ? athlete.wohnort : 'Extern',
        club: athlete ? athlete.club : false,
        raceTimes,
        totalMs,
        totalLabel: totalMs === Infinity ? "DNF" : formatElapsed(totalMs),
        diffLabel: '-'
      });
    });

    return list;
  };

  const getFilteredOverallStandings = (overallStandings: OverallFinisherResult[]): OverallFinisherResult[] => {
    if (selectedCategory === 'Alle') {
      const finishers = overallStandings.filter(f => f.totalMs !== Infinity).sort((a, b) => a.totalMs - b.totalMs);
      const dnfs = overallStandings.filter(f => f.totalMs === Infinity);
      finishers.forEach((runner, idx) => {
        runner.pos = idx + 1;
        runner.diffLabel = idx === 0 ? "-" : formatDiff(runner.totalMs - finishers[0].totalMs);
      });
      dnfs.forEach(runner => {
        runner.pos = undefined;
        runner.diffLabel = "-";
      });
      return [...finishers, ...dnfs];
    }

    const cat = categories.find(c => c.name === selectedCategory);
    if (!cat) return [];

    const filtered = overallStandings.filter(runner => {
      const birthYear = parseInt(runner.geburtsdatum.split('-')[0]) || 1990;
      if (birthYear < cat.minYear || birthYear > cat.maxYear) return false;
      
      if (cat.club === "Ja" && !runner.club) return false;
      if (cat.club === "Nein" && runner.club) return false;
      
      const catGender = getCategoryGender(cat);
      if (catGender !== "Alle" && runner.gender !== catGender) return false;

      return true;
    });

    const finishers = filtered.filter(f => f.totalMs !== Infinity).sort((a, b) => a.totalMs - b.totalMs);
    const dnfs = filtered.filter(f => f.totalMs === Infinity);

    finishers.forEach((runner, idx) => {
      runner.pos = idx + 1;
      runner.diffLabel = idx === 0 ? "-" : formatDiff(runner.totalMs - finishers[0].totalMs);
    });
    dnfs.forEach(runner => {
      runner.pos = undefined;
      runner.diffLabel = "-";
    });

    return [...finishers, ...dnfs];
  };

  // Compile active standings based on tab
  const isOverallTab = activeViewTab === "Gesamtwertung";
  const rawStandings = isOverallTab ? [] : getProcessedStandingsForRace(activeViewTab);
  const activeStandings = isOverallTab 
    ? getFilteredOverallStandings(getProcessedOverallStandings())
    : getFilteredStandings(rawStandings);

  const totalPossibleItems = isOverallTab 
    ? getProcessedOverallStandings().length 
    : rawStandings.length;

  return (
    <div className="flex-1 flex flex-col w-full h-full select-none">
      
      {/* Header section matches design system */}
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="font-sans text-xl font-bold tracking-tight text-black mb-1">Offizielle Rangliste</h2>
          <p className="text-xs text-[#585f6c] font-sans">Ergebnisse, Telemetrie-Auswertung &amp; kombinierte Gesamtwertung aus CSV-Dateien.</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleDownloadExcel}
            className="bg-black text-white hover:bg-neutral-800 transition-colors px-4 py-2 text-xs font-mono rounded flex items-center space-x-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Excel Export (.xlsx)</span>
          </button>
        </div>
      </header>

      {/* Control filter panel (Rennen selection & Category/Jahrgang selections) */}
      <section className="bg-white border border-[#cfc4c5] p-6 mb-8 rounded shadow-sm print:hidden">
        <div className="grid grid-cols-1 gap-6">
          
          {/* Race selection list with checkboxes and distance inputs */}
          <div>
            <label className="block font-sans text-xs text-[#585f6c] mb-2 uppercase font-semibold">Rennen für die Auswertung auswählen</label>
            <div className="grid grid-cols-1 gap-2.5 bg-[#ffffff] border border-[#cfc4c5] p-4 rounded max-h-48 overflow-y-auto font-mono text-xs">
              {races.map((raceName) => {
                const isSelected = selectedRaces.includes(raceName);
                return (
                  <div key={raceName} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#fafafa] pb-2 last:border-b-0 gap-2">
                    <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRaces([...selectedRaces, raceName]);
                          } else {
                            setSelectedRaces(selectedRaces.filter(r => r !== raceName));
                          }
                        }}
                        className="rounded border-[#cfc4c5] text-black focus:ring-0 cursor-pointer"
                      />
                      <span className="font-semibold text-black">🏁 {raceName}</span>
                    </label>
                    {isSelected && (
                      <div className="flex items-center space-x-2 self-end sm:self-auto">
                        <span className="text-[10px] text-neutral-500 font-sans">Renn-Distanz (Meter):</span>
                        <input
                          type="number"
                          value={raceDistances[raceName] || ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            handleSaveDistance(raceName, val);
                          }}
                          placeholder="z.B. 5000"
                          className="w-20 p-1 text-[11px] font-mono border border-[#cfc4c5] rounded bg-[#fafafa] text-black text-right focus:outline-none focus:border-black"
                        />
                        <span className="text-[11px] text-neutral-600 font-sans font-bold w-20 text-left">
                          {raceDistances[raceName] ? `(${formatDistance(raceDistances[raceName])})` : "(nicht def.)"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
              {races.length === 0 && (
                <div className="text-[#585f6c] py-2">Keine Rennen vorhanden. Erstellen Sie zuerst ein Rennen.</div>
              )}
            </div>
          </div>

          {/* Filtering row: Category select dropdown */}
          <div className="border-t border-[#e2e2e2] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block font-sans text-xs text-[#585f6c] mb-2 uppercase font-semibold">Aktive Kategorie filtern</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full pl-3 pr-10 py-2.5 text-xs font-mono border border-[#cfc4c5] bg-[#ffffff] text-black focus:outline-none focus:border-black rounded appearance-none cursor-pointer"
              >
                <option value="Alle">Alle Kategorien</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} ({c.minYear}-{c.maxYear}) • {c.club === 'Ja' ? 'Club' : 'Gast'} • {getCategoryGender(c) === 'M' ? 'Männer' : getCategoryGender(c) === 'W' ? 'Frauen' : 'Alle'}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-right text-[11px] text-[#585f6c] font-sans pb-2">
              Verknüpft: {selectedRaces.length} Rennen ausgewertet.
            </div>
          </div>

        </div>
      </section>

      {/* Categories Builder Section (Custom categories editor) */}
      <section className="bg-neutral-50 border border-[#cfc4c5] p-5 mb-8 rounded print:hidden">
        <h4 className="font-sans text-xs font-extrabold text-[#585f6c] uppercase mb-4 tracking-widest flex items-center gap-2">
          🔧 Kategorien-Konstrukteur (Filter regeln)
        </h4>

        {/* Existing categories list */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <div
              key={c.name}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#cfc4c5] rounded text-xs font-mono text-black"
            >
              <span>{c.name}</span>
              <span className="text-[#5c5c5c] font-bold">({c.minYear}-{c.maxYear})</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans bg-blue-50 text-blue-800`}>
                {c.club === 'Ja' ? 'Club' : 'Gast'}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans bg-gray-100 text-gray-800`}>
                {getCategoryGender(c) === 'M' ? 'Männer' : getCategoryGender(c) === 'W' ? 'Frauen' : 'Beide'}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveCategory(c.name)}
                className="text-red-500 hover:text-red-800 ml-1 font-bold cursor-pointer text-sm"
                title="Kategorie löschen"
              >
                ×
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-xs italic text-[#585f6c] font-sans">
              Keine Kategorien hinterlegt. Alle Auswertungen werden standardmässig ungefiltert gelistet.
            </div>
          )}
        </div>

        {/* Form to insert new categories */}
        <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end border-t border-[#e2e2e2]/60 pt-4">
          <div>
            <label className="block text-[10px] uppercase font-mono text-[#585f6c] mb-1">Kategorie Name</label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. U19 Herren"
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
          <div>
            <label className="block text-[10px] uppercase font-mono text-[#585f6c] mb-1">Clubmitglied</label>
            <select
              value={newCatClub}
              onChange={(e) => setNewCatClub(e.target.value as 'Ja' | 'Nein')}
              className="p-2 text-xs font-sans border border-[#cfc4c5] rounded w-full bg-white text-black h-[34px] cursor-pointer"
            >
              <option value="Ja">Ja (Nur Clubmitglieder)</option>
              <option value="Nein">Nein (Nur Gäste)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-mono text-[#585f6c] mb-1">Geschlecht</label>
            <select
              value={newCatGender}
              onChange={(e) => setNewCatGender(e.target.value as 'M' | 'W' | 'Alle')}
              className="p-2 text-xs font-sans border border-[#cfc4c5] rounded w-full bg-white text-black h-[34px] cursor-pointer"
            >
              <option value="Alle">Beide (M/W)</option>
              <option value="M">Männer</option>
              <option value="W">Frauen</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-white hover:bg-[#e2e2e2] text-black border border-black font-mono text-xs py-2 px-3 rounded transition-colors cursor-pointer h-[34px]"
          >
            ➕ Kategorie hinzufügen
          </button>
        </form>
      </section>

      {/* Tab Navigation for Standings View */}
      {selectedRaces.length > 0 && (
        <div className="flex border-b border-[#cfc4c5] mb-4 print:hidden overflow-x-auto shrink-0 scrollbar-none">
          {viewTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveViewTab(tab)}
              className={`px-5 py-2.5 font-sans text-xs font-bold border-t-2 border-x transition-colors -mb-px rounded-t cursor-pointer whitespace-nowrap ${
                activeViewTab === tab
                  ? "border-t-black border-x-[#cfc4c5] bg-white text-black"
                  : "border-t-transparent border-x-transparent bg-[#f9f9f9] text-[#585f6c] hover:text-black"
              }`}
            >
              {tab === "Gesamtwertung" ? "🏆 Gesamtwertung" : `🏁 ${tab}`}
            </button>
          ))}
        </div>
      )}

      {/* Results Standing Board */}
      <div className="bg-white border border-[#cfc4c5] rounded-lg overflow-hidden flex-1 flex flex-col shadow-sm">
        
        {/* Printable & UI Tab Header details */}
        <div className="p-5 border-b border-[#e2e2e2] bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-sans text-sm font-bold text-black uppercase tracking-wider">
              {isOverallTab ? "Gesamtwertung (Gesamt-Rennzeiten)" : `Renn-Ergebnisse: ${activeViewTab}`}
            </h3>
            <div className="text-[10px] font-mono text-neutral-500 mt-0.5">
              Kategorie: {selectedCategory} • Stand: {new Date().toLocaleDateString('de-DE')}
            </div>
          </div>
          {!isOverallTab && activeViewTab && (
            <div className="text-xs font-bold text-black bg-white border border-[#cfc4c5] px-3 py-1.5 rounded">
              Distanz: {raceDistances[activeViewTab] ? formatDistance(raceDistances[activeViewTab]) : "-"}
            </div>
          )}
        </div>

        <div className="overflow-x-auto flex-1">
          {selectedRaces.length === 0 ? (
            <div className="p-12 text-center text-[#585f6c] font-mono text-xs">
              Bitte wählen Sie mindestens ein Rennen aus, um Ergebnisse anzuzeigen.
            </div>
          ) : isOverallTab ? (
            /* RENDERING OVERALL STANDINGS (Gesamtwertung) */
            <table className="min-w-full divide-y divide-[#cfc4c5]">
              <thead className="bg-[#f3f3f3] select-none text-left font-mono text-[11px] text-[#585f6c]">
                <tr>
                  <th className="px-6 py-4 w-16">POS</th>
                  <th className="px-6 py-4 w-24">START-NR.</th>
                  <th className="px-6 py-4">ATHLET NAME / TEAM</th>
                  <th className="px-6 py-4">KATEGORISIERUNG</th>
                  {selectedRaces.map(r => (
                    <th key={r} className="px-6 py-4 text-right">ZEIT {r}</th>
                  ))}
                  <th className="px-6 py-4 text-right">GESAMTZEIT</th>
                  <th className="px-6 py-4 text-right">DIFFERENZ (DIFF)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e2e2] bg-[#ffffff] font-sans">
                {(activeStandings as OverallFinisherResult[]).map((stand, idx) => {
                  const isLeader = idx === 0 && stand.totalMs !== Infinity;
                  const isFinished = stand.totalMs !== Infinity;
                  
                  const birthYear = parseInt(stand.geburtsdatum.split('-')[0]) || 1990;
                  const matchingCat = categories.find(c => {
                    if (birthYear < c.minYear || birthYear > c.maxYear) return false;
                    if (c.club === 'Ja' && !stand.club) return false;
                    if (c.club === 'Nein' && stand.club) return false;
                    const catGender = getCategoryGender(c);
                    if (catGender !== 'Alle' && stand.gender !== catGender) return false;
                    return true;
                  });
                  const catLabel = matchingCat ? matchingCat.name : (stand.club ? 'Clubmitglied' : 'Gast');

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
                        <div className="font-mono text-[10px] text-[#585f6c] mt-1">{stand.wohnort} • JG {birthYear}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-[10px] leading-4 font-semibold rounded bg-neutral-100 text-black border border-[#cfc4c5]">
                          {catLabel}
                        </span>
                      </td>
                      {stand.raceTimes.map((rt, colIdx) => (
                        <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-right font-mono text-xs text-neutral-600">
                          {rt.elapsedLabel}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-sm">
                        <span className={isLeader ? 'text-black font-bold' : (!isFinished ? 'text-red-500 font-bold' : 'text-neutral-800')}>
                          {stand.totalLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-xs text-neutral-600">
                        {isFinished ? (isLeader ? '-' : <span className="text-red-600 font-semibold">{stand.diffLabel}</span>) : '-'}
                      </td>
                    </tr>
                  );
                })}
                {activeStandings.length === 0 && (
                  <tr>
                    <td colSpan={7 + selectedRaces.length} className="p-8 text-center text-[#585f6c] font-mono text-xs">
                      Keine Resultate für dieses Kriterium vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            /* RENDERING INDIVIDUAL RACE STANDINGS */
            <table className="min-w-full divide-y divide-[#cfc4c5]">
              <thead className="bg-[#f3f3f3] select-none text-left font-mono text-[11px] text-[#585f6c]">
                <tr>
                  <th className="px-6 py-4 w-16">POS</th>
                  <th className="px-6 py-4 w-24">START-NR.</th>
                  <th className="px-6 py-4">ATHLET NAME / TEAM</th>
                  <th className="px-6 py-4">KATEGORISIERUNG</th>
                  <th className="px-6 py-4 text-right">ZEIT (BRUTTO)</th>
                  <th className="px-6 py-4 text-right">DIFFERENZ (DIFF)</th>
                  <th className="px-6 py-4 text-right">⌀KM/H</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e2e2] bg-[#ffffff] font-sans">
                {activeStandings.map((stand, idx) => {
                  const isLeader = idx === 0 && stand.elapsedMs !== Infinity;
                  const isFinished = stand.elapsedMs !== Infinity;
                  
                  const birthYear = parseInt(stand.geburtsdatum.split('-')[0]) || 1990;
                  const matchingCat = categories.find(c => {
                    if (birthYear < c.minYear || birthYear > c.maxYear) return false;
                    if (c.club === 'Ja' && !stand.club) return false;
                    if (c.club === 'Nein' && stand.club) return false;
                    const catGender = getCategoryGender(c);
                    if (catGender !== 'Alle' && stand.gender !== catGender) return false;
                    return true;
                  });
                  const catLabel = matchingCat ? matchingCat.name : (stand.club ? 'Clubmitglied' : 'Gast');

                  // Speed calculation
                  const distance = raceDistances[activeViewTab] || 0;
                  const speedLabel = (isFinished && distance > 0)
                    ? ((distance * 3600) / stand.elapsedMs).toFixed(2) + " km/h"
                    : "-";

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
                        <div className="font-mono text-[10px] text-[#585f6c] mt-1">{stand.wohnort} • JG {birthYear}</div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-right font-mono text-xs text-neutral-600">
                        {speedLabel}
                      </td>
                    </tr>
                  );
                })}
                {activeStandings.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#585f6c] font-mono text-xs">
                      Keine Resultate für dieses Kriterium vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Results page footer */}
        <div className="bg-[#f3f3f3] px-6 py-3 border-t border-[#cfc4c5] flex items-center justify-between print:hidden">
          <div className="font-mono text-[10px] text-[#585f6c]">
            Anzeige: {activeStandings.length} von {totalPossibleItems} Gesamteinträgen der Quelle
          </div>
          <div className="flex gap-2">
            <span className="font-mono text-[9px] text-gray-500">AeroTrack Timing Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
