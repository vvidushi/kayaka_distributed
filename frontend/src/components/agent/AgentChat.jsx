import { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaPlane, FaBed, FaCar } from 'react-icons/fa';

/**
 * Agent Chat Component - Handles conversation with AI assistant
 */
const AgentChat = ({ 
  messages = [], 
  onSendMessage, 
  currentFlow,
  onFlowChange,
  sessionId 
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesContainerRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = inputMessage.trim();
    
    if (!message || !sessionId) return;
    
    setIsTyping(true);
    onSendMessage(message);
    setInputMessage('');
    
    // Simulate typing indicator
    setTimeout(() => setIsTyping(false), 1000);
  };

  const quickActions = {
    flights: [
      'Find flights from SFO to NYC on December 15',
      'Show me weekend trips under $500',
      'Compare business class options to London',
      'Help me book a round-trip flight'
    ],
    hotels: [
      'Find hotels in Paris with a pool',
      'Budget-friendly stay near Times Square',
      '5-star resort in Maldives for honeymoon',
      'Pet-friendly hotels in San Diego'
    ],
    cars: [
      'Rent an SUV in Los Angeles for a week',
      'Compact car for weekend getaway',
      'Luxury car rental for business meeting',
      'One-way rental from SF to LA'
    ]
  };

  return (
    <div className="flex flex-col h-full bg-base-100" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Flow Tabs */}
      <div className="border-b border-base-300 p-3" style={{ flexShrink: 0 }}>
        <div className="flex gap-2">
          <button
            onClick={() => onFlowChange('flights')}
            className={`btn btn-sm ${currentFlow === 'flights' ? 'btn-primary' : 'btn-ghost'} gap-2`}
          >
            <FaPlane className="w-3 h-3" />
            Flights
          </button>
          <button
            onClick={() => onFlowChange('hotels')}
            className={`btn btn-sm ${currentFlow === 'hotels' ? 'btn-primary' : 'btn-ghost'} gap-2`}
          >
            <FaBed className="w-3 h-3" />
            Hotels
          </button>
          <button
            onClick={() => onFlowChange('cars')}
            className={`btn btn-sm ${currentFlow === 'cars' ? 'btn-primary' : 'btn-ghost'} gap-2`}
          >
            <FaCar className="w-3 h-3" />
            Cars
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-scroll p-4 space-y-4"
        style={{
          flex: '1 1 0',
          overflowY: 'scroll',
          minHeight: 0,
          maxHeight: '100%',
          scrollbarWidth: 'thin',
          scrollbarColor: '#888 #f1f1f1',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-200 text-base-content'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              {message.timestamp && (
                <p className="text-xs opacity-60 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-base-200 rounded-lg p-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-2 h-2 bg-base-content/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3" style={{ flexShrink: 0 }}>
          <p className="text-xs text-base-content/60 mb-2">Quick suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions[currentFlow].map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  // Just fill the input box, let user review and send
                  setInputMessage(action);
                }}
                className="btn btn-xs btn-outline"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-base-300 p-4" style={{ flexShrink: 0 }}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask about ${currentFlow}...`}
            className="input input-bordered flex-1"
            disabled={!sessionId}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || !sessionId}
            className="btn btn-primary"
          >
            <FaPaperPlane className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AgentChat;
