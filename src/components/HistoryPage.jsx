import React, { useState, useEffect } from 'react';
import { FaTrash, FaBrain, FaSmile, FaClock } from 'react-icons/fa';
import Sidebar from './Sidebar';

const HistoryPage = ({ onBack, onHomeClick, onMentalStateClick, onHistoryClick, onFAQsClick }) => {
  const [history, setHistory] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    const savedHistory = localStorage.getItem('analysisHistory');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.reverse()); // Show newest first
      } catch (e) {
        console.error('Error loading history:', e);
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  };

  // ⭐ Clear all history
  const clearHistory = () => {
    localStorage.removeItem('analysisHistory');
    localStorage.removeItem('latestAnalysis');
    setHistory([]);
    setShowClearConfirm(false);
    console.log('✅ History cleared');
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  // Get emotion color
  const getEmotionColor = (emotion) => {
    const colors = {
      'joy': 'text-yellow-400',
      'sadness': 'text-blue-400',
      'anger': 'text-red-400',
      'fear': 'text-purple-400',
      'surprise': 'text-green-400',
      'disgust': 'text-orange-400',
      'neutral': 'text-gray-400',
    };
    return colors[emotion.toLowerCase()] || 'text-purple-400';
  };

  // Get mental state color
  const getMentalStateColor = (state) => {
    const colors = {
      'normal': 'text-green-400',
      'anxiety': 'text-yellow-400',
      'depression': 'text-blue-400',
      'stress': 'text-red-400',
      'bipolar': 'text-purple-400',
      'suicidal': 'text-red-600',
    };
    return colors[state.toLowerCase()] || 'text-purple-400';
  };

  return (
    <div className="flex h-screen bg-[#0a0515] text-white overflow-hidden">
      
      {/* Sidebar */}
      <Sidebar 
        onHomeClick={onHomeClick}
        onMentalStateClick={onMentalStateClick}
        onHistoryClick={onHistoryClick}
        onFAQsClick={onFAQsClick}
        currentPage="history"
      />

      <div className="flex flex-col flex-1 relative overflow-hidden bg-gradient-to-br from-[#0a0515] via-[#140a2e] to-[#0a0515]">

        {/* Animated Stars */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {[...Array(80)].map((_, i) => (
            <div 
              key={i} 
              className="absolute bg-white rounded-full opacity-30 animate-pulse"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
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
                {history.length > 0 
                  ? `${history.length} conversation${history.length !== 1 ? 's' : ''} analyzed`
                  : 'No analysis history yet'}
              </p>
            </div>

            {/* Clear Button */}
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

        {/* ⭐ Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1a1035] border border-purple-500/30 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-3">Clear All History?</h3>
              <p className="text-purple-300/80 mb-6">
                This will permanently delete all {history.length} analysis record{history.length !== 1 ? 's' : ''}. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full transition-all text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={clearHistory}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-full transition-all text-white font-semibold"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 relative z-10">
          
          {history.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center mb-4">
                <FaClock className="text-5xl text-purple-400" />
              </div>
              <h2 className="text-2xl font-semibold text-purple-300 mb-2">No History Yet</h2>
              <p className="text-purple-300/60 max-w-md">
                Your conversation analyses will appear here. Start chatting or use voice to see your emotional journey!
              </p>
              <button
                onClick={onHomeClick}
                className="mt-6 px-6 py-3 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/30 rounded-full transition-all text-white"
              >
                Start a Conversation
              </button>
            </div>
          ) : (
            // History Timeline
            <div className="max-w-4xl mx-auto space-y-4">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="bg-[#1a1035]/60 border border-purple-500/20 rounded-2xl p-5 backdrop-blur-md hover:border-purple-500/40 transition-all animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-purple-300/60 text-sm">
                      <FaClock className="text-xs" />
                      {formatTime(item.timestamp)}
                    </div>
                  </div>

                  {/* User Text */}
                  <div className="mb-4">
                    <p className="text-white leading-relaxed">
                      "{item.userText}"
                    </p>
                  </div>

                  {/* Analysis Results */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Emotion */}
                    <div className="bg-[#0a0515]/50 rounded-xl p-4 border border-purple-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <FaSmile className="text-purple-400" />
                        <span className="text-purple-300/80 text-sm font-semibold">Emotion</span>
                      </div>
                      <div className={`text-2xl font-bold ${getEmotionColor(item.emotion.label)}`}>
                        {item.emotion.label}
                      </div>
                      <div className="text-purple-300/60 text-sm mt-1">
                        {item.emotion.confidence}% confidence
                      </div>
                    </div>

                    {/* Mental State */}
                    <div className="bg-[#0a0515]/50 rounded-xl p-4 border border-purple-500/10">
                      <div className="flex items-center gap-2 mb-2">
                        <FaBrain className="text-purple-400" />
                        <span className="text-purple-300/80 text-sm font-semibold">Mental State</span>
                      </div>
                      <div className={`text-2xl font-bold ${getMentalStateColor(item.mentalHealth.label)}`}>
                        {item.mentalHealth.label}
                      </div>
                      <div className="text-purple-300/60 text-sm mt-1">
                        {item.mentalHealth.confidence}% confidence
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Back Button */}
        <div className="relative z-10 p-4 border-t border-purple-500/20">
          <button
            onClick={onBack}
            className="px-6 py-3 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full transition-all text-white"
          >
            ← Back to Home
          </button>
        </div>

      </div>
    </div>
  );
};

export default HistoryPage;