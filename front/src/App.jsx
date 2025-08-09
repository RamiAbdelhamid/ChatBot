import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function getSid() {
  let sid = localStorage.getItem('sid');
  if (!sid) {
    sid = 's-' + Math.random().toString(36).slice(2);
    localStorage.setItem('sid', sid);
  }
  return sid;
}

export default function App() {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // مؤقتات
  const [warmupSec, setWarmupSec] = useState(0);
  const [responseSec, setResponseSec] = useState(0);
  const warmupRef = useRef(null);
  const respRef = useRef(null);

  // إحماء الخادم + تايمر الإحماء
  useEffect(() => {
    // ابدأ عدّاد الإحماء
    warmupRef.current = setInterval(() => setWarmupSec(s => s + 1), 1000);

    (async () => {
      try { await fetch(`${API_URL}/health`, { cache: 'no-store' }); }
      catch {}
      finally {
        setReady(true);
        clearInterval(warmupRef.current);
        warmupRef.current = null;
      }
    })();

    return () => {
      if (warmupRef.current) clearInterval(warmupRef.current);
      if (respRef.current) clearInterval(respRef.current);
    };
  }, []);

  const handleSend = async () => {
    if (!userInput.trim() || isLoading) return;

    const msg = userInput;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setUserInput('');
    setIsLoading(true);

    // ابدأ عدّاد وقت الاستجابة
    setResponseSec(0);
    respRef.current = setInterval(() => setResponseSec(s => s + 1), 1000);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: getSid(), message: msg })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'bot', content: data?.reply ?? 'No reply from bot.' }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', content: 'Error: ' + error.message }]);
    } finally {
      setIsLoading(false);
      if (respRef.current) { clearInterval(respRef.current); respRef.current = null; }
    }
  };

  return (
    <div className="App">
      <header className="App-header"><h1>AI ChatBot</h1></header>

      <div className="chat-container">
        {/* شريط حالة مع التايمر */}
        {!ready && (
          <div className="status">
            Warming up… {warmupSec}s <span className="hint">(typical 20–60s)</span>
          </div>
        )}
        {ready && isLoading && (
          <div className="status">
            Thinking… {responseSec}s
          </div>
        )}

        <div className="chat-box">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role === 'user' ? 'user' : 'bot'}`}>
              {msg.content}
            </div>
          ))}
          {isLoading && <div className="message bot">…</div>}{/* typing */}
        </div>

        <div className="input-container">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message"
          />
          <button onClick={handleSend} disabled={isLoading || !ready}>
            {ready ? (isLoading ? `Sending… ${responseSec}s` : 'Send') : `Warming… ${warmupSec}s`}
          </button>
        </div>
      </div>
    </div>
  );
}
