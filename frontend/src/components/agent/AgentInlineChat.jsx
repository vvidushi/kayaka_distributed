import { useEffect, useRef, useState } from 'react';
import { FaPaperPlane, FaSpinner, FaComments } from 'react-icons/fa';
import { aiAgentApi } from '../../services/api/ai-agent';
import { useAuth } from '../../hooks/useAuth';

/**
 * Inline chat panel that reuses the AI agent API.
 * Designed for side-by-side layouts (e.g., alongside search results).
 */
const AgentInlineChat = ({
  initialPrompt,
  promptSuggestions = [],
  contextSummary = null,
  onAssistantResponse,
}) => {
  const { isAuthenticated, user } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [restoredFromCache, setRestoredFromCache] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pendingPromptRef = useRef(null);
  const lastPromptIdRef = useRef(null);
  const STORAGE_KEY = 'agent_chat_state_v1';

  // Auto-scroll
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, loading]);

  const persistState = (nextMessages, nextSessionId = sessionId, promptId = lastPromptIdRef.current) => {
    if (!nextSessionId) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          sessionId: nextSessionId,
          messages: nextMessages,
          lastPromptId: promptId,
        })
      );
    } catch (err) {
      console.warn('Failed to persist agent chat state', err);
    }
  };

  const initializeSession = async () => {
    try {
      // Try to restore existing session from storage
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.sessionId) {
            setSessionId(parsed.sessionId);
            setMessages(parsed.messages || []);
            if (parsed.lastPromptId) {
              lastPromptIdRef.current = parsed.lastPromptId;
            }
            setRestoredFromCache(true);
            return;
          }
        } catch {
          // ignore parse errors and create a new session
        }
      }

      setLoading(true);
      setError(null);
      const response = await aiAgentApi.createSession();

      if (response.session_id) {
        setSessionId(response.session_id);
        setRestoredFromCache(false);

        if (response.messages && response.messages.length > 0) {
          setMessages(response.messages);
          persistState(response.messages, response.session_id);
        } else {
          const baseWelcome = isAuthenticated
            ? `Hi ${user?.firstName || 'there'}! I can coordinate flights, stays, and cars.`
            : 'Hi! I can help plan flights, stays, and cars.';
          const welcome = contextSummary
            ? `${baseWelcome} ${contextSummary}`
            : `${baseWelcome} Tell me what you need.`;
          const welcomeMessage = [{ role: 'assistant', content: welcome.trim() }];
          setMessages(welcomeMessage);
          persistState(welcomeMessage, response.session_id);
        }
      }
    } catch (err) {
      console.error('Failed to start agent session', err);
      setError('Unable to connect to the agent right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializeSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire initial prompt when provided
  useEffect(() => {
    if (!initialPrompt?.text) return;
    // Queue until session is ready
    if (!sessionId) {
      pendingPromptRef.current = initialPrompt;
      return;
    }

    if (initialPrompt.id && initialPrompt.id === lastPromptIdRef.current) return;
    lastPromptIdRef.current = initialPrompt.id || Date.now();
    sendMessage(initialPrompt.text, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt, sessionId]);

  // If prompt arrived before session was ready, send it once sessionId exists
  useEffect(() => {
    if (sessionId && pendingPromptRef.current?.text) {
      const queued = pendingPromptRef.current;
      pendingPromptRef.current = null;
      lastPromptIdRef.current = queued.id || Date.now();
      sendMessage(queued.text, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const appendAssistant = (response) => {
    if (!response) return;
    const newMessages = [];

    if (response.response) {
      newMessages.push({ role: 'assistant', content: response.response });
    }

    if (response.bundles && response.bundles.length > 0) {
      newMessages.push({
        role: 'assistant',
        content: `I found ${response.bundles.length} option(s).`,
        bundles: response.bundles,
      });
    }

    if (newMessages.length) {
      setMessages((prev) => {
        const nextMessages = [...prev, ...newMessages];
        persistState(nextMessages);
        return nextMessages;
      });
    }
  };

  const sendMessage = async (content, fromPrompt = false) => {
    if (!content?.trim() || !sessionId) return;

    const userMessage = { role: 'user', content: content.trim() };
    setMessages((prev) => {
      const nextMessages = [...prev, userMessage];
      persistState(nextMessages);
      return nextMessages;
    });
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const response = await aiAgentApi.sendMessage(sessionId, content.trim());

      // Allow parent components to intercept/override assistant handling
      if (onAssistantResponse) {
        const handled = onAssistantResponse(response, content.trim());
        if (handled) {
          if (typeof handled === 'string') {
            appendAssistant({ response: handled });
          } else if (handled.message) {
            appendAssistant({ response: handled.message });
          }
          return;
        }
      }

      appendAssistant(response);
    } catch (err) {
      console.error('Agent send error', err);
      setError(err.response?.data?.message || 'Failed to reach the agent.');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'I hit a snag. Please try again.' },
      ]);
      // If this was an initial prompt, allow retry by clearing the marker
      if (fromPrompt) {
        lastPromptIdRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleSuggestion = (text) => {
    const promptObj = { text, id: Date.now() };
    lastPromptIdRef.current = promptObj.id;
    sendMessage(promptObj.text);
  };

  return (
    <div className="relative h-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 via-base-100 to-secondary/5 border border-base-300 shadow-2xl">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-50"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative card-body p-5 flex flex-col gap-4 h-full">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-gradient-to-br from-primary to-secondary text-primary-content rounded-full w-10">
                <span className="text-lg">AI</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                AI Concierge
              </h3>
              <p className="text-xs text-base-content/60 flex items-center gap-1">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
                Ready to assist
              </p>
            </div>
          </div>
          {restoredFromCache && (
            <div className="tooltip tooltip-left" data-tip="Session restored">
              <span className="badge badge-sm badge-success gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="w-3 h-3 stroke-current">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Restored
              </span>
            </div>
          )}
        </div>

        {/* Quick suggestions */}
        {promptSuggestions?.length > 0 && messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            <p className="text-xs text-base-content/60 w-full mb-1">Try asking:</p>
            {promptSuggestions.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                className="btn btn-xs bg-base-100/80 backdrop-blur-sm hover:bg-primary hover:text-primary-content border border-base-300 hover:border-primary transition-all duration-300 hover:scale-105"
                onClick={() => handleSuggestion(prompt.text)}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        )}

        {/* Messages container */}
        <div
          ref={messagesContainerRef}
          className="flex-1 rounded-xl p-4 bg-base-100/60 backdrop-blur-md border border-base-300/50 overflow-y-auto space-y-3 scroll-smooth"
          style={{ minHeight: '300px', maxHeight: '500px' }}
        >
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 animate-fade-in">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                <FaComments className="w-10 h-10 text-primary" />
              </div>
              <h4 className="text-lg font-semibold mb-2">Ready to help!</h4>
              <p className="text-sm text-base-content/60 max-w-xs">
                Ask me anything about flights, hotels, or car rentals. I'll find the best options for you.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={`msg-${idx}`}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md transition-all duration-300 hover:shadow-lg ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-content'
                    : 'bg-base-100 border border-base-300/50 backdrop-blur-sm'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <span className="text-xs">AI</span>
                    </div>
                    <span className="text-xs font-semibold text-primary">AI Assistant</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                {msg.bundles && msg.bundles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.bundles.map((bundle, bundleIndex) => (
                      <div
                        key={bundleIndex}
                        className="bg-gradient-to-br from-success/10 to-info/10 rounded-xl p-3 text-xs border border-success/30 hover:border-success transition-all duration-300 hover:shadow-md"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-success text-lg">${bundle.total_price?.toFixed(2)}</p>
                          <span className="badge badge-success badge-sm">Deal</span>
                        </div>
                        <p className="opacity-80 leading-relaxed">{bundle.why_this}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-base-100/80 backdrop-blur-sm border border-base-300 rounded-2xl p-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
                <span className="text-xs text-base-content/60">Thinking...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error shadow-lg text-xs animate-shake">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                className="input input-bordered w-full pr-12 bg-base-100/80 backdrop-blur-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
                placeholder="Ask me anything..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={!sessionId || loading}
              />
              {inputMessage.trim() && (
                <button
                  type="button"
                  onClick={() => setInputMessage('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              type="submit"
              className={`btn btn-primary gap-2 transition-all duration-300 ${
                inputMessage.trim() && !loading ? 'btn-lg scale-105' : ''
              }`}
              disabled={!sessionId || loading || !inputMessage.trim()}
            >
              {loading ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Sending</span>
                </>
              ) : (
                <>
                  <FaPaperPlane className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
          
          {/* Keyboard shortcut hint */}
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-xs text-base-content/40">
              Press <kbd className="kbd kbd-xs">Enter</kbd> to send
            </p>
            <p className="text-xs text-base-content/40">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentInlineChat;
