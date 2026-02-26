import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInputBar from './components/ChatInputBar';
import VoicePage from './components/VoicePage';
import MentalStatePage from './components/MentalStatePage';
import HistoryPage from './components/HistoryPage';
import FAQsPage from './components/FAQsPage';

const API_BASE = "http://localhost:8000";

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initial bot welcome message on page load
  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      setMessages([
        {
          text: `Hello! I'm here to listen and support you.\nFeel free to share what's on your mind today. You can type your message or use the speak button to talk to me directly.`,
          sender: 'bot'
        }
      ]);
      setIsTyping(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // Format label for display
  const formatLabel = (str) => {
    return str
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Analyze text with API
  const analyzeText = async (text) => {
    if (!text.trim()) {
      console.log('⚠️ No text to analyze');
      return;
    }

    console.log('🧠 Starting analysis:', text.length, 'chars');
    setIsAnalyzing(true);

    // Show analyzing message
    setMessages(prev => [...prev, {
      text: "Analyzing your message...",
      sender: 'bot'
    }]);

    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      console.log('✅ Analysis complete:', data);

      // ── Correct API response format (v5) ──────────────────
      // data.mental_state.label       → mental health label
      // data.mental_state.confidence  → confidence 0-1
      // data.emotion.label            → emotion label (null if Suicidal)
      // data.emotion.confidence       → emotion confidence
      // data.high_risk                → true if Suicidal
      // data.suicidal_signal.detected → true if Suicidal
      // ──────────────────────────────────────────────────────

      const mentalLabel = data.mental_state?.label || 'Unknown';
      const mentalConf  = data.mental_state?.confidence || 0;
      const emotionLabel = data.emotion?.label || null;
      const emotionConf  = data.emotion?.confidence || 0;
      const isHighRisk   = data.high_risk || false;

      const analysisData = {
        timestamp: new Date().toISOString(),
        userText: text,
        highRisk: isHighRisk,
        emotion: emotionLabel ? {
          label     : formatLabel(emotionLabel),
          confidence: (emotionConf * 100).toFixed(1),
          rawLabel  : emotionLabel,
          rawScore  : emotionConf
        } : null,
        mentalHealth: {
          label     : formatLabel(mentalLabel),
          confidence: (mentalConf * 100).toFixed(1),
          rawLabel  : mentalLabel,
          rawScore  : mentalConf,
          riskLevel : data.mental_state?.risk_level || 'Low',
          allScores : data.mental_state?.all_scores || {}
        }
      };

      // Store in localStorage
      localStorage.setItem('latestAnalysis', JSON.stringify(analysisData));

      const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
      history.push(analysisData);
      if (history.length > 10) history.shift();
      localStorage.setItem('analysisHistory', JSON.stringify(history));

      // Update analyzing message
      setTimeout(() => {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            text: "Analysis complete! Click 'Mental State' in the sidebar to see your emotional analysis and mental health assessment.",
            sender: 'bot'
          };
          return newMessages;
        });
      }, 500);

    } catch (e) {
      console.error('❌ Analysis failed:', e);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          text: "I'm having trouble analyzing right now. But I'm still here to listen.",
          sender: 'bot'
        };
        return newMessages;
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Send message
  const sendMessage = () => {
    if (!message.trim()) return;

    const userMessage = message.trim();

    // Add user message
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);

    // Clear input
    setMessage('');

    // Analyze the message
    analyzeText(userMessage);
  };

  // Navigation handlers
  const handleHomeClick        = () => setCurrentPage('home');
  const handleVoiceClick       = () => setCurrentPage('voice');
  const handleMentalStateClick = () => setCurrentPage('mental-state');
  const handleHistoryClick     = () => setCurrentPage('history');
  const handleFAQsClick        = () => setCurrentPage('faqs');

  // Render pages
  if (currentPage === 'voice') {
    return (
      <VoicePage
        onBack={handleHomeClick}
        onHomeClick={handleHomeClick}
        onMentalStateClick={handleMentalStateClick}
        onHistoryClick={handleHistoryClick}
        onFAQsClick={handleFAQsClick}
      />
    );
  }

  if (currentPage === 'mental-state') {
    return (
      <MentalStatePage
        onBack={handleHomeClick}
        onHomeClick={handleHomeClick}
        onMentalStateClick={handleMentalStateClick}
        onHistoryClick={handleHistoryClick}
        onFAQsClick={handleFAQsClick}
      />
    );
  }

  if (currentPage === 'history') {
    return (
      <HistoryPage
        onBack={handleHomeClick}
        onHomeClick={handleHomeClick}
        onMentalStateClick={handleMentalStateClick}
        onHistoryClick={handleHistoryClick}
        onFAQsClick={handleFAQsClick}
      />
    );
  }

  if (currentPage === 'faqs') {
    return (
      <FAQsPage
        onBack={handleHomeClick}
        onHomeClick={handleHomeClick}
        onMentalStateClick={handleMentalStateClick}
        onHistoryClick={handleHistoryClick}
        onFAQsClick={handleFAQsClick}
      />
    );
  }

  // Home Page
  return (
    <div className="flex h-screen bg-[#0a0515] text-white overflow-hidden">

      {/* Sidebar */}
      <Sidebar
        onHomeClick={handleHomeClick}
        onMentalStateClick={handleMentalStateClick}
        onHistoryClick={handleHistoryClick}
        onFAQsClick={handleFAQsClick}
        currentPage={currentPage}
      />

      {/* Main Content */}
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-3 relative z-10">

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`inline-block px-4 py-2 rounded-2xl backdrop-blur-md shadow-md break-words transition-transform duration-500 transform whitespace-pre-line
                  ${msg.sender === 'user'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white'
                    : 'bg-[#1a1035]/60 border border-purple-500/20 text-purple-200 animate-slideUp'
                  }`}
                style={{ maxWidth: '70%' }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div
                className="inline-flex items-center px-4 py-2 rounded-2xl backdrop-blur-md shadow-md bg-[#1a1035]/60 border border-purple-500/20 animate-fadeIn break-words"
                style={{ maxWidth: '40%' }}
              >
                <span className="text-purple-300 mr-2">Bot is typing</span>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce delay-200"></span>
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce delay-400"></span>
                </div>
              </div>
            </div>
          )}

          {/* Analyzing Indicator */}
          {isAnalyzing && (
            <div className="flex justify-start">
              <div
                className="inline-flex items-center px-4 py-2 rounded-2xl backdrop-blur-md shadow-md bg-[#1a1035]/60 border border-purple-500/20 animate-fadeIn"
                style={{ maxWidth: '40%' }}
              >
                <span className="text-purple-300 mr-2">Analyzing emotions</span>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-200"></span>
                  <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-400"></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="relative z-20">
          <ChatInputBar
            message={message}
            setMessage={setMessage}
            sendMessage={sendMessage}
            onVoiceClick={handleVoiceClick}
          />
        </div>

      </div>
    </div>
  );
}

export default App;