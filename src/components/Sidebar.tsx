import React, { useState, useEffect } from 'react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onReset: () => void;
  width: number;
  setWidth: (width: number) => void;
  csvStoragePath: string;
  onChangeStoragePath: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onReset,
  width,
  setWidth,
  csvStoragePath,
  onChangeStoragePath
}: SidebarProps) {
  const [timeStr, setTimeStr] = useState('');

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(480, startWidth + (moveEvent.clientX - startX)));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    let animId: number;
    const updateTime = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      setTimeStr(`${hh}:${mm}:${ss}.${ms}`);
      animId = requestAnimationFrame(updateTime);
    };
    animId = requestAnimationFrame(updateTime);
    return () => cancelAnimationFrame(animId);
  }, []);
  const menuItems = [
    { id: 'tag', label: 'Tag Zuweisung', icon: 'sell' },
    { id: 'anmeldung', label: 'Anmeldung', icon: 'person_add' },
    { id: 'start', label: 'Start Zeitfahren', icon: 'timer' },
    { id: 'massenstart', label: 'Massenstart', icon: 'group' },
    { id: 'ziel', label: 'Ziel', icon: 'flag' },
    { id: 'rangliste', label: 'Rangliste', icon: 'leaderboard' },
  ];

  return (
    <nav
      style={{ width: `${width}px` }}
      className="hidden md:flex flex-col bg-[#f9f9f9] fixed left-0 top-0 h-full py-8 border-r border-[#e2e2e2] z-40 select-none"
    >
      {/* Resizing handle trigger element */}
      <div
        onMouseDown={handleMouseDown}
        onDoubleClick={() => setWidth(256)}
        className="absolute right-0 top-0 h-full w-[6px] hover:w-[10px] cursor-col-resize hover:bg-[#cfc4c5]/40 active:bg-black/40 transition-all z-50 group flex items-center justify-center"
        title="Seitenleistengrösse anpassen (Doppelklick zum Zurücksetzen)"
      >
        <div className="w-[1px] h-10 bg-[#cfc4c5] group-hover:bg-[#585f6c] transition-colors" />
      </div>

      <div className="px-6 mb-12">
        <h1 className="font-sans text-2xl font-black text-black tracking-tight">AeroTrack</h1>
        <p className="font-mono text-xs text-[#585f6c] mt-1 tracking-widest uppercase">UHF RFID Engine</p>
      </div>

      <div className="flex-1 flex flex-col w-full space-y-1">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              id={`nav-tab-${item.id}`}
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-3 px-6 py-4 duration-150 transition-all text-left w-full border-r-2 cursor-pointer ${
                isActive
                  ? 'text-black border-black bg-[#e2e2e2] font-bold'
                  : 'text-[#4c4546] border-transparent hover:bg-[#f3f3f3]'
              }`}
            >
              <span className="material-symbols-outlined shrink-0" style={{ fontVariationSettings: ` 'FILL' ${isActive ? 1 : 0}` }}>
                {item.icon}
              </span>
              <span className="font-sans text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="px-6 mt-auto pt-6 border-t border-[#e2e2e2] flex flex-col gap-3">
        {/* Storage path display & config button */}
        <div className="bg-[#f0f0f0] p-3 rounded-lg border border-[#e2e2e2] flex flex-col gap-1 shadow-sm">
          <div className="flex justify-between items-center text-[#585f6c]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">folder</span>
              <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">CSV-Speicherort</span>
            </div>
            <button
              onClick={onChangeStoragePath}
              title="Speicherort ändern"
              className="text-[#4c4546] hover:text-black transition-colors cursor-pointer flex items-center justify-center p-0.5 rounded hover:bg-neutral-200"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
            </button>
          </div>
          <div
            className="font-mono text-[10px] text-black break-all select-text font-medium leading-tight cursor-help mt-1"
            title={csvStoragePath}
          >
            {csvStoragePath}
          </div>
        </div>

        {/* Real-time Clock */}
        <div id="realtime-clock" className="bg-[#f0f0f0] p-3 rounded-lg border border-[#e2e2e2] flex flex-col gap-1 shadow-sm">
          <div className="flex items-center gap-1.5 text-[#585f6c]">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">System-Zeit</span>
          </div>
          <div className="font-mono text-base font-bold text-black tracking-wider tabular-nums leading-none">
            {timeStr}
          </div>
        </div>
      </div>
    </nav>
  );
}
