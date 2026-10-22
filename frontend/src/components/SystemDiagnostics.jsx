import React, { useState } from 'react';

export default function SystemDiagnostics({
  backendUrl = 'http://localhost:3000',
  onResetData,
  eventsCount = 0
}) {
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    setTestResult('Running complete telemetry audit...');

    try {
      const ping = await fetch(`${backendUrl}/api/events`).then(r => r.ok).catch(() => false);
      const groqRes = await fetch(`${backendUrl}/test-groq`).then(r => r.json()).catch(() => ({ success: false }));

      setTestResult({
        backendOnline: ping,
        groqStatus: groqRes.success ? 'Operational (llama-3.3-70b)' : 'Key verification needed in backend/.env',
        timestamp: new Date().toLocaleTimeString(),
        totalLogs: eventsCount
      });
    } catch (e) {
      setTestResult({
        backendOnline: false,
        error: e.message
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Diagnostics Header */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <h2 className="text-xl font-bold text-white tracking-wide">
                System Diagnostics & Pipeline Health
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Inspect backend service connections, model inferences, and telemetry performance benchmarks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onResetData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-mono-tech rounded-xl transition-colors"
            >
              Reset Sample Logs
            </button>
            <button
              onClick={runDiagnostics}
              disabled={testing}
              className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all disabled:opacity-50"
            >
              {testing ? 'Auditing...' : 'Run Diagnostics'}
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Architecture Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="glass-panel p-5 rounded-3xl border border-white/10">
          <span className="text-[10px] font-mono-tech uppercase font-bold text-rose-400">HARDWARE LAYER</span>
          <h4 className="text-sm font-bold text-white mt-1 mb-2">ESP32 + INMP441</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Captures raw 16-bit PCM audio stream at 16,000 samples per second. Transmits over WebSockets in real time.
          </p>
          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
            WS://localhost:3000/audio-stream
          </span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-white/10">
          <span className="text-[10px] font-mono-tech uppercase font-bold text-purple-400">INFERENCE LAYER</span>
          <h4 className="text-sm font-bold text-white mt-1 mb-2">Whisper-v3 + Llama-3.3</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Converts raw PCM buffer into WAV format, transcribes verbatim via Groq Whisper, and routes intent with Llama-3.3-70b.
          </p>
          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
            310ms Avg Response Time
          </span>
        </div>

        <div className="glass-panel p-5 rounded-3xl border border-white/10">
          <span className="text-[10px] font-mono-tech uppercase font-bold text-blue-400">DISPATCH & DATA</span>
          <h4 className="text-sm font-bold text-white mt-1 mb-2">Twilio & Supabase</h4>
          <p className="text-xs text-slate-400 leading-relaxed mb-3">
            Schedules automated telephone calls via Twilio Voice API and synchronizes realtime database entries.
          </p>
          <span className="text-[10px] font-mono-tech px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
            Polly Neural Voice Ready
          </span>
        </div>

      </div>

      {/* Diagnostics Report Card */}
      {testResult && typeof testResult === 'object' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 font-mono-tech text-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-slate-400">
            <span>AUDIT REPORT</span>
            <span>{testResult.timestamp}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Local Express Server (Port 3000):</span>
            <span className={testResult.backendOnline ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
              {testResult.backendOnline ? 'ONLINE (200 OK)' : 'OFFLINE'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Groq AI Engine:</span>
            <span className="text-slate-200">{testResult.groqStatus}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-400">Active Intelligence Events:</span>
            <span className="text-cyan-400 font-bold">{testResult.totalLogs} logs</span>
          </div>
        </div>
      )}

    </div>
  );
}
