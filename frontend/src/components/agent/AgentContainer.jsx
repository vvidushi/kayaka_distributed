import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaRobot } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';
import AgentChat from './AgentChat';
import AgentSearchPanel from './AgentSearchPanel';
import AgentResultsView from './AgentResultsView';

/**
 * Main Agent Container - Handles the complete agent booking flow
 * Follows Kayak's agent workflow:
 * 1. User selects service type (flights/hotels/cars)
 * 2. Agent chat guides user to fill search parameters
 * 3. Show results alongside chat
 * 4. Allow booking directly from results
 */
const AgentContainer = ({ 
  initialFlow = 'flights',
  onClose,
  onFlowChange 
}) => {
  const { user, isAuthenticated } = useAuth();
  
  // Current active flow (flights, hotels, cars)
  const [currentFlow, setCurrentFlow] = useState(initialFlow);
  
  // Agent conversation state
  const [sessionId, setSessionId] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // Search parameters extracted from conversation
  const [searchParams, setSearchParams] = useState(null);
  
  // Results state
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // View state: 'chat' | 'search' | 'results'
  const [currentView, setCurrentView] = useState('chat');

  // Initialize session on mount or flow change
  useEffect(() => {
    initializeAgentSession();
  }, [currentFlow]);

  // Check session expiry every minute
  useEffect(() => {
    const checkExpiry = setInterval(() => {
      if (sessionExpiry && new Date() > sessionExpiry) {
        // Session expired, reinitialize
        initializeAgentSession();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkExpiry);
  }, [sessionExpiry]);

  // Handle logout - reset session
  useEffect(() => {
    if (!isAuthenticated && sessionId) {
      // User logged out, clear session
      setSessionId(null);
      setSessionExpiry(null);
      setMessages([]);
      setSearchParams(null);
      setResults([]);
      setCurrentView('chat');
    }
  }, [isAuthenticated]);

  const initializeAgentSession = async () => {
    try {
      // Get user ID - prefer user.id, fallback to email or anonymous
      const userId = user?.id || user?.email || `guest_${Date.now()}`;
      
      const response = await fetch('http://localhost:8000/api/v1/concierge/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSessionId(data.session_id);
      
      // Set session expiry (10 minutes from now)
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
      setSessionExpiry(expiryTime);
      
      // Set welcome message based on flow with examples
      const welcomeMessages = {
        flights: "Hi! I'm your flight booking assistant. 👋\n\nI can help you:\n• Find flights to any destination\n• Compare prices across airlines\n• Book round-trip or one-way tickets\n• Filter by class, stops, and budget\n\nJust tell me where you'd like to go and when! For example:\n\"I need a flight from San Francisco to New York on December 15th\"",
        hotels: "Hi! I'm your hotel booking assistant. 👋\n\nI can help you:\n• Find hotels in any city\n• Filter by amenities, rating, and price\n• Check availability for your dates\n• Compare hotels side-by-side\n\nWhich city are you visiting and when? For example:\n\"I need a hotel in Miami from Dec 20-25\"",
        cars: "Hi! I'm your car rental assistant. 👋\n\nI can help you:\n• Find rental cars at any location\n• Compare prices from different companies\n• Choose vehicle type (economy, SUV, luxury)\n• Set pick-up and drop-off locations\n\nWhere do you need a car and for what dates? For example:\n\"I need an SUV in Los Angeles from Dec 15-20\""
      };
      
      setMessages([{
        role: 'assistant',
        content: welcomeMessages[currentFlow],
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to initialize agent session:', error);
    }
  };

  const handleFlowSwitch = (newFlow) => {
    if (newFlow === currentFlow) return;
    
    setCurrentFlow(newFlow);
    setSearchParams(null);
    setShowResults(false);
    setResults([]);
    setCurrentView('chat');
    
    if (onFlowChange) {
      onFlowChange(newFlow);
    }
  };

  const handleModifySearch = () => {
    // Open search panel to manually modify parameters
    setCurrentView('search');
  };

  const handleBackToChat = () => {
    // Go back to chat to refine via conversation
    setCurrentView('chat');
  };

  const handleBackToSearch = () => {
    // Go back to search panel from results
    setCurrentView('search');
  };

  const handleMessageSend = async (message) => {
    if (!sessionId) return;

    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Check for help keywords
    const helpKeywords = ['help', 'what can you do', 'how does this work', 'options', 'commands'];
    if (helpKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      const helpResponses = {
        flights: "I can help you find and book flights! Just provide:\n\n✈️ Where from (e.g., 'San Francisco' or 'SFO')\n✈️ Where to (e.g., 'New York' or 'JFK')\n✈️ Departure date\n✈️ Return date (for round trips)\n✈️ Number of passengers\n\nYou can also ask me to:\n• 'Find cheap flights to Paris'\n• 'Show me business class options'\n• 'Search for one-way tickets'\n• 'Filter by non-stop flights only'\n\nWhat would you like to know?",
        hotels: "I can help you find and book hotels! Just provide:\n\n🏨 City or location\n🏨 Check-in date\n🏨 Check-out date\n🏨 Number of guests\n\nYou can also ask me to:\n• 'Find 5-star hotels in Miami'\n• 'Show hotels with free breakfast'\n• 'Search for pet-friendly stays'\n• 'Filter by price range'\n\nWhat would you like to know?",
        cars: "I can help you find and rent cars! Just provide:\n\n🚗 Pick-up location\n🚗 Pick-up date and time\n🚗 Drop-off date and time\n🚗 Car type preference (optional)\n\nYou can also ask me to:\n• 'Find an SUV in Los Angeles'\n• 'Show luxury car options'\n• 'Search for automatic transmission'\n• 'Compare different rental companies'\n\nWhat would you like to know?"
      };
      
      const helpMessage = {
        role: 'assistant',
        content: helpResponses[currentFlow],
        timestamp: new Date()
      };
      setMessages(prev => [...prev, helpMessage]);
      return;
    }

    try {
      // Send to AI agent backend
      const response = await fetch(`http://localhost:8000/api/v1/concierge/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          flow_type: currentFlow
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Check if agent extracted search parameters
      if (data.search_params && data.search_params_complete) {
        setSearchParams(data.search_params);
        // Automatically trigger search instead of showing search panel
        await handleSearch(data.search_params);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I'm having trouble connecting to the backend. Please make sure:\n• The AI agent service is running on port 8000\n• Your network connection is stable\n\nYou can still manually enter search details or try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleSearch = async (params) => {
    setLoading(true);
    setCurrentView('results'); // Show results view immediately with loading state
    setShowResults(true);
    
    try {
      let endpoint = '';
      let queryParams = new URLSearchParams();

      if (currentFlow === 'flights') {
        endpoint = 'http://localhost:3000/api/v1/listings/flights/search';
        queryParams.append('from', params.from || '');
        queryParams.append('to', params.to || '');
        queryParams.append('date', params.departDate || '');
        if (params.returnDate) queryParams.append('returnDate', params.returnDate);
      } else if (currentFlow === 'hotels') {
        endpoint = 'http://localhost:3000/api/v1/listings/hotels/search';
        queryParams.append('city', params.city || '');
        queryParams.append('checkIn', params.checkIn || '');
        queryParams.append('checkOut', params.checkOut || '');
      } else if (currentFlow === 'cars') {
        endpoint = 'http://localhost:3000/api/v1/listings/cars/search';
        queryParams.append('location', params.location || '');
        queryParams.append('pickUp', params.pickUp || '');
        queryParams.append('dropOff', params.dropOff || '');
      }

      const response = await fetch(`${endpoint}?${queryParams}`);
      const data = await response.json();
      
      const items = data.items || [];
      setResults(items);
      setShowResults(true);
      
      // Add AI feedback message with result count
      const typeLabel = currentFlow === 'flights' ? 'flights' : currentFlow === 'hotels' ? 'stays' : 'cars';
      const resultMessage = {
        role: 'assistant',
        content: items.length > 0 
          ? `Great news! ✨ I found ${items.length} result${items.length !== 1 ? 's' : ''} for you. Check them out on the right! You can click "View Deal" to see details and book.`
          : `No ${typeLabel} found matching your search. 😕 Try different dates or locations, or chat with me to explore other options!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, resultMessage]);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      const errorMessage = {
        role: 'assistant',
        content: 'Oops! Something went wrong while searching. Please try again or modify your search criteria.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchParamsChange = (params) => {
    setSearchParams(params);
  };

  return (
    <div className="fixed inset-0 z-50 bg-base-100 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-primary text-primary-content shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaRobot className="text-2xl" />
              <div>
                <h1 className="text-xl font-bold">AI Travel Assistant</h1>
                <p className="text-sm opacity-90">
                  {currentFlow === 'flights' && 'Finding the best flights for you'}
                  {currentFlow === 'hotels' && 'Searching for perfect accommodations'}
                  {currentFlow === 'cars' && 'Locating ideal rental cars'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-ghost btn-sm gap-2 text-primary-content"
              aria-label="Close agent"
            >
              <FaTimes className="w-4 h-4" />
              <span className="hidden sm:inline">Close</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Left Side - Chat (always visible on desktop, toggleable on mobile) */}
          <div 
            className={`lg:block lg:col-span-1 border-r border-base-300 ${
              currentView !== 'chat' && (currentView === 'search' || currentView === 'results') 
                ? 'hidden' 
                : 'block'
            }`}
            style={{ 
              height: '100%',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex', 
              flexDirection: 'column'
            }}>
              <AgentChat
                key="agent-chat-persistent"
                messages={messages}
                onSendMessage={handleMessageSend}
                currentFlow={currentFlow}
                onFlowChange={handleFlowSwitch}
                sessionId={sessionId}
              />
            </div>
          </div>

          {/* Right Side - Search Panel or Results */}
          <div 
            className={`${
              currentView === 'chat' ? 'hidden lg:flex' : 'flex'
            } lg:col-span-2 flex-col bg-base-50`}
            style={{
              height: '100%',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column'
            }}>
            {currentView === 'chat' && (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <FaRobot className="text-6xl text-primary mx-auto mb-4 opacity-50" />
                  <h2 className="text-2xl font-bold mb-2">Let's plan your trip!</h2>
                  <p className="text-base-content/70">
                    Chat with me on the left to share your travel plans. 
                    I'll help you find and book the best options.
                  </p>
                </div>
              </div>
            )}

            {currentView === 'search' && searchParams && (
              <AgentSearchPanel
                flow={currentFlow}
                initialParams={searchParams}
                onSearch={handleSearch}
                onParamsChange={handleSearchParamsChange}
                onBack={handleBackToChat}
              />
            )}

            {currentView === 'results' && (
              <AgentResultsView
                flow={currentFlow}
                results={results}
                loading={loading}
                searchParams={searchParams}
                onBack={handleBackToSearch}
                onModifySearch={() => setCurrentView('search')}
              />
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentContainer;
