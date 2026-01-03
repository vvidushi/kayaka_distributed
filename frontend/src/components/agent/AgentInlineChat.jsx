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
    <div className="card bg-base-100 shadow-lg border border-base-200 h-full">
      <div className="card-body p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-base-content/60">Concierge Agent</p>
            <h3 className="text-lg font-semibold">Ask me to plan it</h3>
          </div>
          <span className="badge badge-primary badge-outline flex items-center gap-1">
            <FaComments className="w-3 h-3" />
            Live
          </span>
        </div>

        {promptSuggestions?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {promptSuggestions.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                className="btn btn-xs btn-ghost border border-base-300"
                onClick={() => handleSuggestion(prompt.text)}
              >
                {prompt.label}
              </button>
            ))}
          </div>
        )}

        <div
          ref={messagesContainerRef}
          className="border border-base-300 rounded-lg p-3 bg-base-200/40 h-72 overflow-y-auto space-y-3"
        >
          {messages.map((msg, idx) => (
            <div
              key={`msg-${idx}`}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-content'
                    : 'bg-base-100 border border-base-300'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                {msg.bundles && msg.bundles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.bundles.map((bundle, bundleIndex) => (
                      <div
                        key={bundleIndex}
                        className="bg-base-200 rounded p-2 text-xs border border-base-300"
                      >
                        <p className="font-semibold">${bundle.total_price?.toFixed(2)}</p>
                        <p className="opacity-70">{bundle.why_this}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-base-100 border border-base-300 rounded-lg p-2">
                <FaSpinner className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error text-xs">
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            className="input input-bordered input-sm flex-1"
            placeholder="Ask the concierge..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!sessionId || loading}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!sessionId || loading || !inputMessage.trim()}
          >
            {loading ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaPaperPlane className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentInlineChat;
