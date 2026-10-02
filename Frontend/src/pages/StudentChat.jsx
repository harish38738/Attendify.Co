import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import api from '../utils/api';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { useAuth } from '../context/AuthContext';

const initialMessages = [];

const StudentChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const getErrorMessage = (err) => {
    const status = err.response?.status;
    const serverMessage = err.response?.data?.message || err.response?.data?.detail;

    if (serverMessage) return serverMessage;
    if (status === 401) return 'Please log in again to use AI Chat.';
    if (status === 429) return 'AI Chat is receiving too many requests. Please try again shortly.';
    if (status >= 500) return 'AI Chat is unavailable right now. Please try again later.';
    if (err.message === 'Network Error') return 'Unable to reach Attendify. Check your connection and try again.';
    return 'Your message could not be sent. Please try again.';
  };

  const sendMessage = async () => {
    const content = draft.trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setDraft('');
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/api/student/chat', { messages: nextMessages });
      if (!res.data.success) {
        throw new Error(res.data.message || 'AI Chat could not respond.');
      }
      const assistantMessage = res.data.data?.message;
      if (!assistantMessage?.content) {
        throw new Error('AI Chat returned an empty response.');
      }
      setMessages((current) => [...current, assistantMessage]);
    } catch (err) {
      setError(err.message && !err.response ? err.message : getErrorMessage(err));
    } finally {
      setLoading(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-slate-50" data-testid="student-chat-page">
      <div className="border-b border-slate-200 bg-white px-4 py-5 md:px-8">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <MessageCircle className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 font-heading md:text-4xl">Chat</h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Ask Attendify AI for study help, summaries, explanations, and planning.
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
        <Card className="flex min-h-[calc(100vh-14rem)] flex-1 flex-col overflow-hidden border border-slate-200 bg-white shadow-sm">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-6" data-testid="chat-message-area">
            {messages.length === 0 ? (
              <div className="flex min-h-[45vh] items-center justify-center text-center">
                <div className="max-w-md">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50">
                    <Sparkles className="h-7 w-7 text-blue-700" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 font-heading">Start a study conversation</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Try asking for a concept explanation, a revision plan, or help turning class notes into key points.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isUser = message.role === 'user';
                  return (
                    <div key={`${message.role}-${index}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[88%] gap-3 sm:max-w-[75%] ${isUser ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isUser ? 'bg-blue-900 text-white' : 'bg-slate-100 text-blue-800'}`}>
                          {isUser ? (user?.name?.charAt(0)?.toUpperCase() || 'S') : <MessageCircle className="h-4 w-4" />}
                        </div>
                        <div className={`rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${isUser ? 'bg-blue-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-800'}`}>
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="flex justify-start">
                    <div className="flex max-w-[88%] gap-3 sm:max-w-[75%]">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-blue-800">
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Attendify AI is thinking...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {error && (
            <div className="border-t border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:px-6" role="alert">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div className="border-t border-slate-200 bg-white p-3 md:p-4">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a study question..."
                rows={2}
                disabled={loading}
                className="max-h-40 min-h-[52px] resize-none border-slate-200 bg-white text-sm"
                data-testid="chat-input"
              />
              <Button
                type="button"
                onClick={sendMessage}
                disabled={loading || !draft.trim()}
                className="h-[52px] w-[52px] shrink-0 bg-blue-900 p-0 hover:bg-blue-800"
                aria-label="Send message"
                data-testid="chat-send-button"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentChat;
