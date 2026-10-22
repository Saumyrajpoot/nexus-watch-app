import React, { useState } from 'react';

export default function TwilioDispatcher({
  phoneNumber,
  setPhoneNumber,
  onSavePhoneNumber,
  events = []
}) {
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [testCallStatus, setTestCallStatus] = useState('');

  const scheduledCalls = events.filter(e => e.type === 'meeting' && e.time && new Date(e.time) > new Date());
  const completedCalls = events.filter(e => e.type === 'meeting_done' || (e.type === 'meeting' && e.time && new Date(e.time) <= new Date()));

  const handleSimulateCall = () => {
    setIsTestingCall(true);
    setTestCallStatus('Connecting to Jarvis Neural Voice Agent...');

    // Use browser speech synthesis to simulate the call!
    if ('speechSynthesis' in window) {
      setTimeout(() => {
        setTestCallStatus('📞 Inbound Call from Nexus AI Assistant...');
        const utter = new SpeechSynthesisUtterance("Hello Commander. This is your Nexus Assistant. You have a scheduled tactical task starting now. Good luck!");
        utter.rate = 1.0;
        utter.pitch = 0.95;
        utter.onend = () => {
          setIsTestingCall(false);
          setTestCallStatus('✓ Call completed and logged successfully.');
        };
        window.speechSynthesis.speak(utter);
      }, 1000);
    } else {
      setTimeout(() => {
        setIsTestingCall(false);
        setTestCallStatus('✓ Simulated voice dispatch triggered.');
      }, 2000);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></span>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Jarvis AI Voice Call Dispatcher
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Automated telephone reminders and waking calls powered by Twilio and Amazon Polly Neural Voice.
            </p>
          </div>

          <button
            onClick={handleSimulateCall}
            disabled={isTestingCall}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>{isTestingCall ? 'Simulating Call...' : 'Test Voice Alert Now'}</span>
          </button>
        </div>

        {testCallStatus && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950/90 border border-white/10 text-xs font-mono-tech text-blue-400">
            {testCallStatus}
          </div>
        )}
      </div>

      {/* Settings & Queue in 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Phone Number Configuration */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10">
          <span className="text-[10px] font-mono-tech uppercase font-bold text-blue-400 tracking-wider">
            RECIPIENT TELEPHONY
          </span>
          <h3 className="text-lg font-bold text-white mt-1 mb-2">
            Target Mobile Number
          </h3>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Twilio will place an automated outbound phone call to this number whenever an upcoming meeting or reminder reaches its scheduled execution timestamp.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono-tech text-slate-400 mb-1.5">
                PHONE NUMBER (E.164 FORMAT WITH COUNTRY CODE)
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+919876543210 or +1..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono-tech placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
              />
            </div>

            <button
              onClick={onSavePhoneNumber}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all"
            >
              Save Phone Configuration
            </button>

            <p className="text-[10px] font-mono-tech text-slate-500 text-center">
              Twilio Trial Mode requires the recipient number to be verified in Twilio Console.
            </p>
          </div>
        </div>

        {/* Live Calling Queue */}
        <div className="glass-panel p-6 rounded-3xl border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-mono-tech uppercase font-bold text-cyan-400 tracking-wider">
                DISPATCH QUEUE
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Armed Automated Calls
              </h3>
            </div>
            <span className="text-xs font-mono-tech bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/30 font-bold">
              {scheduledCalls.length} Pending
            </span>
          </div>

          {scheduledCalls.length === 0 ? (
            <div className="bg-slate-950/60 rounded-2xl p-6 text-center border border-white/5 my-4">
              <svg className="w-8 h-8 text-slate-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-mono-tech text-slate-400">
                No scheduled calls in the upcoming queue.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Use "+ Capture" to schedule a meeting with automated wake-up alerts.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 my-2 max-h-60 overflow-y-auto">
              {scheduledCalls.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950 border border-blue-500/20 p-3.5 rounded-2xl flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{item.title}</h4>
                    <p className="text-[10px] font-mono-tech text-blue-400 mt-0.5">
                      {new Date(item.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono-tech font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ARMED
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono-tech text-slate-500">
            <span>Cron Sweep: Every 60s</span>
            <span>Synthesizer: Polly.Matthew-Neural</span>
          </div>
        </div>

      </div>

    </div>
  );
}
