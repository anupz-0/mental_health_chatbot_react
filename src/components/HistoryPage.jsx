import React, { useState, useEffect } from 'react';
import { FaTrash, FaBrain, FaSmile, FaClock } from 'react-icons/fa';
import Sidebar from './Sidebar';

const API_BASE = "http://localhost:8000";

const HistoryPage = ({ onBack, onHomeClick, onMentalStateClick, onHistoryClick, onFAQsClick, onLogout, user }) => {
  const [history, setHistory]               = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [loading, setLoading]               = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const getToken = () => localStorage.getItem('token');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (token) {
        // Load from API if logged in
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
      // Fallback to localStorage
      const saved = localStorage.getItem('analysisHistory');
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(parsed.reverse());
      }
    } catch (e) {
      console.error('Error loading history:', e);
      // Fallback to localStorage on error
      const saved = localStorage.getItem('analysisHistory');
      if (saved) {
        try { setHistory(JSON.parse(saved).reverse()); } catch {}
      }
    } finally {
      setLoading(false);
    }
  };

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
    } catch (e) {
      console.error('Error clearing history:', e);
    }
  };

  const formatTime = (timestamp) => {
    const date     = new Date(timestamp);
    const now      = new Date();
    const diffMs   = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays  = Math.floor(diffMs / 86400000);
    if (diffMins < 1)   return 'Just now';
    if (diffMins < 60)  return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7)   return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
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

  // Normalize item from API or localStorage format
  const getMentalLabel  = (item) => item.mentalHealth?.label  || item.mental_label || 'Unknown';
  const getMentalConf   = (item) => item.mentalHealth?.confidence || (item.mental_conf ? (item.mental_conf * 100).toFixed(1) : '0');
  const getEmotionLabel = (item) => item.emotion?.label       || item.emotion_label || null;
  const getEmotionConf  = (item) => item.emotion?.confidence  || (item.emotion_conf ? (item.emotion_conf * 100).toFixed(1) : '0');
  const getUserText     = (item) => item.userText             || item.user_text     || '';

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
                {loading ? 'Loading...' : history.length > 0
                  ? `${history.length} conversation${history.length !== 1 ? 's' : ''} analyzed`
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
          ) : history.length === 0 ? (
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
              {history.map((item, index) => (
                <div key={index}
                  className="bg-[#1a1035]/60 border border-purple-500/20 rounded-2xl p-5 backdrop-blur-md hover:border-purple-500/40 transition-all">

                  <div className="flex items-center gap-2 text-purple-300/60 text-sm mb-3">
                    <FaClock className="text-xs" />
                    {formatTime(item.timestamp)}
                    {item.highRisk && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-xs">
                        High Risk
                      </span>
                    )}
                  </div>

                  <p className="text-white leading-relaxed mb-4">
                    "{getUserText(item)}"
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Emotion */}
                    {getEmotionLabel(item) ? (
                      <div className="bg-[#0a0515]/50 rounded-xl p-4 border border-purple-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <FaSmile className="text-purple-400" />
                          <span className="text-purple-300/80 text-sm font-semibold">Emotion</span>
                        </div>
                        <div className={`text-2xl font-bold ${getEmotionColor(getEmotionLabel(item))}`}>
                          {getEmotionLabel(item)}
                        </div>
                        <div className="text-purple-300/60 text-sm mt-1">
                          {getEmotionConf(item)}% confidence
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#0a0515]/50 rounded-xl p-4 border border-purple-500/10">
                        <div className="flex items-center gap-2 mb-2">
                          <FaSmile className="text-purple-400" />
                          <span className="text-purple-300/80 text-sm font-semibold">Emotion</span>
                        </div>
                        <div className="text-purple-300/60 text-sm">Not available</div>
                      </div>
                    )}

                    {/* Mental State */}
                    <div className="bg-[#0a0515]/50 rounded-xl p-4 border border-purple-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <FaBrain className="text-purple-400" />
                        <span className="text-purple-300/80 text-sm font-semibold">Mental State</span>
                      </div>
                      <div className={`text-2xl font-bold ${getMentalStateColor(getMentalLabel(item))}`}>
                        {getMentalLabel(item)}
                      </div>
                      <div className="text-purple-300/60 text-sm mt-1">
                        {getMentalConf(item)}% confidence
                      </div>
                    </div>

                  </div>
                </div>
              ))}
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