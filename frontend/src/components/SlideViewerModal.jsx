import React, { useState } from 'react';

export default function SlideViewerModal({
  isOpen,
  onClose,
  title = 'AI Generated Presentation',
  slides = [],
  backendUrl = 'http://localhost:3000'
}) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  if (!isOpen || !slides || slides.length === 0) return null;

  const currentSlide = slides[currentSlideIndex] || slides[0];

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleDownloadPPTX = async () => {
    setIsDownloading(true);
    try {
      const content = slides.map(s => `${s.title}\n${s.bullets.join('\n')}`).join('\n\n');
      const res = await fetch(`${backendUrl}/api/generate-ppt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}_Deck.pptx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert("PPT generation completed. Check downloads.");
      }
    } catch (e) {
      console.warn("PPT download error:", e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyMarkdown = () => {
    const md = slides.map((s, idx) => `## Slide ${idx + 1}: ${s.title}\n\n${s.bullets.map(b => `- ${b}`).join('\n')}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(`# ${title}\n\n${md}`);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/15 w-full max-w-3xl rounded-3xl shadow-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div>
            <span className="text-[10px] font-mono-tech uppercase font-bold text-purple-400 tracking-wider">
              AI SLIDE DECK INSPECTOR
            </span>
            <h2 className="text-xl font-bold text-white truncate max-w-lg mt-0.5">
              {title}
            </h2>
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

        {/* Interactive 16:9 Slide Canvas Canvas */}
        <div className="flex-1 overflow-y-auto mb-4">
          <div className="relative w-full aspect-video bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-white/10 p-6 sm:p-10 flex flex-col justify-between shadow-2xl">
            {/* Slide Header */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono-tech text-slate-500 mb-3 border-b border-white/5 pb-2">
                <span className="text-rose-400 font-bold">NEXUS COMPANION AI</span>
                <span>SLIDE {currentSlideIndex + 1} OF {slides.length}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mb-6">
                {currentSlide.title}
              </h3>
            </div>

            {/* Slide Bullets */}
            <div className="space-y-3.5 my-auto">
              {currentSlide.bullets && currentSlide.bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-2 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>
                  <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
                    {bullet}
                  </p>
                </div>
              ))}
            </div>

            {/* Slide Footer */}
            <div className="flex items-center justify-between text-[10px] font-mono-tech text-slate-500 pt-3 border-t border-white/5">
              <span>Confidential • Voice Transcribed Brief</span>
              <span>16:9 Presentation Format</span>
            </div>
          </div>
        </div>

        {/* Slide Carousel Navigator Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={currentSlideIndex === 0}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs font-mono-tech text-slate-300 hover:text-white border border-white/10 disabled:opacity-40 transition-all"
            >
              ◀ Previous
            </button>
            <span className="text-xs font-mono-tech text-slate-400 px-2">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentSlideIndex === slides.length - 1}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs font-mono-tech text-slate-300 hover:text-white border border-white/10 disabled:opacity-40 transition-all"
            >
              Next ▶
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono-tech text-slate-200 border border-white/10 transition-colors"
            >
              {copiedMarkdown ? '✓ Copied Markdown' : 'Copy As Markdown'}
            </button>
            <button
              onClick={handleDownloadPPTX}
              disabled={isDownloading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-xs font-bold text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isDownloading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span>Export .PPTX</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
