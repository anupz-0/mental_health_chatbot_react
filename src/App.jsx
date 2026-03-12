import React, { useState, useRef, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInputBar from './components/ChatInputBar';
import VoicePage from './components/VoicePage';
import MentalStatePage from './components/MentalStatePage';
import HistoryPage from './components/HistoryPage';
import FAQsPage from './components/FAQsPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/Registerpage';

const API_BASE = "http://localhost:8000";

// Generate a unique session id (resets on every page load / refresh)
const generateSessionId = () =>
  `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

function App() {
  const [messages, setMessages]       = useState([]);
  const [message, setMessage]         = useState('');
  const [isTyping, setIsTyping]       = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');

  // ── Auth state ──────────────────────────────────────────
  const [user, setUser]         = useState(null);
  const [authPage, setAuthPage] = useState('login'); // 'login' | 'register'
  const [authReady, setAuthReady] = useState(false);

  // ── Session tracking (new id each page-load / refresh) ──
  const sessionIdRef = useRef(generateSessionId());

  const messagesEndRef = useRef(null);

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const saved = localStorage.getItem('user');
    if (token && saved) {
      setUser(JSON.parse(saved));
    }
    setAuthReady(true);
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Welcome message
  useEffect(() => {
    if (!user) return;
    setIsTyping(true);
    const timer = setTimeout(() => {
      setMessages([{
        text  : `Hello ${user.name}! I'm here to listen and support you.\nFeel free to share what's on your mind today.`,
        sender: 'bot'
      }]);
      setIsTyping(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [user]);

  // ── Auth handlers ────────────────────────────────────────
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('latestAnalysis');
    localStorage.removeItem('analysisHistory');
    sessionIdRef.current = generateSessionId(); // new session on logout
    setUser(null);
    setMessages([]);
    setCurrentPage('home');
  };

  // ── New Chat ─────────────────────────────────────────────
  const handleNewChat = () => {
    sessionIdRef.current = generateSessionId();
    setMessages([]);
    setMessage('');
    setIsTyping(false);
    setIsAnalyzing(false);
    setCurrentPage('home');
    // Re-show welcome message
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([{
          text  : `Hello ${user.name}! I'm here to listen and support you.\nFeel free to share what's on your mind today.`,
          sender: 'bot'
        }]);
        setIsTyping(false);
      }, 800);
    }, 100);
  };

  const getToken = () => localStorage.getItem('token');

  // ── Format label ─────────────────────────────────────────
  const formatLabel = (str) => {
    return str
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ── Analyze text ─────────────────────────────────────────
  const analyzeText = async (text) => {
    if (!text.trim()) return;
    setIsAnalyzing(true);

    setMessages(prev => [...prev, {
      text  : "Analyzing your message...",
      sender: 'bot'
    }]);

    try {
      const token   = getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/analyze`, {
        method : 'POST',
        headers,
        body   : JSON.stringify({ text, session_id: sessionIdRef.current }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      const mentalLabel  = data.mental_state?.label      || 'Unknown';
      const mentalConf   = data.mental_state?.confidence || 0;
      const emotionLabel = data.emotion?.label            || null;
      const emotionConf  = data.emotion?.confidence       || 0;
      const isHighRisk   = data.high_risk                 || false;

      const analysisData = {
        sessionId : sessionIdRef.current,
        timestamp : new Date().toISOString(),
        userText  : text,
        highRisk  : isHighRisk,
        emotion   : emotionLabel ? {
          label     : formatLabel(emotionLabel),
          confidence: (emotionConf * 100).toFixed(1),
          rawLabel  : emotionLabel,
          rawScore  : emotionConf,
        } : null,
        mentalHealth: {
          label     : formatLabel(mentalLabel),
          confidence: (mentalConf * 100).toFixed(1),
          rawLabel  : mentalLabel,
          rawScore  : mentalConf,
          riskLevel : data.mental_state?.risk_level || 'Low',
          allScores : data.mental_state?.all_scores || {},
        },
      };

      localStorage.setItem('latestAnalysis', JSON.stringify(analysisData));
      const history = JSON.parse(localStorage.getItem('analysisHistory') || '[]');
      history.push(analysisData);
      if (history.length > 10) history.shift();
      localStorage.setItem('analysisHistory', JSON.stringify(history));

      setTimeout(() => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            text  : "Analysis complete! Click 'Mental State' in the sidebar to see your results.",
            sender: 'bot',
          };
          return updated;
        });
      }, 500);

    } catch (e) {
      console.error('Analysis failed:', e);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          text  : "I'm having trouble analyzing right now. But I'm still here to listen.",
          sender: 'bot',
        };
        return updated;
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    const userMessage = message.trim();
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setMessage('');
    analyzeText(userMessage);
  };

  // ── Navigation ───────────────────────────────────────────
  const handleHomeClick        = () => setCurrentPage('home');
  const handleVoiceClick       = () => setCurrentPage('voice');
  const handleMentalStateClick = () => setCurrentPage('mental-state');
  const handleHistoryClick     = () => setCurrentPage('history');
  const handleFAQsClick        = () => setCurrentPage('faqs');

  // ── Auth gate ────────────────────────────────────────────
  if (!authReady) return null; // wait for localStorage check

  if (!user) {
    if (authPage === 'register') {
      return (
        <RegisterPage
          onLoginSuccess={handleLoginSuccess}
          onGoLogin={() => setAuthPage('login')}
        />
      );
    }
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onGoRegister={() => setAuthPage('register')}
      />
    );
  }

  // ── Pages ────────────────────────────────────────────────
  const sharedProps = {
    onBack            : handleHomeClick,
    onHomeClick       : handleHomeClick,
    onMentalStateClick: handleMentalStateClick,
    onHistoryClick    : handleHistoryClick,
    onFAQsClick       : handleFAQsClick,
    onLogout          : handleLogout,
    currentSessionId  : sessionIdRef.current,
    user,
  };

  if (currentPage === 'voice')        return <VoicePage       {...sharedProps} />;
  if (currentPage === 'mental-state') return <MentalStatePage {...sharedProps} />;
  if (currentPage === 'history')      return <HistoryPage     {...sharedProps} />;
  if (currentPage === 'faqs')         return <FAQsPage        {...sharedProps} />;

  // ── Home ─────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#0a0515] text-white overflow-hidden">

      <Sidebar
        onHomeClick       ={handleHomeClick}
        onNewChat         ={handleNewChat}
        onMentalStateClick={handleMentalStateClick}
        onHistoryClick    ={handleHistoryClick}
        onFAQsClick       ={handleFAQsClick}
        onLogout          ={handleLogout}
        currentPage       ={currentPage}
        user              ={user}
      />

      <div className="flex flex-col flex-1 relative overflow-hidden bg-gradient-to-br from-[#0a0515] via-[#140a2e] to-[#0a0515]">

        {/* Stars */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {[...Array(80)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full opacity-30 animate-pulse"
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-3 relative z-10">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
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

          {isTyping && (
            <div className="flex justify-start">
              <div className="inline-flex items-center px-4 py-2 rounded-2xl backdrop-blur-md shadow-md bg-[#1a1035]/60 border border-purple-500/20 animate-fadeIn" style={{ maxWidth: '40%' }}>
                <span className="text-purple-300 mr-2">Bot is typing</span>
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce delay-200"></span>
                  <span className="w-2 h-2 bg-purple-300 rounded-full animate-bounce delay-400"></span>
                </div>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex justify-start">
              <div className="inline-flex items-center px-4 py-2 rounded-2xl backdrop-blur-md shadow-md bg-[#1a1035]/60 border border-purple-500/20 animate-fadeIn" style={{ maxWidth: '40%' }}>
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

        {/* Input */}
        <div className="relative z-20">
          <ChatInputBar
            message    ={message}
            setMessage ={setMessage}
            sendMessage={sendMessage}
            onVoiceClick={handleVoiceClick}
            onNewChat  ={handleNewChat}
          />
        </div>

      </div>
    </div>
  );
}

export default App;