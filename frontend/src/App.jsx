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
  const [bleStatus, setBleStatus] = useState('');

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
        .select('token')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        setDeviceToken(data[0].token);
      }
    } catch(err) {}
  };

  const generateToken = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .insert([{ user_id: session.user.id }])
        .select();
        
      if (error) throw error;
      if (data && data.length > 0) {
        setDeviceToken(data[0].token);
      }
    } catch (error) {
      console.error("Failed to generate token:", error);
      alert("Failed to generate Device Token");
    }
  };

  const deleteEvent = async (id) => {
    await supabase.from('events').delete().eq('id', id);
    fetchEvents();
  };

  const handleBluetoothSetup = async () => {
    if (!deviceToken) {
      alert("Please generate a Device Token first!");
      return;
    }

    try {
      setBleStatus("Scanning for Nexus Watch...");
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'Nexus Watch' }],
        optionalServices: ['4fafc201-1fb5-459e-8fcc-c5c9c331914b']
      });

      setBleStatus("Connecting to GATT Server...");
      const server = await device.gatt.connect();

      setBleStatus("Getting Service...");
      const service = await server.getPrimaryService('4fafc201-1fb5-459e-8fcc-c5c9c331914b');

      const ssid = prompt("Enter your Mobile Hotspot Name (SSID):");
      if (!ssid) { setBleStatus(""); return; }
      
      const pass = prompt("Enter your Mobile Hotspot Password:");
      if (!pass) { setBleStatus(""); return; }

      setBleStatus("Sending SSID...");
      const charSSID = await service.getCharacteristic('beb5483e-36e1-4688-b7f5-ea07361b26a8');
      await charSSID.writeValue(new TextEncoder().encode(ssid));

      setBleStatus("Sending Password...");
      const charPASS = await service.getCharacteristic('cba1d466-344c-4be3-ab3f-189f80dd7518');
      await charPASS.writeValue(new TextEncoder().encode(pass));

      setBleStatus("Sending Device Token...");
      const charTOKEN = await service.getCharacteristic('f78ebbff-c8b7-4107-93de-889a6a06d408');
      await charTOKEN.writeValue(new TextEncoder().encode(deviceToken));

      setBleStatus("Triggering Reboot...");
      const charCONNECT = await service.getCharacteristic('ca73b3ba-39f6-4ab3-91ae-186dc9577d99');
      await charCONNECT.writeValue(new TextEncoder().encode("1"));

      setBleStatus("Setup Complete! Watch is restarting.");
      setTimeout(() => setBleStatus(""), 4000);
      
    } catch (error) {
      console.error(error);
      setBleStatus("Bluetooth Error: " + error.message);
      setTimeout(() => setBleStatus(""), 5000);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-red-500/30 selection:text-red-200">
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-600/10 blur-[120px] pointer-events-none"></div>
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none"></div>

      <header className="sticky top-0 z-20 bg-slate-950/70 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between shadow-lg shadow-black/50 relative">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-red-500 to-rose-700 w-11 h-11 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-red-400/30">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">Nexus <span className="text-red-500">Core</span></h1>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">{session.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => supabase.auth.signOut()} className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Sign Out</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 md:p-10 relative z-10">
        
        {/* Hardware Link Section */}
        <div className="mb-10 p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              Link Your Watch
            </h3>
            <p className="text-sm text-slate-400 mt-1">Generate a Device Token and beam it directly to your watch via Bluetooth.</p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            {!deviceToken ? (
              <button onClick={generateToken} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                Generate Token
              </button>
            ) : (
              <div className="flex gap-2">
                 <button onClick={handleBluetoothSetup} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Setup via Bluetooth
                </button>
              </div>
            )}
            {bleStatus && <p className="text-xs font-bold text-blue-400 animate-pulse">{bleStatus}</p>}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-3xl font-bold tracking-tight text-white">Your Timeline</h2>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-60">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-red-500 rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(239,68,68,0.3)]"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-28 px-4 border border-white/5 rounded-3xl bg-white/[0.02] backdrop-blur-md shadow-2xl relative">
            <h3 className="text-2xl font-bold text-white mb-3">No Logs Found</h3>
            <p className="text-slate-400 max-w-sm mx-auto font-medium">Link your watch and start speaking!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={() => deleteEvent(event.id)} openModal={(title, text) => setSummaryModal({ isOpen: true, title, text })} />
            ))}
          </div>
        )}
      </main>

      {/* Summary Modal */}
      {summaryModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">AI Summary: {summaryModal.title}</h3>
              <button onClick={() => setSummaryModal({ isOpen: false, text: '', title: '' })} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto text-slate-300 leading-relaxed whitespace-pre-wrap">{summaryModal.text}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, openModal, onDelete }) {
  const isMeeting = event.type === 'meeting';
  const isPresentation = event.type === 'presentation';
  const timeFormatted = new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = new Date(event.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

  const handleGeneratePPT = async () => {
    alert("Generating PPT uses the backend. Make sure your local backend is running!");
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
    alert("Generating summary uses the backend. Make sure local backend is running!");
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
    <div className="group relative bg-slate-900/60 backdrop-blur-md p-7 rounded-3xl border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <button onClick={onDelete} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>

      <div className="flex items-start justify-between relative z-10">
        <div className="flex items-start gap-5">
           <div className={`p-4 rounded-2xl shadow-lg border ${
            isMeeting ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
            isPresentation ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
             {isMeeting ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
             ) : isPresentation ? (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
             ) : (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
             )}
          </div>
          <div className="pr-12">
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-bold uppercase tracking-widest ${
                isMeeting ? 'text-blue-400' : isPresentation ? 'text-red-500' : 'text-emerald-400'
              }`}>{isMeeting ? 'Scheduled Task' : isPresentation ? 'Presentation Log' : 'Voice Note'}</span>
              <span className="text-slate-600 font-bold">•</span>
              <span className="text-xs font-medium text-slate-500">{dateFormatted} at {timeFormatted}</span>
            </div>
            
            <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-md">
              {isPresentation || isMeeting ? event.title : 'Quick Note'}
            </h3>

            {(isPresentation || !isMeeting) && (
              <div className="mt-5 text-slate-300 text-sm leading-relaxed bg-slate-800/30 p-5 rounded-2xl border border-white/5 font-medium">
                {event.content}
              </div>
            )}

            {isPresentation && (
              <div className="mt-6 flex flex-wrap gap-4">
                <button onClick={handleGeneratePPT} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  GENERATE PPT
                </button>
                <button onClick={handleGenerateSummary} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-sm font-bold flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  AI SUMMARY
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
