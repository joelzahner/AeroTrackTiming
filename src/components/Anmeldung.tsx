import React, { useState } from 'react';
import { Registration } from '../types';

interface AnmeldungProps {
  registrations: Registration[];
  onAddRegistration: (reg: Registration) => void;
  onRefresh: () => void;
}

export default function Anmeldung({ registrations, onAddRegistration, onRefresh }: AnmeldungProps) {
  const [vorname, setVorname] = useState('');
  const [name, setName] = useState('');
  const [startnummer, setStartnummer] = useState('');
  const [geburtsdatum, setGeburtsdatum] = useState('');
  const [wohnort, setWohnort] = useState('');
  const [gender, setGender] = useState<'M' | 'W'>('W');
  const [club, setClub] = useState(false);
  const [search, setSearch] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vorname.trim() || !name.trim() || !startnummer.trim()) {
      alert('Vorname, Name und Startnummer sind Pflichfelder!');
      return;
    }

    // Check if startnummer is already taken
    const exists = registrations.some(r => r.startnummer === startnummer);
    if (exists) {
      if (!confirm(`Die Startnummer ${startnummer} ist bereits vergeben. Möchten Sie diese trotzdem eintragen?`)) {
        return;
      }
    }

    const reg: Registration = {
      vorname: vorname.trim(),
      name: name.trim(),
      geburtsdatum: geburtsdatum || '1990-01-01',
      startnummer: startnummer.trim(),
      wohnort: wohnort.trim() || 'Unbekannt',
      gender,
      club
    };

    onAddRegistration(reg);

    // Reset Form
    setVorname('');
    setName('');
    setStartnummer('');
    setGeburtsdatum('');
    setWohnort('');
    setGender('W');
    setClub(false);
  };

  const handleDownloadCSV = () => {
    const csvContent = "vorname,name,geburtsdatum,startnummer,wohnort,gender,club\n" + 
      registrations.map(r => `${r.vorname},${r.name},${r.geburtsdatum},${r.startnummer},${r.wohnort},${r.gender},${r.club}`).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'registrations.csv');
    a.click();
  };

  const filtered = registrations.filter(r => {
    const s = search.toLowerCase();
    return (
      r.vorname.toLowerCase().includes(s) ||
      r.name.toLowerCase().includes(s) ||
      r.startnummer.toLowerCase().includes(s) ||
      r.wohnort.toLowerCase().includes(s)
    );
  });

  return (
    <div className="flex-1 flex flex-col w-full h-full">
      {/* Search Header */}
      <div className="flex justify-between items-center mb-6 w-full shrink-0">
        <h2 className="font-sans text-xl font-black text-black">Teilnehmer-Anmeldung</h2>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ fontSize: '18px' }}>
            search
          </span>
          <input
            type="text"
            placeholder="Start-Nr. oder Name Suche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-white border border-[#cfc4c5] rounded font-sans text-xs focus:ring-0 focus:border-black outline-none w-64 text-black"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[1280px] mx-auto flex-1 items-stretch">
        {/* Left Column: Form Card */}
        <div className="lg:col-span-4 flex flex-col">
          <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded-lg p-6 flex flex-col h-full justify-between">
            <div className="mb-6 flex items-center justify-between border-b border-[#e2e2e2] pb-4">
              <div>
                <h2 className="font-sans text-lg font-bold text-black leading-tight">Neue Anmeldung</h2>
                <p className="font-mono text-[10px] text-[#585f6c] mt-1">Teilnehmer manuell erfassen</p>
              </div>
              <span className="material-symbols-outlined text-[#7e7576]">person_add</span>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-sans text-[11px] font-bold text-[#5c5c5c] mb-1">Vorname *</label>
                  <input
                    type="text"
                    required
                    value={vorname}
                    onChange={(e) => setVorname(e.target.value)}
                    placeholder="Erika"
                    className="bg-transparent border-b border-[#7e7576] font-sans text-sm py-1 focus:border-black outline-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-sans text-[11px] font-bold text-[#5c5c5c] mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mustermann"
                    className="bg-transparent border-b border-[#7e7576] font-sans text-sm py-1 focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="font-sans text-[11px] font-bold text-[#5c5c5c] mb-1">Startnummer *</label>
                  <input
                    type="text"
                    required
                    value={startnummer}
                    onChange={(e) => setStartnummer(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="001"
                    className="bg-transparent border-b border-[#7e7576] font-mono text-sm py-1 font-bold text-black focus:border-black outline-none"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="font-sans text-[11px] font-bold text-[#5c5c5c] mb-1">Geburtsdatum</label>
                  <input
                    type="date"
                    value={geburtsdatum}
                    onChange={(e) => setGeburtsdatum(e.target.value)}
                    className="bg-transparent border-b border-[#7e7576] font-mono text-xs py-1 focus:border-black outline-none text-black"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <label className="font-sans text-[11px] font-bold text-[#5c5c5c] mb-1">Wohnort</label>
                <input
                  type="text"
                  value={wohnort}
                  onChange={(e) => setWohnort(e.target.value)}
                  placeholder="Zürich"
                  className="bg-transparent border-b border-[#7e7576] font-sans text-sm py-1 focus:border-black outline-none"
                />
              </div>

              <div className="flex flex-col pt-2">
                <label className="font-sans text-[11px] font-bold text-[#5c5c5c] mb-2">Geschlecht</label>
                <div className="flex space-x-6">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="gender"
                      value="W"
                      checked={gender === 'W'}
                      onChange={() => setGender('W')}
                      className="hidden peer"
                    />
                    <div className="w-4 h-4 rounded-full border border-[#7e7576] peer-checked:border-black peer-checked:border-4 transition-all mr-2 flex items-center justify-center"></div>
                    <span className="font-sans text-sm text-black group-hover:text-neutral-900 transition-colors">Weiblich</span>
                  </label>
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="gender"
                      value="M"
                      checked={gender === 'M'}
                      onChange={() => setGender('M')}
                      className="hidden peer"
                    />
                    <div className="w-4 h-4 rounded-full border border-[#7e7576] peer-checked:border-black peer-checked:border-4 transition-all mr-2 flex items-center justify-center"></div>
                    <span className="font-sans text-sm text-black group-hover:text-neutral-900 transition-colors">Männlich</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col pt-2 border-t border-[#e2e2e2] mt-4">
                <label className="flex items-center cursor-pointer group py-2">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={club}
                      onChange={(e) => setClub(e.target.checked)}
                      className="peer appearance-none w-4 h-4 border border-[#7e7576] rounded-[2px] checked:bg-black checked:border-black transition-colors cursor-pointer"
                    />
                    <span className="material-symbols-outlined absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" style={{ fontSize: '14px' }}>
                      check
                    </span>
                  </div>
                  <span className="font-sans text-sm text-black ml-3 group-hover:text-neutral-900 transition-colors">
                    Clubmitglied
                  </span>
                </label>
              </div>

              <div className="pt-6 mt-auto">
                <button
                  type="submit"
                  className="w-full bg-black hover:bg-neutral-800 text-white font-mono text-xs font-bold py-3.5 rounded flex items-center justify-center space-x-2 transition-all cursor-pointer active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  <span>Speichern &amp; Export</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: List Card */}
        <div className="lg:col-span-8 flex flex-col">
          <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded-lg flex-1 flex flex-col overflow-hidden h-full min-h-[480px]">
            {/* Table Toolbar */}
            <div className="p-6 border-b border-[#cfc4c5] flex justify-between items-end bg-[#ffffff]">
              <div>
                <h3 className="font-mono text-xs text-[#585f6c] uppercase tracking-widest mb-1">Meldeliste (registrations.csv)</h3>
                <div className="flex items-center space-x-2">
                  <span className="font-sans text-3xl font-bold text-black">{filtered.length}</span>
                  <span className="font-sans text-sm text-[#585f6c]">von {registrations.length} Starter registriert</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleDownloadCSV}
                  className="p-2 border border-[#cfc4c5] rounded hover:bg-gray-100 transition-colors text-[#585f6c] hover:text-black flex items-center cursor-pointer"
                  title="Meldeliste als CSV exportieren"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                </button>
                <button
                  onClick={onRefresh}
                  className="p-2 border border-[#cfc4c5] rounded hover:bg-gray-100 transition-colors text-[#585f6c] hover:text-black flex items-center cursor-pointer"
                  title="Meldeliste neu laden"
                >
                  <span className="material-symbols-outlined text-lg">refresh</span>
                </button>
              </div>
            </div>

            {/* Table body */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f9f9f9] sticky top-0 z-10 border-b border-[#cfc4c5]">
                  <tr>
                    <th className="py-3 px-6 font-mono text-xs text-[#585f6c] w-20">St.-Nr.</th>
                    <th className="py-3 px-6 font-mono text-xs text-[#585f6c]">Name</th>
                    <th className="py-3 px-6 font-mono text-xs text-[#585f6c] w-24">Geburtstag</th>
                    <th className="py-3 px-6 font-mono text-xs text-[#585f6c]">Wohnort</th>
                    <th className="py-3 px-6 font-mono text-xs text-[#585f6c] w-16">M/W</th>
                    <th className="py-3 px-6 font-mono text-xs text-[#585f6c] text-right w-24">Club</th>
                  </tr>
                </thead>
                <tbody className="font-sans text-sm">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center font-mono text-xs text-[#585f6c]">
                        Keine Registrierungen gefunden. Füllen Sie das Anmeldeformular links aus.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-[#e2e2e2] hover:bg-neutral-50 transition-colors cursor-default ${
                          idx % 2 === 1 ? 'bg-[#ffffff]' : 'bg-[#fafafa]'
                        }`}
                      >
                        <td className="py-3 px-6 font-mono font-bold text-black">{r.startnummer}</td>
                        <td className="py-3 px-6 text-black font-medium">{r.name}, {r.vorname}</td>
                        <td className="py-3 px-6 font-mono text-xs text-[#585f6c]">{r.geburtsdatum}</td>
                        <td className="py-3 px-6 text-black">{r.wohnort}</td>
                        <td className="py-3 px-6 font-mono text-xs text-[#585f6c]">{r.gender}</td>
                        <td className="py-3 px-6 text-right">
                          {r.club ? (
                            <span className="material-symbols-outlined text-green-500 text-lg align-middle" style={{ fontVariationSettings: "'FILL' 1" }}>
                              check_circle
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-gray-300 text-lg align-middle">
                              horizontal_rule
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
