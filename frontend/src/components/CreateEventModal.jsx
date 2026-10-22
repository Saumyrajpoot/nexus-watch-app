import React, { useState } from 'react';

export default function CreateEventModal({
  isOpen,
  onClose,
  onSubmit
}) {
  const [type, setType] = useState('task'); // 'task', 'meeting', 'presentation'
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('high');
  const [time, setTime] = useState('');
  const [tagsInput, setTagsInput] = useState('Tactical, Audio');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newEvent = {
      id: `evt-${Date.now()}`,
      title: title.trim(),
      type,
      content: content.trim(),
      transcript: content.trim(),
      priority,
      time: type === 'meeting' && time ? new Date(time).toISOString() : null,
      tags,
      created_at: new Date().toISOString(),
      slides: type === 'presentation' ? [
        {
          title: title.trim(),
          bullets: [
            content.substring(0, 80) || "Overview and strategic purpose",
            "Key operational milestones defined",
            "Next steps and execution timeline"
          ]
        },
        {
          title: "Execution & Field Deployment",
          bullets: [
            "Hardware link parameters configured",
            "Telemetry feedback stream active"
          ]
        }
      ] : null
    };

    onSubmit(newEvent);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/15 w-full max-w-xl rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                New Intelligence Log
              </h2>
              <p className="text-[11px] font-mono-tech text-slate-400">
                MANUAL CAPTURE / MISSION OVERRIDE
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Type Selector Pill Tabs */}
          <div>
            <label className="block text-xs font-mono-tech text-slate-400 uppercase tracking-wider mb-2">
              Select Log Classification
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'task', label: '⚡ Task Memo', desc: 'Push-to-Talk action' },
                { id: 'meeting', label: '📞 Jarvis Call', desc: 'Scheduled Voice Call' },
                { id: 'presentation', label: '📊 Slide Deck', desc: 'PPTX Presentation' }
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setType(opt.id)}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    type === opt.id
                      ? 'bg-rose-500/20 border-rose-500/60 text-white shadow-lg'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <p className="text-xs font-bold leading-tight">{opt.label}</p>
                  <p className="text-[10px] text-slate-400 font-mono-tech mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-mono-tech text-slate-400 uppercase tracking-wider mb-1.5">
              Mission / Topic Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Firmware Power Optimization Review"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-medium"
            />
          </div>

          {/* Scheduled Date/Time (if meeting) */}
          {type === 'meeting' && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-xs font-mono-tech text-blue-400 uppercase tracking-wider mb-1.5">
                Target Meeting Time (Automated Call Trigger)
              </label>
              <input
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-blue-500/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono-tech"
              />
            </div>
          )}

          {/* Priority & Tags in 2 Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono-tech text-slate-400 uppercase tracking-wider mb-1.5">
                Priority Tier
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono-tech"
              >
                <option value="critical">Critical (Immediate Call)</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="normal">Normal Log</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono-tech text-slate-400 uppercase tracking-wider mb-1.5">
                Tags (Comma Separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Hardware, Protocol, ESP32"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono-tech"
              />
            </div>
          </div>

          {/* Content / Transcript */}
          <div>
            <label className="block text-xs font-mono-tech text-slate-400 uppercase tracking-wider mb-1.5">
              Dictated Content / Notes
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste dictation transcript, key action points, or presentation outline..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 font-medium leading-relaxed"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-mono-tech font-bold text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all hover:scale-[1.02]"
            >
              Confirm & Catalog Log
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
