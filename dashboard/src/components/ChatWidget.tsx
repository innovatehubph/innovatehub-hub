import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Loader2, Trash2 } from 'lucide-react';
import type { ChatMessage } from '../types';

const AI_PROXY_URL = 'http://72.61.113.227:3456';

const STORAGE_KEY = 'innovatehub_chat_history';

// Fallback responses when AI API is not configured
const FALLBACK_RESPONSES: Record<string, string> = {
  'hello': "Hello! I'm your InnovateHub Business Hub assistant. I can help with Facebook setup, marketing strategies, troubleshooting, and more. What do you need help with?",
  'help': "I can help you with:\n- Facebook Developer App setup\n- Page Access Token generation\n- Webhook configuration\n- Messenger chatbot flows\n- Ad campaign management\n- Product catalog sync\n- Troubleshooting errors\n\nJust ask your question!",
  'webhook': "To set up your webhook:\n1. Go to Facebook App > Webhooks\n2. Callback URL: Use your Back4App server URL + /facebook/webhook\n3. Verify Token: innovatehub_verify_2024\n4. Subscribe to: messages, messaging_postbacks, feed, leadgen\n\nGo to the Facebook Setup page in the sidebar for a step-by-step guide.",
  'token': "To get a Page Access Token:\n1. Go to Facebook App > Messenger > Settings\n2. Under 'Access Tokens', click 'Generate Token'\n3. Select your Page and grant permissions\n4. Copy the token and save it in Token Store page\n5. Exchange it for a long-lived token using the refreshAccessToken Cloud Function\n\nTokens expire after 60 days unless you get a never-expiring page token.",
};

function getFallbackResponse(message: string): string {
  const lower = message.toLowerCase();
  for (const [key, response] of Object.entries(FALLBACK_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return "I understand you're asking about \"" + message.slice(0, 50) + "\". Let me try to help — ask about webhooks, tokens, ads, or products for detailed guidance!";
}

interface ChatWidgetProps {
  businessId?: string;
}

export default function ChatWidget({ businessId }: ChatWidgetProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userInput = input.trim();
    setInput('');

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: userInput, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      if (aiEnabled) {
        // Build conversation history for Claude (last 10 messages for context)
        const recentMessages = [...messages.slice(-10), userMsg].map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        const res = await fetch(`${AI_PROXY_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: recentMessages,
            businessContext: businessId ? `Active business ID: ${businessId}` : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'AI request failed' }));
          throw new Error(err.error || 'AI request failed');
        }

        const result = await res.json();

        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: Date.now() + 1,
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error('AI not enabled');
      }
    } catch (err: any) {
      // Fallback to local responses if AI fails
      if (aiEnabled && err.message?.includes('API key not configured')) {
        setAiEnabled(false);
      }
      const fallbackText = getFallbackResponse(userInput);
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiEnabled ? `(AI unavailable, using built-in responses)\n\n${fallbackText}` : fallbackText,
        timestamp: Date.now() + 1,
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-105"
          title="AI Assistant"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl flex flex-col" style={{ height: '500px' }}>
          <div className="flex items-center justify-between p-3 border-b border-slate-700 shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-blue-400" />
              <span className="font-semibold text-white">Claude AI Assistant</span>
              {aiEnabled && <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">AI</span>}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={clearHistory} className="p-1 rounded hover:bg-slate-700 text-slate-400" title="Clear history">
                <Trash2 size={14} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-slate-700 text-slate-400">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                <Bot size={40} className="mx-auto mb-3 opacity-50" />
                <p className="text-sm">Powered by Claude AI. Ask me anything about your Business Hub!</p>
                <div className="mt-3 space-y-1">
                  {['How do I set up Facebook webhooks?', 'Help me configure page tokens', 'How to sync products to FB Shop?', 'What marketing strategies should I use?'].map(q => (
                    <button key={q} onClick={() => setInput(q)} className="block w-full text-left text-xs text-blue-400 hover:text-blue-300 py-1 px-2 rounded hover:bg-slate-700/50">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 className="animate-spin" size={14} /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-slate-700 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask Claude anything..."
                disabled={loading}
                className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button onClick={send} disabled={loading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
