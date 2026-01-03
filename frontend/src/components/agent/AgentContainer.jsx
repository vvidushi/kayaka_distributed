import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaRobot } from 'react-icons/fa';
import { IoAirplaneSharp } from 'react-icons/io5';
import { HiLocationMarker } from 'react-icons/hi';
import { BsCalendar2Heart, BsArrowRight } from 'react-icons/bs';
import { MdFlightTakeoff, MdFlightLand } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { aiAgentApi } from '../../services/api/ai-agent';
import { listingsApi } from '../../services/api/listings';
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
  const navigate = useNavigate();
  
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
      // Create session via API service
      const data = await aiAgentApi.createSession();
      setSessionId(data.session_id);
      
      // Set session expiry (10 minutes from now)
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
      setSessionExpiry(expiryTime);
      
      // Set welcome message based on flow with examples
      const welcomeMessages = {
        flights: "Hi! I'm your flight booking assistant.\n\nI can help you:\n• Find flights to any destination\n• Compare prices across airlines\n• Book round-trip or one-way tickets\n• Filter by class, stops, and budget\n\nJust tell me where you'd like to go and when! For example:\n\"I need a flight from San Francisco to New York on December 15th\"",
        hotels: "Hi! I'm your hotel booking assistant.\n\nI can help you:\n• Find hotels in any city\n• Filter by amenities, rating, and price\n• Check availability for your dates\n• Compare hotels side-by-side\n\nWhich city are you visiting and when? For example:\n\"I need a hotel in Miami from Dec 20-25\"",
        cars: "Hi! I'm your car rental assistant.\n\nI can help you:\n• Find rental cars at any location\n• Compare prices from different companies\n• Choose vehicle type (economy, SUV, luxury)\n• Set pick-up and drop-off locations\n\nWhere do you need a car and for what dates? For example:\n\"I need an SUV in Los Angeles from Dec 15-20\""
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
        flights: "I can help you find and book flights! Just provide:\n\n• Where from (e.g., 'San Francisco' or 'SFO')\n• Where to (e.g., 'New York' or 'JFK')\n• Departure date\n• Return date (for round trips)\n• Number of passengers\n\nYou can also ask me to:\n• 'Find cheap flights to Paris'\n• 'Show me business class options'\n• 'Search for one-way tickets'\n• 'Filter by non-stop flights only'\n\nWhat would you like to know?",
        hotels: "I can help you find and book hotels! Just provide:\n\n• City or location\n• Check-in date\n• Check-out date\n• Number of guests\n\nYou can also ask me to:\n• 'Find 5-star hotels in Miami'\n• 'Show hotels with free breakfast'\n• 'Search for pet-friendly stays'\n• 'Filter by price range'\n\nWhat would you like to know?",
        cars: "I can help you find and rent cars! Just provide:\n\n• Pick-up location\n• Pick-up date and time\n• Drop-off date and time\n• Car type preference (optional)\n\nYou can also ask me to:\n• 'Find an SUV in Los Angeles'\n• 'Show luxury car options'\n• 'Search for automatic transmission'\n• 'Compare different rental companies'\n\nWhat would you like to know?"
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
      // Send message via API service
      const data = await aiAgentApi.sendMessage(sessionId, message);
      
      // Check if agent returned bundles (flights, hotels, cars)
      if (data.bundles && data.bundles.length > 0) {
        // Transform bundles to results format for display
        const transformedResults = data.bundles.map(bundle => {
          const deal = bundle.deal;
          const metadata = deal.deal_metadata || {};
          
          if (currentFlow === 'flights') {
            const durationHours = metadata.duration_hours || 3;
            return {
              id: deal.deal_id || deal.id,
              from: deal.origin,
              to: deal.destination,
              departDate: metadata.depart_date || new Date().toISOString().split('T')[0],
              departureTime: metadata.departure_time || '09:00',
              arrivalTime: metadata.arrival_time || '12:00',
              airline: metadata.airline || 'Various Airlines',
              flightNumber: metadata.flight_number || 'TBA',
              price: deal.price,
              currency: deal.currency || 'USD',
              duration: `${Math.floor(durationHours)}h ${Math.round((durationHours % 1) * 60)}m`,
              durationMinutes: Math.round(durationHours * 60),
              nonstop: (metadata.stops || 0) === 0,
              stops: metadata.stops || 0,
              seatsAvailable: deal.availability || 10,
              isDeal: deal.tags?.includes('BestValue') || deal.tags?.includes('Deal'),
            };
          } else if (currentFlow === 'hotels') {
            return {
              id: deal.deal_id || deal.id,
              name: metadata.name || `Hotel in ${deal.destination}`,
              city: deal.destination,
              address: metadata.neighborhood || deal.destination,
              rating: metadata.rating || 4,
              stars: metadata.stars || 4,
              price: deal.price,
              pricePerNight: deal.price,
              amenities: metadata.amenities || [],
              image: metadata.image || '/placeholder-hotel.jpg',
            };
          } else if (currentFlow === 'cars') {
            return {
              id: deal.deal_id || deal.id,
              vendor: metadata.car_vendor || 'Various',
              model: metadata.car_type || 'Standard',
              price: deal.price,
              pricePerDay: deal.price,
              transmission: metadata.transmission || 'Automatic',
              fuel: metadata.fuel || 'Gasoline',
              passengers: metadata.passengers || 5,
            };
          }
          return null;
        }).filter(Boolean);
        
        setResults(transformedResults);
        setShowResults(true);
        setCurrentView('results');
        
        // Extract search params from first deal
        const firstDeal = data.bundles[0].deal;
        const metadata = firstDeal.deal_metadata || {};
        setSearchParams({
          from: firstDeal.origin,
          to: firstDeal.destination,
          departDate: metadata.depart_date || new Date().toISOString().split('T')[0],
          returnDate: metadata.return_date,
          passengers: metadata.travelers || 1,
        });
      }
      
      // Add assistant response with formatted search details
      let formattedContent = data.response;
      
      // If we have bundles, enhance the message with search details
      if (data.bundles && data.bundles.length > 0 && data.bundles[0].deal) {
        const firstDeal = data.bundles[0].deal;
        const metadata = firstDeal.deal_metadata || {};
        
        if (currentFlow === 'flights') {
          // Create a formatted message with icons as a React element
          const resultsElement = (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-lg font-bold">
                <IoAirplaneSharp className="text-primary w-5 h-5" />
                <span>Flight Search Results</span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MdFlightTakeoff className="text-success w-4 h-4" />
                  <span className="font-semibold">From:</span>
                  <span>{firstDeal.origin}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <MdFlightLand className="text-error w-4 h-4" />
                  <span className="font-semibold">To:</span>
                  <span>{firstDeal.destination}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <BsCalendar2Heart className="text-secondary w-4 h-4" />
                  <span className="font-semibold">Date:</span>
                  <span>{metadata.depart_date || 'Today'}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <HiLocationMarker className="text-info w-4 h-4" />
                  <span className="font-semibold">Trip Type:</span>
                  <span>{metadata.trip_type || 'One-way'}</span>
                </div>
              </div>
              
              <div className="pt-2 border-t border-base-300">
                <p className="text-sm">
                  Found <span className="font-bold text-primary">{data.bundles.length}</span> flight{data.bundles.length !== 1 ? 's' : ''} • 
                  Prices from <span className="font-bold">${Math.min(...data.bundles.map(b => b.deal.price))}</span> to <span className="font-bold">${Math.max(...data.bundles.map(b => b.deal.price))}</span>
                </p>
              </div>
              
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <span>Check the results on the right</span>
                <BsArrowRight className="w-4 h-4 animate-bounce" style={{ animationDirection: 'alternate' }} />
              </div>
            </div>
          );
          
          // Store the element for rendering, but use plain text for message content
          formattedContent = {
            text: `Flight Search Results\n\nFrom: ${firstDeal.origin}\nTo: ${firstDeal.destination}\nDate: ${metadata.depart_date || 'Today'}\nTrip Type: ${metadata.trip_type || 'One-way'}\n\nFound ${data.bundles.length} flight${data.bundles.length !== 1 ? 's' : ''} • Prices from $${Math.min(...data.bundles.map(b => b.deal.price))} to $${Math.max(...data.bundles.map(b => b.deal.price))}\n\nCheck the results on the right →`,
            element: resultsElement
          };
        }
      }
      
      const assistantMessage = {
        role: 'assistant',
        content: typeof formattedContent === 'object' ? formattedContent.text : formattedContent,
        element: typeof formattedContent === 'object' ? formattedContent.element : null,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Check if agent extracted search parameters (legacy support)
      if (data.search_params && data.search_params_complete) {
        setSearchParams(data.search_params);
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
      let data;

      if (currentFlow === 'flights') {
        data = await listingsApi.searchFlights({
          from: params.from,
          to: params.to,
          departDate: params.departDate,
          returnDate: params.returnDate
        });
      } else if (currentFlow === 'hotels') {
        data = await listingsApi.searchHotels({
          city: params.city,
          checkIn: params.checkIn,
          checkOut: params.checkOut
        });
      } else if (currentFlow === 'cars') {
        data = await listingsApi.searchCars({
          location: params.location,
          pickUp: params.pickUp,
          dropOff: params.dropOff
        });
      }
      
      const items = data.items || [];
      setResults(items);
      setShowResults(true);
      
      // Don't add chat messages for direct UI searches
      // Messages are only added when user interacts via chat
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
      // Don't add error messages for direct UI searches
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
