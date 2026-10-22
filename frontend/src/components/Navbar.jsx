import React from 'react';

export default function Navbar({
  searchTerm,
  setSearchTerm,
  onOpenCreateModal,
  onOpenAudioStudio,
  isRecordingAudio,
  userEmail,
  isDemoMode,
  setIsDemoMode,
  onSignOut,
  activeFilter,
  setActiveFilter
}) {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Telemetry Beacon */}
          <div className="flex items-center gap-3 min-w-max">
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 p-[1px] shadow-[0_0_20px_rgba(239,68,68,0.35)]">
                <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wider text-white">NEXUS</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-mono-tech font-bold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-500/30">
                  TACTICAL OS
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono-tech tracking-tight hidden sm:block">
                AI WEARABLE INTELLIGENCE SUITE
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search transcripts, missions, presentations, tags..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Right Action Cluster & Telemetry */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            
            {/* Live Audio Studio Toggle */}
            <button
              onClick={onOpenAudioStudio}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isRecordingAudio
                  ? 'bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.6)]'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-white/10 hover:border-red-500/40'
              }`}
              title="Record voice note or test microphone"
            >
              <span className={`w-2 h-2 rounded-full ${isRecordingAudio ? 'bg-white' : 'bg-red-500 animate-ping'}`}></span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="hidden sm:inline">Voice Studio</span>
            </button>

            {/* Quick Create Button */}
            <button
              onClick={onOpenCreateModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.35)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden xs:inline">Capture</span>
            </button>

            {/* Mode Switcher Badge (Local Workspace vs Cloud) */}
            <div className="hidden lg:flex items-center bg-slate-900/90 border border-white/10 rounded-xl p-1 text-[11px] font-mono-tech">
              <span className="text-slate-400 px-2 py-0.5">Mode:</span>
              <button
                onClick={() => setIsDemoMode(!isDemoMode)}
                className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                  isDemoMode
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
                title="Toggle between Local High-Performance Mode and Supabase Cloud Sync"
              >
                {isDemoMode ? '⚡ Local Workspace' : '☁️ Cloud Sync'}
              </button>
            </div>

            {/* User Profile Badge / Signout */}
            <div className="flex items-center gap-2 pl-1 border-l border-white/10">
              <div
                className="w-8 h-8 rounded-xl bg-slate-800 border border-white/15 flex items-center justify-center text-xs font-bold text-white shadow-inner"
                title={userEmail || 'Commander'}
              >
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'C'}
              </div>
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                title="Sign Out / Switch Operator"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
