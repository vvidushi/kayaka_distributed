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
      <button
        onClick={handleToggle}
        className="fixed bottom-6 right-6 z-50 bg-primary text-primary-content rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        aria-label="Open AI Chat"
      >
        {isOpen ? (
          <FaTimes className="w-6 h-6" />
        ) : (
          <FaComments className="w-6 h-6" />
        )}
      </button>

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-base-100 rounded-lg shadow-2xl flex flex-col border border-base-300">
          {/* Header */}
          <div className="bg-primary text-primary-content p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">{title}</h3>
              {isAuthenticated && user && (
                <p className="text-sm opacity-90">
                  {user.firstName} {user.lastName}
                </p>
              )}
            </div>
            <button
              onClick={handleToggle}
              className="hover:opacity-70 transition-opacity"
              aria-label="Close chat"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && !loading && (
              <div className="text-center text-base-content/60 py-8">
                <FaComments className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Start a conversation with your AI concierge!</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 text-base-content'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  
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
              <div className="flex justify-start">
                <div className="bg-base-200 rounded-lg p-3">
                  <FaSpinner className="w-5 h-5 animate-spin" />
                </div>
              </div>
            )}

            {error && (
              <div className="alert alert-error text-sm">
                <span>{error}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-base-300">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 input input-bordered input-sm"
                disabled={loading || !sessionId}
              />
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={loading || !sessionId || !inputMessage.trim()}
              >
                {loading ? (
                  <FaSpinner className="w-4 h-4 animate-spin" />
                ) : (
                  <FaPaperPlane className="w-4 h-4" />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
