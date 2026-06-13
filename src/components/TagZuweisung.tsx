import React, { useState, useEffect } from 'react';
import { TagAssignment } from '../types';

interface TagZuweisungProps {
  onScanSimulate: (epc: string) => void;
  activeEpc: string;
  setActiveEpc: (epc: string) => void;
  assignments: TagAssignment[];
  onRefresh: () => void;
  onAddAssignment: (startnummer: string, epc: string) => void;
}

export default function TagZuweisung({
  onScanSimulate,
  activeEpc,
  setActiveEpc,
  assignments,
  onRefresh,
  onAddAssignment
}: TagZuweisungProps) {
  const [startnummer, setStartnummer] = useState('');
  const [rssi, setRssi] = useState(-42);

  // Auto-generate some simulated tag scans if none is active
  useEffect(() => {
    if (!activeEpc) {
      setActiveEpc('E280 1160 6000 020B 1500 081D');
    }
  }, [activeEpc, setActiveEpc]);

  const generateRandomEpc = () => {
    const chars = '0123456789ABCDEF';
    let result = 'E280 1160 ';
    // 6 groups of 4 block hex
    result += Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 16)]).join('');
    result += ' ';
    result += Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 16)]).join('');
    result += ' 1500 ';
    result += Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * 16)]).join('');
    
    setActiveEpc(result);
    setRssi(Math.floor(Math.random() * 30) - 65); // -35 to -65 dBm
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startnummer.trim()) {
      alert('Bitte geben Sie eine Startnummer an.');
      return;
    }
    if (!activeEpc.trim()) {
      alert('Kein UHF-RFID Tag erkannt.');
      return;
    }
    
    onAddAssignment(startnummer, activeEpc);
    setStartnummer('');
    // generate next EPC for smooth scanning workflow
    generateRandomEpc();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-[1280px] mx-auto flex-1">
      {/* Left controls */}
      <section className="lg:col-span-4 flex flex-col gap-6">
        <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded p-6 relative overflow-hidden flex flex-col gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gray-200/50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          
          <div>
            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-[#585f6c] uppercase tracking-widest block">Active Scan</span>
            </div>
            
            <div className="mt-4 p-4 bg-white border border-[#cfc4c5] rounded">
              <p className="font-mono text-xs text-[#585f6c] mb-1">Detected EPC</p>
              <p className="font-mono text-lg font-bold text-black tracking-tight break-all cursor-all-all">
                {activeEpc}
              </p>
              <div className="mt-3 flex justify-between items-center border-t border-[#f3f3f3] pt-2">
                <span className="font-mono text-xs text-[#585f6c]">RSSI: {rssi} dBm</span>
                <span className="material-symbols-outlined text-green-500 text-[20px] animate-pulse">sensors</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="font-mono text-xs text-[#585f6c] uppercase tracking-widest block mb-2" htmlFor="startnummer">
                Startnummer
              </label>
              <input
                id="startnummer"
                type="text"
                value={startnummer}
                onChange={(e) => setStartnummer(e.target.value.replace(/[^0-9]/g, ''))}
                autoFocus
                placeholder="000"
                className="w-full bg-white border border-[#cfc4c5] p-3 font-sans text-5xl font-bold text-black text-center focus:outline-none focus:border-black focus:ring-0 rounded"
              />
            </div>

            <button
              id="btn-assign-save"
              type="submit"
              className="w-full bg-black text-white hover:bg-neutral-800 py-4 font-mono text-sm leading-6 transition-colors border border-black rounded flex justify-center items-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>link</span>
              Zuweisen &amp; Speichern
            </button>
          </form>
        </div>

        <div className="bg-[#f9f9f9] border border-[#cfc4c5] rounded p-5 flex items-start gap-4">
          <span className="material-symbols-outlined text-[#585f6c] shrink-0 mt-0.5">info</span>
          <div>
            <p className="font-sans text-sm font-bold text-black mb-1">Pairing Sequenz</p>
            <p className="font-sans text-xs text-[#585f6c] leading-relaxed">
              Transponder über die Antenne führen. Sobald der EPC im Feld erscheint, Startnummer eingeben und bestätigen. Der Datensatz wird gelockt und in der CSV-Datei gespeichert.
            </p>
          </div>
        </div>
      </section>

      {/* Right Table */}
      <section className="lg:col-span-8 bg-white border border-[#cfc4c5] rounded flex flex-col min-h-[480px] overflow-hidden">
        <div className="p-4 border-b border-[#cfc4c5] flex justify-between items-center bg-[#f9f9f9]">
          <span className="font-mono text-xs text-[#585f6c] uppercase tracking-widest">Verlauf (Session - tags.csv)</span>
          <button
            onClick={() => {
              // Trigger simple window print or text CSV copy
              const csvContent = "startnummer,epc,timestamp,status\n" + 
                assignments.map(a => `${a.startnummer},${a.epc},${a.timestamp},${a.status}`).join("\n");
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.setAttribute('href', url);
              a.setAttribute('download', 'tags.csv');
              a.click();
            }}
            className="flex items-center gap-2 px-3 py-1.5 border border-[#cfc4c5] hover:bg-[#f3f3f3] transition-colors text-black rounded text-xs font-mono cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            CSV herunterladen
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#f9f9f9] border-b border-[#cfc4c5] z-10">
              <tr>
                <th className="font-mono text-xs text-[#585f6c] p-4 whitespace-nowrap">Startnr.</th>
                <th className="font-mono text-xs text-[#585f6c] p-4 w-full">EPC Tag ID</th>
                <th className="font-mono text-xs text-[#585f6c] p-4 whitespace-nowrap">Zeitstempel</th>
                <th className="font-mono text-xs text-[#585f6c] p-4 whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center font-mono text-xs text-[#585f6c]">
                    Keine Zuweisungen erfasst. Scannen Sie einen Tag und geben Sie eine Startnummer ein.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment, index) => {
                  const isLocked = assignment.status === 'Locked';
                  return (
                    <tr
                      key={index}
                      className={`border-b border-[#e2e2e2] transition-colors hover:bg-neutral-50 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f9]/50'
                      }`}
                    >
                      <td className="font-mono text-lg font-bold p-4 text-black">{assignment.startnummer}</td>
                      <td className="font-mono text-sm text-[#585f6c] p-4 break-all">{assignment.epc}</td>
                      <td className="font-mono text-xs text-[#585f6c] p-4 whitespace-nowrap">{assignment.timestamp}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] ${
                            isLocked
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-red-50 border-red-200 text-red-700'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${isLocked ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {assignment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
