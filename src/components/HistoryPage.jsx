import React, { useState, useEffect } from 'react';
import { FaTrash, FaBrain, FaSmile, FaClock, FaComments, FaChevronDown, FaHeart } from 'react-icons/fa';
import Sidebar from './Sidebar';

const API_BASE = "http://localhost:8000";

const HistoryPage = ({ onBack, onHomeClick, onMentalStateClick, onHistoryClick, onFAQsClick, onLogout, user }) => {
  const [history, setHistory]                   = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [loading, setLoading]                   = useState(true);
  const [expandedSession, setExpandedSession]   = useState(null);

  const toggleSession = (id) =>
    setExpandedSession(prev => (prev === id ? null : id));

  useEffect(() => { loadHistory(); }, []);

  const getToken = () => localStorage.getItem('token');

  /* ─── Load raw entries ──────────────────────────────── */
  const loadHistory = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (token) {
        const res = await fetch(`${API_BASE}/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
          setLoading(false);
          return;
        }
      }
      const saved = localStorage.getItem('analysisHistory');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      console.error('Error loading history:', e);
      const saved = localStorage.getItem('analysisHistory');
      if (saved) { try { setHistory(JSON.parse(saved)); } catch {} }
    } finally { setLoading(false); }
  };

  /* ─── Clear ─────────────────────────────────────────── */
  const clearHistory = async () => {
    try {
      const token = getToken();
      if (token) {
        await fetch(`${API_BASE}/history/clear`, {
          method : 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      localStorage.removeItem('analysisHistory');
      localStorage.removeItem('latestAnalysis');
      setHistory([]);
      setShowClearConfirm(false);
    } catch (e) { console.error('Error clearing history:', e); }
  };

  /* ─── Helpers ───────────────────────────────────────── */
  const formatLabel = (str) => {
    if (!str) return str;
    return str
      .replace(/_/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Exact date/time format matching MentalStatePage
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Normalise confidence: if value <= 1 treat as raw 0-1 and multiply by 100
  const normaliseConf = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return 0;
    return n <= 1 ? parseFloat((n * 100).toFixed(1)) : n;
  };

  const getEmotionColor = (emotion) => {
    const colors = {
      joy: 'text-yellow-400', sadness: 'text-blue-400',
      anger: 'text-red-400', fear: 'text-purple-400',
      surprise: 'text-green-400', disgust: 'text-orange-400',
      neutral: 'text-gray-400',
    };
    return colors[emotion?.toLowerCase()] || 'text-purple-400';
  };

  const getMentalStateColor = (state) => {
    const colors = {
      normal: 'text-green-400', anxiety: 'text-yellow-400',
      depression: 'text-blue-400', stress: 'text-red-400',
      bipolar: 'text-purple-400', suicidal: 'text-red-600',
      'personality disorder': 'text-pink-400',
    };
    return colors[state?.toLowerCase()] || 'text-purple-400';
  };

  // normalise API vs localStorage fields — always format labels & fix confidence
  const getMentalLabel  = (item) => formatLabel(item.mentalHealth?.label  || item.mental_label)  || 'Unknown';
  const getMentalConf   = (item) => normaliseConf(item.mentalHealth?.confidence ?? item.mental_conf ?? 0);
  const getEmotionLabel = (item) => formatLabel(item.emotion?.label       || item.emotion_label) || null;
  const getEmotionConf  = (item) => normaliseConf(item.emotion?.confidence  ?? item.emotion_conf ?? 0);
  const getUserText     = (item) => item.userText             || item.user_text     || '';

  /* ────────────────────────────────────────────────────────
     GROUP entries by sessionId → one card per session.
     Legacy entries (no sessionId) are clustered by time:
     messages within 30 minutes of the previous one in the
     same cluster are treated as the same session.
  ──────────────────────────────────────────────────────── */
  const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes

  const groupBySession = (entries) => {
    // Sort chronologically so time-based clustering works
    const sorted = [...entries].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    );

    const map   = new Map();   // sessionId → group
    let legacyIdx = 0;         // counter for legacy clusters
    let lastLegacyKey = null;
    let lastLegacyTime = 0;

    sorted.forEach((item) => {
      let key = item.sessionId || item.session_id;

      // No explicit sessionId → cluster by time proximity
      if (!key) {
        const t = new Date(item.timestamp).getTime();
        if (!lastLegacyKey || t - lastLegacyTime > SESSION_GAP_MS) {
          legacyIdx++;
          lastLegacyKey = `__legacy_${legacyIdx}`;
        }
        lastLegacyTime = t;
        key = lastLegacyKey;
      }

      if (!map.has(key)) {
        map.set(key, {
          sessionId     : key,
          messages      : [],
          firstTimestamp: item.timestamp,
          lastTimestamp : item.timestamp,
          highRisk      : false,
          topEmotion    : null,
          topEmotionConf: 0,
          topMental     : null,
          topMentalConf : 0,
        });
      }
      const g = map.get(key);
      g.messages.push(item);
      g.lastTimestamp = item.timestamp;
      if (item.highRisk) g.highRisk = true;

      // keep highest-confidence emotion
      const ec = getEmotionConf(item);
      if (getEmotionLabel(item) && ec > g.topEmotionConf) {
        g.topEmotion     = getEmotionLabel(item);
        g.topEmotionConf = ec;
      }
      // keep highest-confidence mental state
      const mc = getMentalConf(item);
      if (mc > g.topMentalConf) {
        g.topMental     = getMentalLabel(item);
        g.topMentalConf = mc;
      }
    });

    // Return newest sessions first
    return Array.from(map.values()).reverse();
  };

  const sessions = groupBySession(history);

  /* ─── Render ────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-[#0a0515] text-white overflow-hidden">

      <Sidebar
        onHomeClick       ={onHomeClick}
        onMentalStateClick={onMentalStateClick}
        onHistoryClick    ={onHistoryClick}
        onFAQsClick       ={onFAQsClick}
        onLogout          ={onLogout}
        currentPage       ="history"
        user              ={user}
      />

      <div className="flex flex-col flex-1 relative overflow-hidden bg-gradient-to-br from-[#0a0515] via-[#140a2e] to-[#0a0515]">

        {/* Stars */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {[...Array(80)].map((_, i) => (
            <div key={i} className="absolute bg-white rounded-full opacity-30 animate-pulse"
              style={{
                width : `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top   : `${Math.random() * 100}%`,
                left  : `${Math.random() * 100}%`,
                animationDuration: `${Math.random() * 3 + 2}s`
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="relative z-10 p-6 border-b border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Analysis History
              </h1>
              <p className="text-purple-300/60 mt-1">
                {loading ? 'Loading...' : sessions.length > 0
                  ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''} · ${history.length} message${history.length !== 1 ? 's' : ''} analyzed`
                  : 'No analysis history yet'}
              </p>
            </div>
            {history.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 rounded-full transition-all text-red-400 hover:text-red-300"
              >
                <FaTrash className="text-sm" />
                Clear All
              </button>
            )}
          </div>
        </div>

        {/* Clear Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1a1035] border border-purple-500/30 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-3">Clear All History?</h3>
              <p className="text-purple-300/80 mb-6">
                This will permanently delete all {history.length} record{history.length !== 1 ? 's' : ''}. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full transition-all text-white">
                  Cancel
                </button>
                <button onClick={clearHistory}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-all text-white font-semibold">
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 relative z-10">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-purple-300/60 animate-pulse">Loading history...</div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
                <FaClock className="text-5xl text-purple-400" />
              </div>
              <h2 className="text-2xl font-semibold text-purple-300 mb-2">No History Yet</h2>
              <p className="text-purple-300/60 max-w-md">
                Your conversation analyses will appear here. Start chatting to see your emotional journey!
              </p>
              <button onClick={onHomeClick}
                className="mt-6 px-6 py-3 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded-full transition-all text-white">
                Start a Conversation
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {sessions.map((session) => {
                const isOpen = expandedSession === session.sessionId;
                return (
                  <div key={session.sessionId}
                    className="bg-[#1a1035]/60 border border-purple-500/20 rounded-2xl backdrop-blur-md hover:border-purple-500/40 transition-all overflow-hidden">

                    {/* ── Clickable card header (always visible) ── */}
                    <button
                      onClick={() => toggleSession(session.sessionId)}
                      className="w-full flex items-center justify-between p-5 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Time + count */}
                        <div className="flex items-center gap-2 text-purple-300/60 text-sm shrink-0">
                          <FaClock className="text-xs" />
                          {formatTime(session.firstTimestamp)}
                        </div>

                        <span className="text-purple-500/40">|</span>

                        {/* Quick summary chips */}
                        <span className="flex items-center gap-1 text-purple-400/70 text-sm shrink-0">
                          <FaComments className="text-xs" />
                          {session.messages.length}
                        </span>

                        {session.topMental && (
                          <span className={`text-sm font-semibold truncate ${getMentalStateColor(session.topMental)}`}>
                            {session.topMental}
                          </span>
                        )}
                        {session.topEmotion && (
                          <span className={`text-sm font-semibold truncate ${getEmotionColor(session.topEmotion)}`}>
                            {session.topEmotion}
                          </span>
                        )}

                        {session.highRisk && (
                          <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-xs shrink-0">
                            High Risk
                          </span>
                        )}
                      </div>

                      <FaChevronDown
                        className={`text-purple-400 text-sm transition-transform duration-300 shrink-0 ml-3 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {/* ── Expanded detail panel ── */}
                    {isOpen && (
                      <div className="px-5 pb-5 space-y-4 animate-fadeIn">

                        {/* ── Session-level detection (matches MentalStatePage layout exactly) ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                          {/* Emotion card */}
                          <div className="bg-[#1a1035]/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-blue-500/20 rounded-full">
                                <FaHeart className="text-2xl text-blue-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-purple-300">Emotion Detected</h3>
                                <p className="text-sm text-purple-300/60">Primary emotional state</p>
                              </div>
                            </div>
                            {session.topEmotion ? (
                              <div className="space-y-4">
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-3xl font-bold ${getEmotionColor(session.topEmotion)}`}>
                                      {session.topEmotion}
                                    </span>
                                    <span className="text-2xl font-bold text-purple-300">
                                      {session.topEmotionConf.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="w-full h-3 bg-purple-900/30 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                                      style={{ width: `${session.topEmotionConf}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="pt-4 border-t border-purple-500/20">
                                  <p className="text-sm text-purple-300/70">
                                    Confidence Level: <span className="font-semibold text-purple-300">
                                      {session.topEmotionConf >= 70 ? 'High' : session.topEmotionConf >= 50 ? 'Moderate' : 'Low'}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-24">
                                <p className="text-purple-300/60 text-sm text-center">
                                  Emotion analysis not available
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Mental Health card */}
                          <div className="bg-[#1a1035]/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="p-3 bg-green-500/20 rounded-full">
                                <FaBrain className="text-2xl text-green-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-purple-300">Mental Health State</h3>
                                <p className="text-sm text-purple-300/60">Overall mental wellness indicator</p>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className={`text-3xl font-bold ${getMentalStateColor(session.topMental)}`}>
                                    {session.topMental || 'Unknown'}
                                  </span>
                                  <span className="text-2xl font-bold text-purple-300">
                                    {session.topMentalConf.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full h-3 bg-purple-900/30 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${session.topMentalConf}%` }}
                                  />
                                </div>
                              </div>
                              <div className="pt-4 border-t border-purple-500/20">
                                <p className="text-sm text-purple-300/70">
                                  Confidence Level: <span className="font-semibold text-purple-300">
                                    {session.topMentalConf >= 70 ? 'High' : session.topMentalConf >= 50 ? 'Moderate' : 'Low'}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>

                        </div>

                        {/* ── Individual messages with per-message analysis ── */}
                        <div className="space-y-3">
                          {session.messages.map((msg, mi) => (
                            <div key={mi} className="bg-[#0a0515]/40 rounded-xl p-4 border border-purple-500/10">
                              {/* User text */}
                              <p className="text-white/90 leading-relaxed text-sm mb-3">
                                <span className="text-purple-400 font-semibold mr-1.5">#{mi + 1}</span>
                                &ldquo;{getUserText(msg)}&rdquo;
                              </p>

                              {/* Per-message analysis cards */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Emotion */}
                                {getEmotionLabel(msg) ? (
                                  <div className="bg-[#1a1035]/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="p-2 bg-blue-500/20 rounded-full">
                                        <FaHeart className="text-lg text-blue-400" />
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-semibold text-purple-300">Emotion Detected</h4>
                                        <p className="text-xs text-purple-300/60">Primary emotional state</p>
                                      </div>
                                    </div>
                                    <div className="space-y-3">
                                      <div>
                                        <div className="flex items-center justify-between mb-2">
                                          <span className={`text-2xl font-bold ${getEmotionColor(getEmotionLabel(msg))}`}>
                                            {getEmotionLabel(msg)}
                                          </span>
                                          <span className="text-xl font-bold text-purple-300">
                                            {getEmotionConf(msg).toFixed(1)}%
                                          </span>
                                        </div>
                                        <div className="w-full h-2.5 bg-purple-900/30 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${getEmotionConf(msg)}%` }}
                                          />
                                        </div>
                                      </div>
                                      <div className="pt-3 border-t border-purple-500/20">
                                        <p className="text-xs text-purple-300/70">
                                          Confidence Level: <span className="font-semibold text-purple-300">
                                            {getEmotionConf(msg) >= 70 ? 'High' : getEmotionConf(msg) >= 50 ? 'Moderate' : 'Low'}
                                          </span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-[#1a1035]/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="p-2 bg-blue-500/20 rounded-full">
                                        <FaHeart className="text-lg text-blue-400" />
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-semibold text-purple-300">Emotion Detected</h4>
                                        <p className="text-xs text-purple-300/60">Primary emotional state</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-center h-16">
                                      <p className="text-purple-300/60 text-sm">Not available</p>
                                    </div>
                                  </div>
                                )}

                                {/* Mental state */}
                                <div className="bg-[#1a1035]/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-5">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-green-500/20 rounded-full">
                                      <FaBrain className="text-lg text-green-400" />
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-semibold text-purple-300">Mental Health State</h4>
                                      <p className="text-xs text-purple-300/60">Overall mental wellness indicator</p>
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <span className={`text-2xl font-bold ${getMentalStateColor(getMentalLabel(msg))}`}>
                                          {getMentalLabel(msg)}
                                        </span>
                                        <span className="text-xl font-bold text-purple-300">
                                          {getMentalConf(msg).toFixed(1)}%
                                        </span>
                                      </div>
                                      <div className="w-full h-2.5 bg-purple-900/30 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-1000 ease-out"
                                          style={{ width: `${getMentalConf(msg)}%` }}
                                        />
                                      </div>
                                    </div>
                                    <div className="pt-3 border-t border-purple-500/20">
                                      <p className="text-xs text-purple-300/70">
                                        Confidence Level: <span className="font-semibold text-purple-300">
                                          {getMentalConf(msg) >= 70 ? 'High' : getMentalConf(msg) >= 50 ? 'Moderate' : 'Low'}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {msg.highRisk && (
                                <div className="mt-2">
                                  <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                                    ⚠ High Risk
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Back */}
        <div className="relative z-10 p-4 border-t border-purple-500/20">
          <button onClick={onBack}
            className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full transition-all text-white">
            ← Back to Home
          </button>
        </div>

      </div>
    </div>
  );
};

export default HistoryPage;
