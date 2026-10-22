import React from 'react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  eventCounts,
  deviceToken,
  onCopyToken,
  copiedToken,
  espStatus = 'Online'
}) {
  const navItems = [
    {
      id: 'dashboard',
      label: 'Mission HUD',
      sub: 'Overview & Metrics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'timeline',
      label: 'Intelligence Feed',
      sub: 'Voice Logs & Transcripts',
      badge: eventCounts.total,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'audio-studio',
      label: 'Audio Lab',
      sub: 'Oscilloscope & Mic',
      badge: 'Live',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      )
    },
    {
      id: 'ai-studio',
      label: 'Presentation Studio',
      sub: 'PPTX Deck Generator',
      badge: eventCounts.presentations,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      id: 'hardware',
      label: 'Hardware & Bridge',
      sub: 'ESP32 INMP441 TFT',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      )
    },
    {
      id: 'twilio',
      label: 'Jarvis Dispatcher',
      sub: 'Automated Wakeup Calls',
      badge: eventCounts.meetings,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    },
    {
      id: 'settings',
      label: 'System & Diagnostics',
      sub: 'API Keys & Logs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  return (
    <aside className="w-full md:w-64 lg:w-72 flex-shrink-0 flex flex-col gap-5">
      {/* Navigation Rail */}
      <div className="glass-panel rounded-3xl p-3 border border-white/10 shadow-xl">
        <div className="px-3 py-2 text-[11px] font-mono-tech uppercase tracking-wider text-slate-400 font-bold">
          Navigation Deck
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600/30 via-rose-600/20 to-transparent border-l-4 border-red-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'text-red-400 bg-red-500/10' : 'text-slate-500'}`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className={`text-xs font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono-tech">
                      {item.sub}
                    </p>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono-tech font-bold border ${
                      item.badgeColor || (isActive ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-slate-800 text-slate-400 border-white/5')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Hardware Telemetry Widget */}
      <div className="glass-panel rounded-3xl p-4 border border-white/10 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono-tech">
              ESP32 Link
            </span>
          </div>
          <span className="text-[10px] font-mono-tech bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
            {espStatus}
          </span>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-[11px] font-mono-tech text-slate-400">
            <span>WebSocket:</span>
            <span className="text-slate-200">ws://localhost:3000</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono-tech text-slate-400">
            <span>Sample Rate:</span>
            <span className="text-slate-200">16kHz 16-bit PCM</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono-tech text-slate-400">
            <span>AI Pipeline:</span>
            <span className="text-rose-400 font-semibold">Groq Llama-3.3 + Whisper</span>
          </div>
        </div>

        {/* Device Token Quick Box */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px] font-mono-tech text-slate-400 mb-1.5">
            <span>PAIRING TOKEN:</span>
            <span className="text-[9px] text-slate-500">Flash into .ino</span>
          </div>
          <button
            onClick={onCopyToken}
            className="w-full py-2 px-3 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-mono-tech text-xs rounded-xl border border-white/10 hover:border-emerald-500/50 flex items-center justify-between transition-all group"
          >
            <span className="truncate pr-2 text-slate-400 group-hover:text-white">
              {deviceToken ? deviceToken.substring(0, 16) + '...' : 'token-nexus-core-99'}
            </span>
            <span className="text-[10px] text-emerald-400 font-bold flex-shrink-0">
              {copiedToken ? '✓ COPIED' : 'COPY'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
