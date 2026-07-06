import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <AuthScreen />;
  }
  else {
    return <Dashboard session={session} />;
  }
}

function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Success! Check your email or try logging in.");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>
      
      <div className="bg-slate-900/60 backdrop-blur-md p-10 rounded-3xl border border-white/10 shadow-2xl w-full max-w-md relative z-10">
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-br from-red-500 to-rose-700 w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.3)] border border-red-400/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-center text-white mb-2">Nexus Companion</h2>
        <p className="text-slate-400 text-center mb-8">{isLogin ? 'Sign in to access your dashboard' : 'Create a new account'}</p>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl px-4 py-3 mt-4 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50"
          >
            {loading ? 'Processing...' : isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-slate-400 hover:text-white transition-colors">
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ session }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summaryModal, setSummaryModal] = useState({ isOpen: false, text: '', title: '' });
  const [deviceToken, setDeviceToken] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeviceToken = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('token, phone_number')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setDeviceToken(data[0].token);
        if (data[0].phone_number) setPhoneNumber(data[0].phone_number);
      }
    } catch(err) {}
  };

  const savePhoneNumber = async () => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ phone_number: phoneNumber })
        .eq('token', deviceToken);
      if (error) throw error;
      alert("Phone number saved! AI Calling is active.");
    } catch(err) {
      alert("Failed to save phone number. Make sure Supabase RLS policies allow updates.");
    }
  };

  const generateToken = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .insert([{ user_id: session.user.id }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) setDeviceToken(data[0].token);
    } catch (error) {
      alert("Failed to generate Device Token");
    }
  };

  const deleteEvent = async (id) => {
    await supabase.from('events').delete().eq('id', id);
    fetchEvents();
  };

  const handleCopyToken = () => {
    if (deviceToken) {
      navigator.clipboard.writeText(deviceToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchDeviceToken();
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `user_id=eq.${session.user.id}` }, () => fetchEvents())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const upcomingMeetings = events.filter(e => e.type === 'meeting' && new Date(e.time) > new Date());

  return (
    <div className="bg-black min-h-screen flex justify-center text-slate-200">
      {/* Mobile Constrained Container */}
      <div className="w-full max-w-md bg-slate-950 min-h-screen relative shadow-2xl overflow-hidden flex flex-col border-x border-white/5">
        
        {/* Header */}
        <header className="pt-12 pb-4 px-6 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-red-500 to-rose-700 w-9 h-9 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Nexus <span className="text-red-500">Core</span></h1>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto pb-24 px-5 pt-6 scroll-smooth">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Hello, Commander</h2>
              
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-white/5 mb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                  Hardware Link
                </h3>
                {!deviceToken ? (
                  <button onClick={generateToken} className="w-full mt-3 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.3)]">Generate Token</button>
                ) : (
                  <div className="mt-3">
                    <p className="text-xs text-slate-500 mb-2">Paste into Wi-Fi Portal:</p>
                    <button onClick={handleCopyToken} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-colors">
                      {copied ? 'Copied to Clipboard!' : 'Copy Device Token'}
                    </button>
                  </div>
                )}
              </div>

              {upcomingMeetings.length > 0 ? (
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Upcoming Tasks</h3>
                  <div className="space-y-4">
                    {upcomingMeetings.map(event => (
                      <div key={event.id} className="bg-blue-900/20 border border-blue-500/30 p-5 rounded-3xl flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h4 className="text-lg font-bold text-white mb-1 leading-tight">{event.title}</h4>
                        <p className="text-blue-300 text-sm font-medium">{new Date(event.time).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest">
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          Jarvis Call Scheduled
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/30 rounded-3xl p-6 border border-white/5 flex flex-col items-center justify-center text-center py-10">
                  <svg className="w-10 h-10 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  <p className="text-slate-400 font-medium text-sm">No scheduled tasks.</p>
                </div>
              )}
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Timeline</h2>
              {loading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-slate-800 border-t-red-500 rounded-full animate-spin"></div></div>
              ) : events.length === 0 ? (
                <p className="text-center text-slate-500 mt-10">No logs found.</p>
              ) : (
                <div className="space-y-4">
                  {events.map(event => (
                    <EventCard key={event.id} event={event} onDelete={() => deleteEvent(event.id)} openModal={(title, text) => setSummaryModal({ isOpen: true, title, text })} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-in fade-in duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>
              
              <div className="bg-slate-900/60 rounded-3xl p-6 border border-white/5 mb-6">
                <div className="flex flex-col items-center justify-center mb-6">
                  <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-3 shadow-inner">
                    <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <p className="text-white font-medium">{session.user.email}</p>
                </div>

                <div className="border-t border-white/5 pt-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Jarvis Call Settings</h3>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Verified Mobile Number</label>
                  <div className="flex bg-slate-950 rounded-xl overflow-hidden border border-slate-800 focus-within:border-blue-500 transition-colors">
                    <input 
                      type="text" 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      placeholder="+91..." 
                      className="bg-transparent text-white px-4 py-3 outline-none w-full text-sm font-medium"
                    />
                  </div>
                  <button onClick={savePhoneNumber} className="w-full mt-3 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)]">Save Number</button>
                  <p className="text-[10px] text-slate-500 mt-3 text-center leading-relaxed">
                    Note: If using Twilio Trial, this MUST be your Twilio Verified Number. Ensure Supabase devices table allows updates.
                  </p>
                </div>
              </div>

              <button onClick={() => supabase.auth.signOut()} className="w-full py-4 text-red-400 font-bold bg-red-500/10 rounded-2xl border border-red-500/20">Sign Out</button>
            </div>
          )}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="absolute bottom-0 w-full bg-slate-950/90 backdrop-blur-2xl border-t border-white/5 pb-8 pt-4 px-6 z-30">
          <div className="flex justify-between items-center max-w-[300px] mx-auto">
            <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-slate-600'}`}>
              <svg className="w-6 h-6" fill={activeTab === 'home' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
              <span className="text-[10px] font-bold">Home</span>
            </button>
            <button onClick={() => setActiveTab('timeline')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'timeline' ? 'text-white' : 'text-slate-600'}`}>
              <svg className="w-6 h-6" fill={activeTab === 'timeline' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span className="text-[10px] font-bold">Timeline</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'profile' ? 'text-white' : 'text-slate-600'}`}>
              <svg className="w-6 h-6" fill={activeTab === 'profile' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
              <span className="text-[10px] font-bold">Profile</span>
            </button>
          </div>
        </nav>

        {/* Summary Modal (Mobile Optimized) */}
        {summaryModal.isOpen && (
          <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 w-full h-[85%] sm:h-auto sm:max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col border border-slate-700 animate-in slide-in-from-bottom-full duration-300">
              <div className="flex justify-between items-center p-5 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white truncate">AI Summary</h3>
                <button onClick={() => setSummaryModal({ isOpen: false, text: '', title: '' })} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{summaryModal.text}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event, openModal, onDelete }) {
  const isMeeting = event.type === 'meeting' || event.type === 'meeting_done';
  const isPresentation = event.type === 'presentation';
  const timeFormatted = new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = new Date(event.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

  const handleGeneratePPT = async () => {
    alert("Generating PPT uses the backend.");
    try {
      const res = await fetch('https://nexus-watch-backend.onrender.com/api/generate-ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: event.content || event.transcript })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event.title.replace(/\s+/g, '_')}_Presentation.pptx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch(err) { console.error(err); }
  };

  const handleGenerateSummary = async () => {
    try {
      const res = await fetch('https://nexus-watch-backend.onrender.com/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: event.content || event.transcript })
      });
      if (res.ok) {
        const data = await res.json();
        openModal(event.title, data.summary);
      }
    } catch(err) { console.error(err); }
  };

  return (
    <div className="relative bg-slate-900/80 backdrop-blur-md p-5 rounded-3xl border border-white/5 overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
              isMeeting ? 'bg-blue-500/20 text-blue-400' : isPresentation ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>{isMeeting ? 'Task' : isPresentation ? 'Presentation' : 'Voice Note'}</span>
          </div>
          <h3 className="text-xl font-bold text-white leading-tight mb-1 pr-8">{isPresentation || isMeeting ? event.title : 'Quick Note'}</h3>
          <p className="text-xs font-medium text-slate-500 mb-3">
            {isMeeting && event.time ? `Scheduled: ${new Date(event.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : `${dateFormatted} at ${timeFormatted}`}
          </p>
        </div>
        <button onClick={onDelete} className="p-2 -mr-2 -mt-2 text-slate-600 hover:text-red-400 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>

            {event.content && (
              <div className="mt-5 text-slate-300 text-sm leading-relaxed bg-slate-800/30 p-5 rounded-2xl border border-white/5 font-medium">
                {isMeeting && <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">AI Transcript</span>}
                {event.content}
              </div>
            )}

      {isPresentation && (
        <div className="mt-4 flex gap-2">
          <button onClick={handleGeneratePPT} className="flex-1 py-2 bg-red-600/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20">
            PPT
          </button>
          <button onClick={handleGenerateSummary} className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-xs font-bold border border-blue-500/20">
            SUMMARY
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
