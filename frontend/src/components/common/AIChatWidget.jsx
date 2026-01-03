import { useState, useEffect, useRef } from 'react';
import { FaComments, FaTimes, FaPaperPlane, FaSpinner } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import { aiAgentApi } from '../../services/api/ai-agent';

const AIChatWidget = ({
  title = 'AI Travel Concierge',
  initialMessageOverride = null,
  welcomeMessageOverride = null,
  showDeals = true,
  showBundles = true,
  chatMode = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const { isAuthenticated, user } = useAuth();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize session when widget opens
  useEffect(() => {
    if (isOpen && !sessionId && !loading) {
      initializeSession();
    }
  }, [isOpen]);

  // Connect to WebSocket for real-time deal notifications
  useEffect(() => {
    if (sessionId && isOpen) {
      const ws = new WebSocket(`ws://localhost:8000/events?session_id=${sessionId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected for deals');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle deal notifications as assistant messages
          if (data.type === 'message' && data.role === 'assistant') {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: data.content,
              deals: data.deals || []
            }]);
          }
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
      
      wsRef.current = ws;
      
      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [sessionId, isOpen]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Create session with welcome message
      const welcomeMessage = welcomeMessageOverride || (
        isAuthenticated
          ? `Hello ${user?.firstName || 'there'}! I'm your travel concierge. I can help you with your bookings, find flights, hotels, and cars, or answer any questions. How can I assist you today?`
          : 'Hello! I can help you find flights, hotels, and cars. How can I assist you today?'
      );

      const response = await aiAgentApi.createSession(initialMessageOverride, chatMode);
      
      if (response.session_id) {
        setSessionId(response.session_id);
        
        // Add welcome message
        if (response.messages && response.messages.length > 0) {
          setMessages(response.messages);
        } else {
          setMessages([
            { role: 'assistant', content: welcomeMessage }
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to initialize chat session:', err);
      setError('Failed to connect to AI concierge. Please try again later.');
      setMessages([
        { 
          role: 'assistant', 
          content: 'I\'m having trouble connecting right now. Please try again in a moment.' 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || loading || !sessionId) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setError(null);

    // Add user message to UI immediately
    const newUserMessage = { role: 'user', content: userMessage };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const response = await aiAgentApi.sendMessage(sessionId, userMessage);
      
      // Add assistant response
      if (response.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
      }

      // Handle bundles if provided and enabled
      if (showBundles && response.bundles && response.bundles.length > 0) {
        const bundleMessage = {
          role: 'assistant',
          content: `I found ${response.bundles.length} bundle(s) for you!`,
          bundles: response.bundles,
        };
        setMessages(prev => [...prev, bundleMessage]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleToggle}
          className="relative group bg-gradient-to-br from-primary to-secondary text-primary-content rounded-full p-5 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:scale-110 animate-gradient"
          aria-label="Open AI Chat"
        >
          {/* Pulse ring animation */}
          <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></span>
          
          {/* Icon */}
          <div className="relative">
            {isOpen ? (
              <FaTimes className="w-6 h-6 transition-transform duration-300 rotate-90" />
            ) : (
              <FaComments className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
            )}
          </div>
          
          {/* Badge for unread indicator (can be added later) */}
          {!isOpen && messages.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-success items-center justify-center text-xs font-bold">
                {messages.filter(m => m.role === 'assistant').length}
              </span>
            </span>
          )}
        </button>
      </div>

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] rounded-2xl shadow-2xl flex flex-col border border-base-300 backdrop-blur-xl bg-base-100/95 overflow-hidden animate-slide-up">
          {/* Animated background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 animate-gradient pointer-events-none"></div>
          
          {/* Header */}
          <div className="relative bg-gradient-to-r from-primary to-secondary text-primary-content p-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-3">
              <div className="avatar placeholder">
                <div className="bg-base-100 text-primary rounded-full w-10">
                  <span className="text-xl">AI</span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  {title}
                  <span className="badge badge-sm bg-success/20 border-success/50 text-success-content">
                    <span className="w-1.5 h-1.5 bg-success rounded-full mr-1 animate-pulse"></span>
                    Live
                  </span>
                </h3>
                {isAuthenticated && user && (
                  <p className="text-sm opacity-90">
                    {user.firstName} {user.lastName}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleToggle}
              className="btn btn-ghost btn-sm btn-circle hover:bg-primary-content/20 transition-colors"
              aria-label="Close chat"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="relative flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.length === 0 && !loading && (
              <div className="text-center text-base-content/60 py-12 animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
                  <FaComments className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Your AI Travel Assistant</h4>
                <p className="text-sm max-w-xs mx-auto">
                  Start a conversation! Ask about flights, hotels, bookings, or anything travel-related.
                </p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-3 shadow-md transition-all duration-300 hover:shadow-lg ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-content'
                      : 'bg-base-100 text-base-content border border-base-300/50'
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
                  
                  {/* Display deals if available */}
                  {showDeals && msg.deals && msg.deals.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.deals.map((deal, dealIndex) => (
                        <div
                          key={dealIndex}
                          className="bg-base-100 rounded-lg p-3 text-sm border border-primary/20 hover:border-primary/50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-primary">
                              {deal.deal_type === 'flight' && 'Flight'}
                              {deal.deal_type === 'hotel' && 'Hotel'}
                              {deal.deal_type === 'car' && 'Car Rental'}
                            </span>
                            {deal.is_limited && (
                              <span className="badge badge-error badge-xs">Limited!</span>
                            )}
                          </div>
                          <p className="text-xs opacity-75 mb-2">
                            {deal.deal_type === 'flight' 
                              ? `${deal.origin} to ${deal.destination}`
                              : deal.destination}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold">${deal.price}</span>
                            {deal.avg_30d_price && (
                              <span className="text-xs line-through opacity-50">
                                ${deal.avg_30d_price}
                              </span>
                            )}
                          </div>
                          {deal.availability && (
                            <p className="text-xs opacity-60 mt-1">
                              {deal.availability} {deal.deal_type === 'flight' ? 'seats' : deal.deal_type === 'hotel' ? 'rooms' : 'cars'} available
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Display bundles if available */}
                  {msg.bundles && msg.bundles.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.bundles.map((bundle, bundleIndex) => (
                        <div
                          key={bundleIndex}
                          className="bg-base-100 rounded p-2 text-sm border border-base-300"
                        >
                          <p className="font-semibold">${bundle.total_price?.toFixed(2)}</p>
                          <p className="text-xs opacity-75">{bundle.why_this}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-base-100 border border-base-300 rounded-2xl p-3 flex items-center gap-2 shadow-md">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                  </div>
                  <span className="text-xs text-base-content/60">AI is thinking...</span>
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error shadow-lg text-sm animate-shake">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="relative p-4 border-t border-base-300/50 bg-base-100/80 backdrop-blur-sm">
            <div className="relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full input input-bordered pr-12 focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-300"
                disabled={loading || !sessionId}
              />
              {inputMessage.trim() && (
                <button
                  type="button"
                  onClick={() => setInputMessage('')}
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button
                type="submit"
                className={`absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary btn-sm btn-circle transition-all duration-300 ${
                  inputMessage.trim() && !loading ? 'scale-110' : ''
                }`}
                disabled={loading || !sessionId || !inputMessage.trim()}
              >
                {loading ? (
                  <FaSpinner className="w-4 h-4 animate-spin" />
                ) : (
                  <FaPaperPlane className="w-4 h-4" />
                )}
              </button>
            </div>
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
      )}
    </>
  );
};

export default AIChatWidget;
