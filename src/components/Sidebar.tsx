import React, { useState, useEffect } from 'react';
import { RfidStatus } from '../App';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onReset: () => void;
  width: number;
  setWidth: (width: number) => void;
  csvStoragePath: string;
  onChangeStoragePath: () => void;
  rfidStatus: RfidStatus;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  onReset,
  width,
  setWidth,
  csvStoragePath,
  onChangeStoragePath,
  rfidStatus
}: SidebarProps) {
  const [timeStr, setTimeStr] = useState('');
  const [showReaderConfig, setShowReaderConfig] = useState(false);
  const [comPort, setComPort] = useState(rfidStatus.comPort || 'COM8');
  const [connecting, setConnecting] = useState(false);

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

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await fetch('/api/rfid/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port: comPort, baudRate: 38400, antennaIndex: 1 }),
      });
    } catch (err) {
      console.error('Failed to connect reader:', err);
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/rfid/disconnect', { method: 'POST' });
    } catch (err) {
      console.error('Failed to disconnect reader:', err);
    }
  };

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

      <div className="px-6 mb-12 text-center">
        <h1 className="font-sans text-2xl font-black text-black tracking-tight">AeroTrackTiming</h1>
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
        {/* RFID Reader Status */}
        <div className="bg-[#f0f0f0] p-3 rounded-lg border border-[#e2e2e2] flex flex-col gap-1.5 shadow-sm">
          <div className="flex justify-between items-center text-[#585f6c]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">sensors</span>
              <span className="font-mono text-[9px] uppercase tracking-wider font-semibold">UHF Reader</span>
            </div>
            <button
              onClick={() => setShowReaderConfig(!showReaderConfig)}
              title="Reader konfigurieren"
              className="text-[#4c4546] hover:text-black transition-colors cursor-pointer flex items-center justify-center p-0.5 rounded hover:bg-neutral-200"
            >
              <span className="material-symbols-outlined text-[14px]">{showReaderConfig ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${rfidStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-neutral-400'}`}></span>
            <span className="font-mono text-[10px] text-black font-medium">
              {rfidStatus.connected ? `Verbunden (${rfidStatus.comPort})` : 'Nicht verbunden'}
            </span>
          </div>

          {showReaderConfig && (
            <div className="mt-1 flex flex-col gap-2 border-t border-[#e2e2e2] pt-2">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={comPort}
                  onChange={(e) => setComPort(e.target.value)}
                  placeholder="COM8"
                  className="flex-1 min-w-0 bg-white border border-[#cfc4c5] p-1.5 font-mono text-[10px] rounded text-black focus:outline-none focus:border-black"
                />
                {rfidStatus.connected ? (
                  <button
                    onClick={handleDisconnect}
                    className="shrink-0 px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-mono text-[9px] rounded cursor-pointer transition-colors"
                  >
                    Trennen
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="shrink-0 px-2 py-1 bg-black hover:bg-neutral-800 text-white font-mono text-[9px] rounded cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {connecting ? '...' : 'Verbinden'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

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
