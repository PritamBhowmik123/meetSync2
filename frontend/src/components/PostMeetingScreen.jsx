import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  ListChecks,
  Users,
  Copy,
  Check,
  Download,
  ArrowLeft,
  RotateCcw,
  Search,
  MessageSquare,
  Clock,
  Database
} from 'lucide-react';
import { generateMeetingSummary } from '../services/summarizer';
import { authService } from '../services/auth';

export const PostMeetingScreen = ({
  data,
  onReturnHome,
  onRejoin
}) => {
  const {
    roomId = 'meeting-room',
    userName = 'Participant',
    transcript = [],
    messages = [],
    duration = '0m',
    endedAt = new Date().toISOString()
  } = data || {};

  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'transcript'
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSavedInDb, setIsSavedInDb] = useState(false);
  const [actionItemChecked, setActionItemChecked] = useState({});

  // Generate structured summary from captions and chat
  const [summaryData, setSummaryData] = useState(() => {
    return generateMeetingSummary({
      transcript,
      chatMessages: messages,
      roomId,
      title: `Meeting ${roomId}`,
      duration
    });
  });

  // Save to Neon DB in background on load
  useEffect(() => {
    const saveToNeon = async () => {
      try {
        const payload = {
          meetingCode: roomId,
          title: summaryData.title,
          overview: summaryData.overview,
          keyPoints: summaryData.keyPoints,
          actionItems: summaryData.actionItems,
          transcript,
          duration
        };
        await authService.saveMeetingSummary(payload);
        setIsSavedInDb(true);
      } catch (err) {
        console.warn('Failed to auto-save summary in Neon DB:', err);
      }
    };

    saveToNeon();
  }, [roomId, summaryData, transcript, duration]);

  // Toggle action item checkbox
  const toggleActionItem = (idx) => {
    setActionItemChecked((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Copy full transcript & summary to clipboard
  const handleCopy = async () => {
    const textContent = `MEETSYNC MEETING SUMMARY & TRANSCRIPT
====================================
Meeting Code: ${roomId}
Duration: ${duration}
Ended: ${new Date(endedAt).toLocaleString()}

OVERVIEW:
${summaryData.overview}

KEY DISCUSSION POINTS:
${summaryData.keyPoints.map((k) => `• ${k}`).join('\n')}

ACTION ITEMS:
${summaryData.actionItems.map((a) => `[ ] ${a.task} (${a.assignee})`).join('\n')}

FULL TRANSCRIPT:
${transcript.map((t) => `[${t.time}] ${t.senderName}: ${t.text}`).join('\n')}
`;
    await navigator.clipboard.writeText(textContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download notes as .txt file
  const handleDownload = () => {
    const textContent = `MEETSYNC MEETING SUMMARY & TRANSCRIPT
====================================
Meeting Code: ${roomId}
Duration: ${duration}
Date: ${new Date(endedAt).toLocaleString()}

OVERVIEW
--------
${summaryData.overview}

KEY DISCUSSION POINTS
---------------------
${summaryData.keyPoints.map((k) => `• ${k}`).join('\n')}

ACTION ITEMS
------------
${summaryData.actionItems.map((a) => `- [ ] ${a.task} (Assigned to: ${a.assignee})`).join('\n')}

FULL TRANSCRIPT
---------------
${transcript.length > 0 ? transcript.map((t) => `[${t.time}] ${t.senderName}: ${t.text}`).join('\n') : '(No speech captions recorded)'}
`;
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `MeetSync-${roomId}-Summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter transcript lines based on search query
  const filteredTranscript = transcript.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.text.toLowerCase().includes(query) ||
      item.senderName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen w-screen bg-[#202124] text-white flex flex-col justify-between overflow-y-auto select-none">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-[#3c4043]/60 bg-[#282a2d]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-white leading-tight">
              Meeting Overview & AI Summary
            </h1>
            <p className="text-xs text-gray-400 font-mono">
              Room: <span className="text-[#8ab4f8]">{roomId}</span> • Duration: {duration}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSavedInDb && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-medium text-emerald-300">
              <Database size={12} className="text-emerald-400" />
              Saved to Neon DB
            </span>
          )}

          <button
            onClick={onReturnHome}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3c4043] hover:bg-[#4a4e52] text-xs font-medium text-gray-200 transition-colors"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to Home</span>
          </button>

          {onRejoin && (
            <button
              onClick={onRejoin}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1a73e8] hover:bg-[#1765cc] text-xs font-medium text-white transition-all shadow-md"
            >
              <RotateCcw size={14} />
              <span>Rejoin</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 select-text">
        {/* Navigation Tabs & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="flex bg-[#282a2d] p-1 rounded-xl border border-[#3c4043] self-start select-none">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === 'summary'
                  ? 'bg-[#1a73e8] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles size={16} />
              <span>Executive Summary</span>
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                activeTab === 'transcript'
                  ? 'bg-[#1a73e8] text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText size={16} />
              <span>Live Transcript ({transcript.length})</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 select-none">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] border border-[#3c4043] text-xs font-medium text-gray-300 hover:text-white transition-colors"
              title="Copy Summary & Transcript"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#282a2d] hover:bg-[#3c4043] border border-[#3c4043] text-xs font-medium text-gray-300 hover:text-white transition-colors"
              title="Download Notes as TXT"
            >
              <Download size={14} />
              <span>Download Notes</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Executive Summary */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Overview Card */}
            <div className="bg-[#282a2d] border border-[#3c4043] rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3 text-[#8ab4f8]">
                <Sparkles size={18} />
                <h2 className="text-sm font-semibold uppercase tracking-wider">
                  Session Overview
                </h2>
              </div>
              <p className="text-sm sm:text-base text-gray-200 leading-relaxed">
                {summaryData.overview}
              </p>

              {/* Quick stats pills */}
              <div className="flex flex-wrap items-center gap-3 mt-6 pt-5 border-t border-[#3c4043]">
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#202124] px-3 py-1.5 rounded-lg border border-[#3c4043]">
                  <Clock size={14} className="text-[#8ab4f8]" />
                  <span>Duration: <strong>{duration}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#202124] px-3 py-1.5 rounded-lg border border-[#3c4043]">
                  <Users size={14} className="text-emerald-400" />
                  <span>Speakers: <strong>{summaryData.speakers.length || 1}</strong></span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-[#202124] px-3 py-1.5 rounded-lg border border-[#3c4043]">
                  <FileText size={14} className="text-amber-400" />
                  <span>Transcribed Words: <strong>~{summaryData.wordCount}</strong></span>
                </div>
              </div>
            </div>

            {/* Grid: Key Points & Action Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Discussion Points */}
              <div className="bg-[#282a2d] border border-[#3c4043] rounded-3xl p-6 shadow-xl flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-[#8ab4f8]">
                  <CheckCircle2 size={18} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">
                    Key Discussion Points
                  </h3>
                </div>

                <div className="space-y-3 flex-1">
                  {summaryData.keyPoints.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No specific discussion points extracted.</p>
                  ) : (
                    summaryData.keyPoints.map((point, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-[#202124] border border-[#3c4043]/60"
                      >
                        <span className="w-5 h-5 rounded-full bg-blue-900/40 text-[#8ab4f8] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm text-gray-300 leading-normal">
                          {point}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-[#282a2d] border border-[#3c4043] rounded-3xl p-6 shadow-xl flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-[#8ab4f8]">
                  <ListChecks size={18} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">
                    Action Items & Tasks
                  </h3>
                </div>

                <div className="space-y-3 flex-1">
                  {summaryData.actionItems.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No specific action items identified.</p>
                  ) : (
                    summaryData.actionItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => toggleActionItem(idx)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          actionItemChecked[idx]
                            ? 'bg-[#202124]/40 border-emerald-500/30 opacity-70'
                            : 'bg-[#202124] border-[#3c4043]/60 hover:border-[#8ab4f8]/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(actionItemChecked[idx])}
                          onChange={() => {}}
                          className="mt-1 rounded border-gray-600 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                        <div className="flex-1">
                          <p
                            className={`text-xs sm:text-sm font-medium ${
                              actionItemChecked[idx]
                                ? 'line-through text-gray-400'
                                : 'text-gray-200'
                            }`}
                          >
                            {item.task}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Assignee: <span className="text-blue-300">{item.assignee}</span>
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Speaker Breakdown */}
            {summaryData.speakers.length > 0 && (
              <div className="bg-[#282a2d] border border-[#3c4043] rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-2 mb-4 text-[#8ab4f8]">
                  <Users size={18} />
                  <h3 className="text-sm font-semibold uppercase tracking-wider">
                    Speaker Participation
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {summaryData.speakers.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-[#202124] border border-[#3c4043] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                          {s.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{s.name}</p>
                          <p className="text-[10px] text-gray-400">{s.contributions} statements</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#8ab4f8] bg-[#1a73e8]/10 px-2 py-1 rounded-md">
                        {s.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Full Live Transcript */}
        {activeTab === 'transcript' && (
          <div className="bg-[#282a2d] border border-[#3c4043] rounded-3xl p-6 shadow-xl space-y-4">
            {/* Search Bar */}
            <div className="relative select-none">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words spoken in the meeting..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#202124] border border-[#3c4043] focus:border-[#8ab4f8] focus:outline-none text-white text-xs sm:text-sm placeholder-gray-500 transition-colors"
              />
            </div>

            {/* Transcript Stream */}
            <div className="divide-y divide-[#3c4043]/40 max-h-[60vh] overflow-y-auto pr-1">
              {filteredTranscript.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <MessageSquare size={32} className="mx-auto text-gray-500 mb-2" />
                  <p className="text-sm font-medium">
                    {transcript.length === 0
                      ? 'No spoken captions were recorded during this session.'
                      : 'No transcript matches your search query.'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {transcript.length === 0
                      ? 'Tip: Turn on Live Captions (CC) during your next meeting to automatically capture everything spoken.'
                      : 'Try typing a different keyword or name.'}
                  </p>
                </div>
              ) : (
                filteredTranscript.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-300 flex items-center justify-center text-xs font-semibold shrink-0 select-none">
                      {item.senderName ? item.senderName.slice(0, 2).toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 select-none">
                        <span className="text-xs font-semibold text-gray-200">
                          {item.senderName}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-normal">
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-500 border-t border-[#3c4043]/30 select-none">
        MeetSync • Real-Time AI Meeting Summary & Transcript
      </footer>
    </div>
  );
};
