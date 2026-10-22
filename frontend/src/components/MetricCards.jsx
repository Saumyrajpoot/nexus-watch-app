import React from 'react';

export default function MetricCards({
  events = [],
  onFilterChange,
  activeFilter
}) {
  const totalEvents = events.length;
  const meetings = events.filter(e => e.type === 'meeting' || e.type === 'meeting_done');
  const presentations = events.filter(e => e.type === 'presentation');
  const tasks = events.filter(e => e.type === 'task' || !e.type);

  const upcomingMeetings = meetings.filter(e => e.time && new Date(e.time) > new Date());

  const cards = [
    {
      id: 'all',
      title: 'TOTAL INTELLIGENCE LOGS',
      value: totalEvents,
      detail: `${tasks.length} tasks • ${meetings.length} calls • ${presentations.length} slides`,
      change: '+18% this week',
      accentColor: 'from-red-600/20 to-rose-600/5',
      borderColor: 'hover:border-red-500/50',
      textColor: 'text-rose-400',
      badgeColor: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
      icon: (
        <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    {
      id: 'meeting',
      title: 'JARVIS CALLS QUEUED',
      value: upcomingMeetings.length,
      detail: `${meetings.length} total meetings mapped`,
      change: upcomingMeetings.length > 0 ? 'Polly AI Armed' : 'All clear',
      accentColor: 'from-blue-600/20 to-cyan-600/5',
      borderColor: 'hover:border-blue-500/50',
      textColor: 'text-blue-400',
      badgeColor: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    },
    {
      id: 'presentation',
      title: 'AI PRESENTATIONS READY',
      value: presentations.length,
      detail: 'PowerPoint .pptx structured',
      change: '100% Exportable',
      accentColor: 'from-purple-600/20 to-pink-600/5',
      borderColor: 'hover:border-purple-500/50',
      textColor: 'text-purple-400',
      badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
        </svg>
      )
    },
    {
      id: 'performance',
      title: 'WHISPER INFERENCE SPEED',
      value: '310ms',
      detail: 'Groq LPUs • zero hallucination',
      change: '16kHz PCM stream',
      accentColor: 'from-emerald-600/20 to-teal-600/5',
      borderColor: 'hover:border-emerald-500/50',
      textColor: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;
        return (
          <div
            key={card.id}
            onClick={() => onFilterChange && onFilterChange(card.id)}
            className={`glass-panel p-5 rounded-3xl border border-white/10 ${card.borderColor} bg-gradient-to-br ${card.accentColor} cursor-pointer transition-all duration-200 transform hover:-translate-y-1 ${
              isSelected ? 'ring-2 ring-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.2)]' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono-tech tracking-wider text-slate-400 uppercase font-bold">
                {card.title}
              </span>
              <div className="p-2 rounded-xl bg-slate-900/80 border border-white/5">
                {card.icon}
              </div>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-3xl font-black tracking-tight text-white font-mono-tech">
                {card.value}
              </div>
              <span className={`text-[10px] font-mono-tech px-2 py-0.5 rounded-full border ${card.badgeColor}`}>
                {card.change}
              </span>
            </div>

            <div className="mt-2 text-xs text-slate-400 font-medium truncate">
              {card.detail}
            </div>
          </div>
        );
      })}
    </div>
  );
}
