import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaRedo, FaBrain, FaWifi, FaPlug } from 'react-icons/fa';
import Sidebar from './Sidebar';

const WS_URL  = "wss://vixenish-vihaan-unstrategically.ngrok-free.dev/ws/asr";
const API_BASE = "http://localhost:8000";

const VoicePage = ({ onBack, onHomeClick, onMentalStateClick, onHistoryClick, onFAQsClick, onLogout, user }) => {
  const [isListening, setIsListening]           = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [messages, setMessages]                 = useState([]);
  const [dotCount, setDotCount]                 = useState(1);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isAnalyzing, setIsAnalyzing]           = useState(false);
  const [isStopping, setIsStopping]             = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [isConnected, setIsConnected]           = useState(false);

  const wsRef              = useRef(null);
  const audioContextRef    = useRef(null);
  const mediaStreamRef     = useRef(null);
  const processorRef       = useRef(null);
  const messagesEndRef     = useRef(null);
  const accumulatedTextRef = useRef('');
  const currentPartialRef  = useRef('');
  const isWaitingForFlushRef = useRef(false);
  const hasProcessedRef    = useRef(false);
  const flushTimeoutRef    = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isListening]);

  useEffect(() => {
    if (!isListening) return;
    const interval = setInterval(() => setDotCount(prev => (prev % 3) + 1), 500);
    return () => clearInterval(interval);
  }, [isListening]);

  useEffect(() => {
    const name = user?.name || 'there';
    setMessages([{
      text  : `Hello ${name}! I'm here to listen and support you.\nFeel free to share what's on your mind today.`,
      isUser: false
    }]);
  }, []);

  const getToken = () => localStorage.getItem('token');

  const requestPermission = async () => {
    if (permissionGranted) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionGranted(true);
      return true;
    } catch (err) {
      alert('Microphone permission is required!');
      return false;
    }
  };

  const formatLabel = (str) => {
    return str.replace(/_/g, ' ').split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const analyzeText = async (text) => {
    if (!text.trim()) return;
    setIsAnalyzing(true);
    setMessages(prev => [...prev, { text: "Voice received. Analyzing your message...", isUser: false }]);

    try {
      const token   = getToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/analyze`, {
        method : 'POST',
        headers,
        body   : JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      const mentalLabel  = data.mental_state?.label      || 'unknown';
      const mentalConf   = data.mental_state?.confidence || 0;
      const emotionLabel = data.emotion?.label            || null;
      const emotionConf  = data.emotion?.confidence       || 0;
      const isHighRisk   = data.high_risk                 || false;

      const analysisData = {
        timestamp  : new Date().toISOString(),
        userText   : text,
        highRisk   : isHighRisk,
        emotion    : emotionLabel ? {
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
            text  : "Analysis complete! Click 'Mental State' in sidebar to see detailed results.",
            isUser: false,
          };
          return updated;
        });
      }, 500);

    } catch (e) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          text  : "I'm having trouble analyzing right now. But I'm still here to listen.",
          isUser: false,
        };
        return updated;
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const floatTo16BitPCM = (float32Array) => {
    const len    = float32Array.length;
    const buffer = new ArrayBuffer(len * 2);
    const view   = new DataView(buffer);
    for (let i = 0; i < len; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const processFinalMessage = () => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }

    let finalText = '';
    if (accumulatedTextRef.current.trim())  finalText = accumulatedTextRef.current.trim();
    else if (currentPartialRef.current.trim()) finalText = currentPartialRef.current.trim();
    else if (partialTranscript.trim())      finalText = partialTranscript.trim();

    if (finalText) {
      setMessages(prev => [...prev, { text: finalText, isUser: true }]);
      analyzeText(finalText);
    } else {
      alert('No speech detected. Please try speaking again.');
    }

    accumulatedTextRef.current  = '';
    currentPartialRef.current   = '';
    setPartialTranscript('');
    isWaitingForFlushRef.current = false;
    setIsStopping(false);
  };

  const connectToServer = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    setConnectionStatus('connecting');
    const ws     = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => { setConnectionStatus('connected'); setIsConnected(true); };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'partial') {
          const t = (data.text || '').trim();
          if (t) { setPartialTranscript(t); currentPartialRef.current = t; }
        } else if (data.type === 'final') {
          const t = (data.text || '').trim();
          if (t) {
            accumulatedTextRef.current = accumulatedTextRef.current
              ? accumulatedTextRef.current + ' ' + t : t;
            setPartialTranscript('');
            currentPartialRef.current = '';
            if (isWaitingForFlushRef.current && !hasProcessedRef.current) {
              setTimeout(() => processFinalMessage(), 500);
            }
          }
        }
      } catch (e) {}
    };

    ws.onerror  = () => setConnectionStatus('error');
    ws.onclose  = () => { setConnectionStatus('disconnected'); setIsConnected(false); wsRef.current = null; };
    wsRef.current = ws;
  };

  const disconnectFromServer = () => {
    if (isListening) stopRecording();
    if (wsRef.current) {
      try { wsRef.current.send(JSON.stringify({ cmd: 'close' })); } catch {}
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
    setIsConnected(false);
  };

  const handleServerToggle = () => {
    isConnected ? disconnectFromServer() : connectToServer();
  };

  const startRecording = async () => {
    if (!isConnected || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('Please connect to server first!'); return;
    }
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    accumulatedTextRef.current   = '';
    currentPartialRef.current    = '';
    setPartialTranscript('');
    isWaitingForFlushRef.current = false;
    hasProcessedRef.current      = false;
    setIsStopping(false);
    if (flushTimeoutRef.current) { clearTimeout(flushTimeoutRef.current); flushTimeoutRef.current = null; }

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });
      mediaStreamRef.current = mediaStream;

      const source    = audioContextRef.current.createMediaStreamSource(mediaStream);
      const processor = audioContextRef.current.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        wsRef.current.send(floatTo16BitPCM(event.inputBuffer.getChannelData(0)));
      };
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      processorRef.current = processor;
      setIsListening(true);
    } catch (err) {
      alert('Failed to start recording. Please check microphone permissions.');
    }
  };

  const stopRecording = () => {
    setIsStopping(true);
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      isWaitingForFlushRef.current = true;
      try { wsRef.current.send(JSON.stringify({ cmd: 'flush' })); } catch {}
      flushTimeoutRef.current = setTimeout(() => {
        if (!hasProcessedRef.current) processFinalMessage();
      }, 3000);
    } else {
      processFinalMessage();
    }
  };

  const handleVoiceToggle = async () => {
    if (!isListening && !isStopping) await startRecording();
    else if (isListening && !isStopping) stopRecording();
  };

  const handleRefresh = () => {
    const name = user?.name || 'there';
    setMessages([{
      text  : `Hello ${name}! I'm here to listen and support you.\nFeel free to share what's on your mind today.`,
      isUser: false,
    }]);
    setPartialTranscript('');
    accumulatedTextRef.current   = '';
    currentPartialRef.current    = '';
    isWaitingForFlushRef.current = false;
    hasProcessedRef.current      = false;
    setIsStopping(false);
    if (flushTimeoutRef.current) { clearTimeout(flushTimeoutRef.current); flushTimeoutRef.current = null; }
    if (isListening) stopRecording();
  };

  useEffect(() => {
    return () => {
      if (isListening) stopRecording();
      if (wsRef.current) wsRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#0a0515] text-white overflow-hidden">

      <Sidebar
        onHomeClick       ={onHomeClick}
        onMentalStateClick={onMentalStateClick}
        onHistoryClick    ={onHistoryClick}
        onFAQsClick       ={onFAQsClick}
        onLogout          ={onLogout}
        currentPage       ="voice"
        user              ={user}
      />

      <div className="flex flex-col flex-1 relative overflow-hidden bg-gradient-to-br from-[#0a0515] via-[#140a2e] to-[#0a0515]">

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

        {/* Connect button */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={handleServerToggle}
            disabled={isListening}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shadow-xl backdrop-blur-md
              ${isConnected
                ? 'bg-green-600/80 hover:bg-green-700/80 border-2 border-green-400'
                : 'bg-gray-600/80 hover:bg-gray-700/80 border-2 border-gray-400'}
              ${isListening ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {isConnected ? (
              <><FaWifi className="text-white animate-pulse" /><span className="text-sm font-bold text-white">Connected</span><div className="w-2 h-2 bg-green-300 rounded-full animate-pulse" /></>
            ) : (
              <><FaPlug className="text-white" /><span className="text-sm font-bold text-white">Connect Server</span><div className="w-2 h-2 bg-gray-300 rounded-full" /></>
            )}
          </button>
          {isListening && <div className="mt-1 text-xs text-yellow-400 text-center">Stop recording first</div>}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-3 relative z-10 mt-20">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`inline-block px-4 py-2 rounded-2xl backdrop-blur-md shadow-md break-words whitespace-pre-line
                  ${msg.isUser
                    ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white'
                    : 'bg-[#1a1035]/60 border border-purple-500/20 text-purple-200'}`}
                style={{ maxWidth: '70%' }}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isListening && (
            <div className="flex justify-end">
              <div className="inline-flex items-center px-4 py-2 rounded-2xl backdrop-blur-md shadow-md bg-purple-600/30 border border-purple-400 text-white animate-fadeIn break-words" style={{ maxWidth: '60%' }}>
                Listening{'.'.repeat(dotCount)}{partialTranscript && `: ${partialTranscript}`}
              </div>
            </div>
          )}
          {isStopping && (
            <div className="flex justify-end">
              <div className="inline-flex items-center px-4 py-2 rounded-2xl backdrop-blur-md shadow-md bg-yellow-600/30 border border-yellow-400 text-white animate-pulse" style={{ maxWidth: '60%' }}>
                Processing your speech...
              </div>
            </div>
          )}
          {isAnalyzing && (
            <div className="flex justify-start">
              <div className="inline-flex items-center px-4 py-2 rounded-2xl backdrop-blur-md shadow-md bg-[#1a1035]/60 border border-purple-500/20 text-purple-200">
                <FaBrain className="animate-pulse mr-2" />Analyzing in background...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center relative z-20 p-4">
          <div className="relative w-full flex items-center justify-center">
            <button onClick={onBack} className="absolute left-4 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-white rounded-full shadow-md transition-all">
              ← Back
            </button>
            <button
              onClick={handleVoiceToggle}
              disabled={!isConnected || isStopping}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all animate-float
                ${!isConnected || isStopping
                  ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                  : isListening
                    ? 'bg-red-600 shadow-[0_0_20px_rgba(255,0,0,0.7)] animate-pulse cursor-pointer'
                    : 'bg-purple-600/30 shadow-[0_0_10px_rgba(138,43,226,0.4)] hover:scale-110 cursor-pointer'}`}
            >
              <FaMicrophone className="text-white text-xl" />
            </button>
            <button onClick={handleRefresh} className="absolute right-4 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 text-white rounded-full shadow-md transition-all flex items-center gap-2">
              <FaRedo className="text-sm" />Refresh
            </button>
          </div>
          <div className="mt-4 text-xs text-purple-300/60 text-center px-4">
            {!isConnected && <div className="text-yellow-400 mb-2 font-bold">⚠️ Click "Connect Server" button to enable voice recording!</div>}
            {isConnected  && <div className="text-green-400 mb-2">✅ Server connected — you can record multiple times!</div>}
            This is an AI assistant for emotional support. For crisis situations, please contact emergency services or a mental health professional.
          </div>
        </div>

      </div>
    </div>
  );
};

export default VoicePage;