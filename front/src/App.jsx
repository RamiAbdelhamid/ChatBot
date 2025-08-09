import React, { useState } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
console.log(import.meta.env.VITE_API_URL);
function App() {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle sending the message
  const handleSend = async () => {
    if (!userInput.trim()) return;

    // Display user message
    setMessages(prevMessages => [
      ...prevMessages,
      { role: 'user', content: userInput }
    ]);

    setIsLoading(true);
    setUserInput('');

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: localStorage.getItem('sid') || 'user-session',
          message: userInput
        })
      });

      const data = await response.json();
      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'bot', content: data.reply || 'No reply from bot.' }
      ]);
    } catch (error) {
      setMessages(prevMessages => [
        ...prevMessages,
        { role: 'bot', content: 'Error: ' + error.message }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>AI ChatBot</h1>
      </header>

      <div className="chat-container">
        <div className="chat-box">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.role === 'user' ? 'user' : 'bot'}`}
            >
              {msg.content}
            </div>
          ))}
          {isLoading && (
            <div className="message bot">…</div> // To indicate bot is typing
          )}
        </div>

        <div className="input-container">
          <input
            type="text"
            value={userInput}
            onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type a message"
          />
          <button onClick={handleSend} disabled={isLoading}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
