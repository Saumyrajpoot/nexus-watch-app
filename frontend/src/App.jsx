import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import AudioVisualizer from './components/AudioVisualizer';
import EventCard from './components/EventCard';
import CreateEventModal from './components/CreateEventModal';
import SlideViewerModal from './components/SlideViewerModal';
import HardwareHub from './components/HardwareHub';
import TwilioDispatcher from './components/TwilioDispatcher';
import SystemDiagnostics from './components/SystemDiagnostics';
import { initialSampleEvents } from './data/mockData';

// Supabase & Backend Config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

// Safe Supabase client init
let supabase = null;
if (supabaseUrl && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.warn("Supabase init failed, fallback to local workspace mode:", e);
  }
}

export default function App() {
  const [session, setSession] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Events & Data State (Always guaranteed to have rich initial events)
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus_events');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return initialSampleEvents;
    } catch (e) {
      return initialSampleEvents;
    }
  });

  const [deviceToken, setDeviceToken] = useState(() => {
    return localStorage.getItem('nexus_device_token') || 'token-nexus-core-9942a';
  });
  const [phoneNumber, setPhoneNumber] = useState(() => {
    return localStorage.getItem('nexus_phone_number') || '+1234567890';
  });
  const [copiedToken, setCopiedToken] = useState(false);

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [slideModalData, setSlideModalData] = useState({ isOpen: false, title: '', slides: [] });
  const [summaryModal, setSummaryModal] = useState({ isOpen: false, title: '', text: '' });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Synchronize localStorage when events change in local mode
  useEffect(() => {
    try {
      localStorage.setItem('nexus_events', JSON.stringify(events));
    } catch (e) {}
  }, [events]);

  // Supabase Auth Listener (Safely guarded)
  useEffect(() => {
    if (!supabase) return;
    
    try {
      supabase.auth.getSession().then((res) => {
        if (res?.data?.session) {
          setSession(res.data.session);
          setIsDemoMode(false);
        }
      }).catch((e) => {
        console.warn("Supabase getSession failed, continuing in Local Mode:", e);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setSession(session);
          setIsDemoMode(false);
        } else {
          setSession(null);
        }
      });

      return () => {
        if (data?.subscription) {
          data.subscription.unsubscribe();
        }
      };
    } catch (err) {
      console.warn("Supabase auth listener setup error:", err);
    }
  }, []);

  // Fetch Supabase data if logged in
  const fetchSupabaseEvents = async () => {
    if (!supabase || !session) return;
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        setEvents(data);
      }
    } catch (e) {
      console.warn("Supabase fetch failed, keeping local state:", e);
    }
  };

  useEffect(() => {
    if (session && !isDemoMode) {
      fetchSupabaseEvents();
    }
  }, [session, isDemoMode]);

  // Handlers
  const handleAddEvent = (newEvent) => {
    setEvents(prev => [newEvent, ...prev]);
  };

  const handleDeleteEvent = async (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    if (supabase && session && !isDemoMode) {
      try {
        await supabase.from('events').delete().eq('id', id);
      } catch (e) {}
    }
  };

  const handleGenerateToken = async () => {
    const newToken = `token-${Math.random().toString(36).substring(2, 10)}-${Date.now().toString(36)}`;
    setDeviceToken(newToken);
    localStorage.setItem('nexus_device_token', newToken);

    if (supabase && session && !isDemoMode) {
      try {
        await supabase.from('devices').insert([{ user_id: session.user.id, token: newToken }]);
      } catch (e) {}
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(deviceToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSavePhoneNumber = async () => {
    localStorage.setItem('nexus_phone_number', phoneNumber);
    if (supabase && session && !isDemoMode) {
      try {
        await supabase.from('devices').update({ phone_number: phoneNumber }).eq('token', deviceToken);
      } catch (e) {}
    }
    alert("Phone number saved! Jarvis automated calling queue updated.");
  };

  const handleResetData = () => {
    setEvents(initialSampleEvents);
    localStorage.setItem('nexus_events', JSON.stringify(initialSampleEvents));
    alert("Sample intelligence logs restored.");
  };

  // Filter & Search Logic
  const filteredEvents = events.filter((e) => {
    // Category filter
    if (activeFilter === 'meeting' && e.type !== 'meeting' && e.type !== 'meeting_done') return false;
    if (activeFilter === 'presentation' && e.type !== 'presentation') return false;
    if (activeFilter === 'task' && e.type !== 'task' && e.type) return false;

    // Search query
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const titleMatch = (e.title || '').toLowerCase().includes(term);
    const contentMatch = (e.content || e.transcript || '').toLowerCase().includes(term);
    const tagMatch = (e.tags || []).some(t => t.toLowerCase().includes(term));
    return titleMatch || contentMatch || tagMatch;
  });

  const eventCounts = {
    total: events.length,
    meetings: events.filter(e => e.type === 'meeting' || e.type === 'meeting_done').length,
    presentations: events.filter(e => e.type === 'presentation').length,
    tasks: events.filter(e => e.type === 'task' || !e.type).length
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col relative bg-tech-grid">
      
      {/* Glow Orbs in background */}
      <div className="fixed top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-rose-600/10 blur-[140px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-blue-600/10 blur-[140px] pointer-events-none"></div>

      {/* Global Top Navigation */}
      <Navbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenAudioStudio={() => setActiveTab('audio-studio')}
        isRecordingAudio={activeTab === 'audio-studio'}
        userEmail={session?.user?.email || 'Commander'}
        isDemoMode={isDemoMode}
        setIsDemoMode={setIsDemoMode}
        onSignOut={() => {
          if (supabase && session) supabase.auth.signOut();
          setSession(null);
          setIsDemoMode(true);
        }}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
      />

      {/* Notice Banner if Supabase is offline / running in Local Mode */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-transparent border-b border-amber-500/20 py-2 px-4 sm:px-8 text-xs font-mono-tech flex items-center justify-between text-amber-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span>
              <strong>LOCAL WORKSPACE MODE:</strong> Zero-downtime offline active mode. All actions, slide decks, and audio tests are stored locally in your browser.
            </span>
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            className="text-[11px] underline hover:text-white uppercase font-bold tracking-wider"
          >
            Connect Cloud Account
          </button>
        </div>
      )}

      {/* Main Responsive Layout (Desktop Sidebar + Content Deck) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col md:flex-row gap-6 relative z-10">
        
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          eventCounts={eventCounts}
          deviceToken={deviceToken}
          onCopyToken={handleCopyToken}
          copiedToken={copiedToken}
          espStatus={isDemoMode ? 'Emulated' : 'Cloud Sync'}
        />

        {/* Center / Main Content Area */}
        <main className="flex-1 min-w-0">
          
          {/* TAB 1: MISSION HUD / DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Metric Cards Row */}
              <MetricCards
                events={events}
                onFilterChange={(f) => {
                  if (f === 'performance') setActiveTab('settings');
                  else {
                    setActiveFilter(f);
                    setActiveTab('timeline');
                  }
                }}
                activeFilter={activeFilter}
              />

              {/* In-Browser Live Audio Studio */}
              <AudioVisualizer
                onAddEvent={handleAddEvent}
                backendUrl={BACKEND_URL}
              />

              {/* Feed Preview Header */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-wide">
                    Recent Intelligence Logs
                  </h3>
                  <p className="text-xs text-slate-400">
                    Latest push-to-talk transcriptions and automated meetings.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className="text-xs font-mono-tech text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold"
                >
                  <span>View All ({events.length})</span>
                  <span>→</span>
                </button>
              </div>

              {/* Events Grid (2 columns on wide screens) */}
              {events.length === 0 ? (
                <div className="glass-panel p-8 rounded-3xl border border-white/10 text-center">
                  <p className="text-sm font-bold text-white mb-2">No Logs in Queue</p>
                  <p className="text-xs text-slate-400 mb-4 font-mono-tech">
                    Record audio via the studio above or reload sample logs.
                  </p>
                  <button
                    onClick={handleResetData}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Restore Sample Logs
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {events.slice(0, 4).map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={() => handleDeleteEvent(event.id)}
                      onOpenSummary={(title, text) => setSummaryModal({ isOpen: true, title, text })}
                      onOpenSlides={(title, slides) => setSlideModalData({ isOpen: true, title, slides })}
                      backendUrl={BACKEND_URL}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TIMELINE / INTELLIGENCE FEED */}
          {activeTab === 'timeline' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Filter Tabs Bar */}
              <div className="glass-panel p-4 rounded-3xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: 'all', label: 'All Logs', count: eventCounts.total },
                    { id: 'task', label: 'Tasks', count: eventCounts.tasks },
                    { id: 'meeting', label: 'Scheduled Calls', count: eventCounts.meetings },
                    { id: 'presentation', label: 'Presentations', count: eventCounts.presentations }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono-tech font-bold transition-all ${
                        activeFilter === tab.id
                          ? 'bg-rose-600 text-white shadow-lg'
                          : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.35)] transition-all flex items-center gap-1.5"
                >
                  <span>+ Add Log</span>
                </button>
              </div>

              {/* Feed Grid */}
              {filteredEvents.length === 0 ? (
                <div className="glass-panel rounded-3xl p-12 text-center border border-white/10">
                  <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-sm font-bold text-white mb-1">No Matching Intelligence Logs Found</p>
                  <p className="text-xs text-slate-400 font-mono-tech mb-4">
                    Try adjusting your search query or select another category filter.
                  </p>
                  <button
                    onClick={() => { setSearchTerm(''); setActiveFilter('all'); }}
                    className="px-4 py-2 bg-slate-800 text-xs text-white rounded-xl font-mono-tech"
                  >
                    Clear Search Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onDelete={() => handleDeleteEvent(event.id)}
                      onOpenSummary={(title, text) => setSummaryModal({ isOpen: true, title, text })}
                      onOpenSlides={(title, slides) => setSlideModalData({ isOpen: true, title, slides })}
                      backendUrl={BACKEND_URL}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AUDIO STUDIO */}
          {activeTab === 'audio-studio' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <AudioVisualizer
                onAddEvent={handleAddEvent}
                backendUrl={BACKEND_URL}
              />
              <div className="glass-panel p-6 rounded-3xl border border-white/10">
                <h3 className="text-sm font-bold text-white mb-2 font-mono-tech uppercase text-cyan-400">
                  Audio Pipeline Architecture & Telemetry
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Audio recorded in this studio is streamed directly as raw PCM or high-fidelity Opus/WebM chunks. The backend converter parses the audio into 16,000Hz WAV format and delivers it to the <strong>Groq Whisper-v3</strong> transcription engine with zero hallucinations (<code className="text-rose-400">temperature: 0.0</code>).
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: PRESENTATION STUDIO */}
          {activeTab === 'ai-studio' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-wide">
                    AI Slide Deck & Document Studio
                  </h2>
                  <p className="text-xs text-slate-400 max-w-xl">
                    Every continuous presentation recording is structured into 16:9 PowerPoint slides using Groq Llama-3.3-70b.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all"
                >
                  + Create Slide Deck
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {events.filter(e => e.type === 'presentation').map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onDelete={() => handleDeleteEvent(event.id)}
                    onOpenSummary={(title, text) => setSummaryModal({ isOpen: true, title, text })}
                    onOpenSlides={(title, slides) => setSlideModalData({ isOpen: true, title, slides })}
                    backendUrl={BACKEND_URL}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: HARDWARE & BRIDGE */}
          {activeTab === 'hardware' && (
            <HardwareHub
              deviceToken={deviceToken}
              onGenerateToken={handleGenerateToken}
              onCopyToken={handleCopyToken}
              copiedToken={copiedToken}
              backendUrl={BACKEND_URL}
            />
          )}

          {/* TAB 6: TWILIO DISPATCHER */}
          {activeTab === 'twilio' && (
            <TwilioDispatcher
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              onSavePhoneNumber={handleSavePhoneNumber}
              events={events}
            />
          )}

          {/* TAB 7: SYSTEM DIAGNOSTICS */}
          {activeTab === 'settings' && (
            <SystemDiagnostics
              backendUrl={BACKEND_URL}
              onResetData={handleResetData}
              eventsCount={events.length}
            />
          )}

        </main>
      </div>

      {/* MODAL 1: Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleAddEvent}
      />

      {/* MODAL 2: Interactive 16:9 Slide Deck Viewer */}
      <SlideViewerModal
        isOpen={slideModalData.isOpen}
        onClose={() => setSlideModalData({ isOpen: false, title: '', slides: [] })}
        title={slideModalData.title}
        slides={slideModalData.slides}
        backendUrl={BACKEND_URL}
      />

      {/* MODAL 3: AI Executive Brief Summary Modal */}
      {summaryModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/15 w-full max-w-2xl rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div>
                <span className="text-[10px] font-mono-tech uppercase font-bold text-blue-400">
                  AI EXECUTIVE BRIEF
                </span>
                <h3 className="text-lg font-bold text-white truncate max-w-md mt-0.5">
                  {summaryModal.title}
                </h3>
              </div>
              <button
                onClick={() => setSummaryModal({ isOpen: false, title: '', text: '' })}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium p-4 bg-slate-950 rounded-2xl border border-white/5">
              {summaryModal.text}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(summaryModal.text);
                  alert("Summary copied to clipboard!");
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all"
              >
                Copy Brief to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Cloud Connect Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 w-full max-w-md rounded-3xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-2">Connect Supabase Cloud</h3>
            <p className="text-xs text-slate-400 mb-4">
              To synchronize directly to Supabase cloud database, ensure your project is unpaused at <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-rose-400 underline">supabase.com</a>.
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-white/10 font-mono-tech text-[11px] text-slate-300 mb-4">
              Endpoint: {supabaseUrl || 'https://<project-id>.supabase.co'}
            </div>
            <button
              onClick={() => setShowAuthModal(false)}
              className="w-full py-2.5 bg-rose-600 text-white text-xs font-bold rounded-xl"
            >
              Continue in Local Mode
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
