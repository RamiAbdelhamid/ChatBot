import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// Constants
const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  ENDPOINTS: {
    HEALTH: '/health',
    CHAT: '/chat'
  }
};

const MESSAGE_TYPES = {
  USER: 'user',
  BOT: 'bot'
};

const APP_STATES = {
  WARMING: 'warming',
  READY: 'ready',
  LOADING: 'loading'
};

// Custom Hooks
const useTimer = () => {
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    stopTimer();
    setSeconds(0);
  }, [stopTimer]);

  return { seconds, startTimer, stopTimer, resetTimer };
};

const useSessionId = () => {
  const getSessionId = useCallback(() => {
    try {
      let sessionId = localStorage.getItem('chatbot_session_id');
      if (!sessionId) {
        sessionId = 'session-' + Math.random().toString(36).slice(2) + Date.now();
        localStorage.setItem('chatbot_session_id', sessionId);
      }
      return sessionId;
    } catch (error) {
      // Fallback if localStorage is not available
      return 'session-' + Math.random().toString(36).slice(2) + Date.now();
    }
  }, []);

  return { getSessionId };
};

// Service Layer
class ChatService {
  static async checkHealth() {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HEALTH}`, {
      cache: 'no-store'
    });
    return response.ok;
  }

  static async sendMessage(sessionId, message) {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        message: message
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status} ${response.statusText}: ${errorText}`);
    }

    const data = await response.json();
    return data?.reply ?? 'No reply received from the chatbot.';
  }
}

// UI Components
const StatusIndicator = ({ status, seconds, isLoading }) => {
  const getStatusConfig = () => {
    switch (status) {
      case APP_STATES.WARMING:
        return {
          text: `Warming up… ${seconds}s`,
          hint: '(typical 20–60s)',
          className: 'status-warming'
        };
      case APP_STATES.LOADING:
        return {
          text: `Thinking… ${seconds}s`,
          hint: '',
          className: 'status-thinking'
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className={`status-indicator ${config.className}`}>
      <span className="status-text">{config.text}</span>
      {config.hint && <span className="status-hint">{config.hint}</span>}
    </div>
  );
};

const Message = ({ type, content, isTyping = false }) => {
  const messageClass = `message message--${type}`;

  if (isTyping) {
    return (
      <div className={`${messageClass} message--typing`}>
        <div className="typing-indicator">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={messageClass}>
      {type === MESSAGE_TYPES.BOT && <div className="message__avatar">🤖</div>}
      <div className="message__content">{content}</div>
    </div>
  );
};

const EmptyState = () => (
  <div className="empty-state">
    <div className="empty-state__icon">💬</div>
    <h2 className="empty-state__title">How can I help you today?</h2>
    <p className="empty-state__subtitle">
      Start a conversation by typing a message below.
    </p>
  </div>
);

const MessagesList = ({ messages, isLoading }) => (
  <div className="messages-list">
    {messages.length === 0 && <EmptyState />}

    {messages.map((message, index) => (
      <Message
        key={`${message.type}-${index}`}
        type={message.type}
        content={message.content}
      />
    ))}

    {isLoading && (
      <Message
        type={MESSAGE_TYPES.BOT}
        content=""
        isTyping={true}
      />
    )}
  </div>
);

const ChatInput = ({
  value,
  onChange,
  onSubmit,
  disabled,
  isRecording,
  onStartRecording,
  onStopRecording,
  placeholder = "Message AI ChatBot..."
}) => {
  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  const canSubmit = value.trim() && !disabled;

  return (
    <div className="chat-input">
      <div className="chat-input__container">
        <div className="chat-input__wrapper">
          <input
            type="text"
            className="chat-input__field"
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
          />
          <div className="chat-input__actions">
            <button
              className={`chat-input__button ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? onStopRecording : onStartRecording}
              disabled={disabled}
              type="button"
              aria-label={isRecording ? "Stop recording" : "Start recording"}
            >
              {isRecording ? (
                <svg className="chat-input__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="chat-input__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>
            <button
              className="chat-input__button"
              onClick={onSubmit}
              disabled={!canSubmit}
              aria-label="Send message"
            >
              <svg className="chat-input__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = ({ appState, warmupSeconds, responseSeconds, isLoading }) => (
  <header className="app-header">
    <h1 className="app-header__title">
      <span className="app-header__icon">🤖</span>
      AI ChatBot
    </h1>
    <StatusIndicator
      status={appState}
      seconds={appState === APP_STATES.WARMING ? warmupSeconds : responseSeconds}
      isLoading={isLoading}
    />
  </header>
);
// UI Components
const QuickActionButton = ({ text, onClick }) => {
  return (
    <button
      className="quick-action-button"
      onClick={() => onClick(text)}
    >
      {text}
    </button>
  );
};


const QuickActionsPanel = ({ onActionClick, selectedCategory }) => {
  const quickActions = {
    general: [
      "📋 Make a plan",
      "💡 Brainstorm",
      "🗣️ Get advice",
      "✍️ Help me write",
      "📝 Summarize text",
      "📊 Analyze data",
    ],
  };

  const actionsToShow = selectedCategory === 'Make a plan'
    ? quickActions.makePlan
    : quickActions.general;

  return (
    <div className="quick-actions-panel">
      {actionsToShow.map((action, index) => (
        <QuickActionButton
          key={index}
          text={action}
          onClick={onActionClick}
        />
      ))}
    </div>
  );
};
// Main App Component
export default function App() {
  // State Management
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [appState, setAppState] = useState(APP_STATES.WARMING);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);


  // Custom Hooks
  const warmupTimer = useTimer();
  const responseTimer = useTimer();
  const { getSessionId } = useSessionId();

  // Refs
  const messagesEndRef = useRef(null);
  const handleQuickActionClick = (actionText) => {
    if (actionText === 'Make a plan') {
      setSelectedCategory('Make a plan');
    } else {
      setInputValue(actionText);
      setSelectedCategory(null);
      // التركيز على حقل الإدخال تلقائياً
      const inputField = document.querySelector('.chat-input__field');
      if (inputField) {
        inputField.focus();
      }
    }
  };

  const handleBackToMain = () => {
    setSelectedCategory(null);
  };
  // Effects
  useEffect(() => {
    initializeApp();
    return cleanup;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialization
  const initializeApp = async () => {
    warmupTimer.startTimer();

    try {
      await ChatService.checkHealth();
      setAppState(APP_STATES.READY);
    } catch (error) {
      console.warn('Health check failed, but continuing...', error);
      setAppState(APP_STATES.READY);
    } finally {
      warmupTimer.stopTimer();
    }
  };

  const cleanup = () => {
    warmupTimer.stopTimer();
    responseTimer.stopTimer();
  };

  // Message Management
  const addMessage = useCallback((type, content) => {
    setMessages(prev => [...prev, { type, content, timestamp: Date.now() }]);
  }, []);

  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (!message || isLoading || appState !== APP_STATES.READY) return;

    // Add user message
    addMessage(MESSAGE_TYPES.USER, message);
    setInputValue('');
    setIsLoading(true);
    responseTimer.startTimer();

    try {
      const sessionId = getSessionId();
      const botResponse = await ChatService.sendMessage(sessionId, message);
      addMessage(MESSAGE_TYPES.BOT, botResponse);
    } catch (error) {
      console.error('Chat error:', error);
      addMessage(MESSAGE_TYPES.BOT, `Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      responseTimer.stopTimer();
    }
  };

  // Utility Functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  // Computed Values
  const isAppReady = appState === APP_STATES.READY;
  const inputDisabled = !isAppReady || isLoading;


  const startRecording = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ar-SA'; // أو 'en-US' للإنجليزية

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setInputValue(transcript);
      };

      recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        addMessage(MESSAGE_TYPES.BOT, `Error: ${event.error}`);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      addMessage(MESSAGE_TYPES.BOT, "Your browser doesn't support speech recognition");
    }
  };

  // إيقاف التسجيل
  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };














  return (
    <div className="app">
      <Header
        appState={appState}
        warmupSeconds={warmupTimer.seconds}
        responseSeconds={responseTimer.seconds}
        isLoading={isLoading}
      />

      <main className="app-main">
        <div className="chat-container">
          <div className="messages-container">
            {messages.length === 0 ? (
              <>
                <div className="empty-state">
                  <div className="empty-state__icon">💬</div>
                  <h2 className="empty-state__title">
                    {selectedCategory ? selectedCategory : 'Ask anything'}
                  </h2>

                  {selectedCategory && (
                    <button
                      className="back-button"
                      onClick={handleBackToMain}
                    >
                      ← Back to all categories
                    </button>
                  )}

                  <div className="quick-actions-container">
                    <QuickActionsPanel
                      onActionClick={handleQuickActionClick}
                      selectedCategory={selectedCategory}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <MessagesList messages={messages} isLoading={isLoading} />
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        <ChatInput
          value={inputValue}
          onChange={handleInputChange}
          onSubmit={handleSendMessage}
          disabled={inputDisabled}
          isRecording={isRecording}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />
      </main>
    </div>
  );
}