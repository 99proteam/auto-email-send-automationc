'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Package, ExternalLink, Bot } from 'lucide-react';

export default function KnowledgeBasePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/public/products').then(r => r.json()).then(data => {
      if (data.success) setProducts(data.products || []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || rateLimitExceeded || isTyping) return;
    
    const userMsg = input.trim();
    setInput('');
    const newHistory = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      const res = await fetch('/api/public/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages })
      });
      
      const data = await res.json();
      
      if (res.status === 429) {
        setRateLimitExceeded(true);
        setMessagesRemaining(0);
        setMessages(prev => [...prev, { role: 'ai', content: data.error }]);
      } else if (data.success) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
        if (data.remaining !== undefined) setMessagesRemaining(data.remaining);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I am having trouble connecting to my knowledge base right now.' }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Connection error. Please try again later.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 py-6 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Our Products</h1>
              <p className="text-sm text-gray-400">Knowledge Base & Directory</p>
            </div>
          </div>
          <button 
            onClick={() => setIsChatOpen(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg transition-colors border border-gray-700"
          >
            <MessageSquare className="w-4 h-4" /> Ask AI Assistant
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading catalog...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No products currently available.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {products.map(p => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col shadow-sm hover:border-gray-700 transition-colors">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{p.name}</h2>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed line-clamp-3">{p.description}</p>
                  
                  {p.features && p.features.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Key Features</h4>
                      <ul className="list-disc pl-4 space-y-1 text-sm text-gray-300">
                        {p.features.slice(0, 4).map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                        {p.features.length > 4 && <li className="text-gray-500 italic">...and more</li>}
                      </ul>
                    </div>
                  )}
                </div>
                
                <div className="pt-4 border-t border-gray-800 flex items-center justify-between mt-auto">
                  <div className="font-semibold text-emerald-400">{p.pricing_info || 'Price TBD'}</div>
                  {p.url && (
                    <a 
                      href={p.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-medium text-sm"
                    >
                      View Product <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Chat Widget */}
      <div className={`fixed bottom-6 right-6 z-50 flex flex-col items-end transition-all duration-300 ${isChatOpen ? 'w-full max-w-sm sm:w-96 h-[600px] max-h-[80vh]' : 'w-14 h-14'}`}>
        {!isChatOpen ? (
          <button 
            onClick={() => setIsChatOpen(true)}
            className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center transition-transform hover:scale-105"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-full h-full bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 bg-gray-800 flex items-center justify-between border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Sales Assistant</h3>
                  <p className="text-[10px] text-gray-400">Ask me anything about our products!</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-950">
              {messages.length === 0 && (
                <div className="text-center py-10">
                  <Bot className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Hello! I can help you choose the right product or answer any questions you have.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-sm' 
                      : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex items-start">
                  <div className="bg-gray-800 border border-gray-700 p-3 rounded-2xl rounded-tl-sm flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                    <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-gray-900 border-t border-gray-800">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={rateLimitExceeded ? "Rate limit reached for today." : "Type your message..."}
                  disabled={isTyping || rateLimitExceeded}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping || rateLimitExceeded}
                  className="absolute right-2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="text-[10px] text-gray-500 text-right mt-1.5 mr-1">
                {messagesRemaining !== null ? `${messagesRemaining} messages remaining today` : '10 messages remaining today'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
