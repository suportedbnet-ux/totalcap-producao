import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import ReactMarkdown from 'react-markdown';
import './AIChat.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente inteligente da Totalcap. Como posso ajudar você hoje?' }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.post('/ai-chat/chat', { message: userMessage });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (error: any) {
      console.error('Erro na IA:', error);
      const msg = getErrorMessage(error, 'Desculpe, tive um problema ao processar sua pergunta.');
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button className="ai-chat-trigger" onClick={() => setIsOpen(true)} title="Assistente Totalcap">
        <Bot size={24} />
      </button>
    );
  }

  return (
    <div className={`ai-chat-window ${isMinimized ? 'minimized' : ''}`}>
      <div className="ai-chat-header">
        <div className="header-info">
          <Bot size={20} className="text-primary" />
          <span>Assistente Totalcap</span>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsMinimized(!isMinimized)}>
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)}>
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="ai-chat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.role}`}>
                <div className="avatar">
                  {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="content">
                  <ReactMarkdown 
                    components={{
                      a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" />
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && (
              <div className="message-bubble assistant">
                <div className="avatar"><Bot size={14} /></div>
                <div className="content loading">
                  <Loader2 size={16} className="spinning" /> Pensando...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="ai-chat-input" onSubmit={handleSend}>
            <input
              type="text"
              placeholder="Pergunte algo..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </>
      )}
    </div>
  );
}
