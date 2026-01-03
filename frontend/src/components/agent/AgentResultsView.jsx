import { FaArrowLeft, FaEdit, FaPlane, FaBed, FaCar, FaSpinner, FaStar, FaDollarSign } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

/**
 * Agent Results View - Displays search results with booking options
 */
const AgentResultsView = ({ 
  flow, 
  results = [], 
  loading = false,
  searchParams = {},
  onBack,
  onModifySearch 
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const handleViewDeal = (item) => {
    // Check authentication first
    if (!isAuthenticated) {
      toast.showError('Please log in to continue with booking');
      // Save booking data to restore after login
      const bookingData = {
        type: flow,
        item,
        searchParams
      };
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      sessionStorage.setItem('returnPath', '/bookings');
      navigate('/login');
      return;
    }

    if (flow === 'flights') {
      // Navigate to bookings page with flight data (similar to FlightsPage logic)
      const bookingData = {
        type: searchParams.returnDate ? 'round-trip' : 'one-way',
        outbound: item,
        return: null, // Handle return flights separately if needed
        searchParams: {
          from: searchParams.from,
          to: searchParams.to,
          departDate: searchParams.departDate,
          returnDate: searchParams.returnDate,
          travelers: searchParams.passengers || 1,
        }
      };
      navigate('/bookings', { 
        state: { 
          bookingData,
          createNew: true 
        } 
      });
    } else if (flow === 'hotels') {
      // Navigate to bookings page with hotel data
      const checkIn = searchParams.checkIn || new Date().toISOString().split('T')[0];
      const checkOut = searchParams.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const checkInDateObj = new Date(checkIn);
      const checkOutDateObj = new Date(checkOut);
      const nights = Math.ceil((checkOutDateObj - checkInDateObj) / (1000 * 60 * 60 * 24)) || 1;
      
      const bookingData = {
        type: 'hotel',
        hotel: item,
        checkIn,
        checkOut,
        nights,
        guests: searchParams.guests || 1,
      };
      navigate('/bookings', { state: { bookingData } });
    } else if (flow === 'cars') {
      // Navigate to bookings page with car data
      const pickupDate = searchParams.pickupDate || new Date().toISOString().split('T')[0];
      const dropoffDate = searchParams.dropoffDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const pickupDateObj = new Date(pickupDate);
      const dropoffDateObj = new Date(dropoffDate);
      const days = Math.ceil((dropoffDateObj - pickupDateObj) / (1000 * 60 * 60 * 24)) || 1;
      
      const bookingData = {
        type: 'car',
        car: item,
        pickupDate,
        dropoffDate,
        pickupTime: searchParams.pickupTime || '12:00',
        dropoffTime: searchParams.dropoffTime || '12:00',
        days,
        passengers: searchParams.passengers || 1,
      };
      navigate('/bookings', { state: { bookingData } });
    }
  };

  const renderFlightCard = (flight) => (
    <div
      key={flight.id}
      className="card bg-base-100 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
      onClick={() => handleViewDeal(flight)}
    >
      <div className="card-body p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Flight Info */}
          <div className="flex-1 space-y-2 w-full md:w-auto">
            {/* Airline */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg">{flight.airline}</span>
              <span className="text-sm text-base-content/60">{flight.flightNumber}</span>
              {flight.isDeal && (
                <span className="badge badge-success badge-sm">Deal</span>
              )}
              {flight.nonstop && (
                <span className="badge badge-primary badge-sm">Direct</span>
              )}
            </div>

            {/* Route and Time */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{flight.from}</div>
                <div className="text-sm text-base-content/60">{flight.departureTime}</div>
                {flight.departDate && (
                  <div className="text-xs text-base-content/60">
                    {new Date(flight.departDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col items-center px-2">
                <div className="text-xs text-base-content/60 mb-1">
                  {flight.duration}
                </div>
                <div className="w-full h-0.5 bg-base-300 relative">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <FaPlane className="w-3 h-3 text-primary" />
                  </div>
                </div>
                <span className="text-xs text-base-content/60 mt-1">
                  {flight.nonstop ? 'Non-stop' : `${flight.stops || 0} stop${flight.stops > 1 ? 's' : ''}`}
                </span>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold">{flight.to}</div>
                <div className="text-sm text-base-content/60">{flight.arrivalTime}</div>
                {flight.departDate && (
                  <div className="text-xs text-base-content/60">
                    {new Date(flight.departDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex items-center gap-3 text-xs text-base-content/60">
              {flight.seatsAvailable && flight.seatsAvailable <= 5 && (
                <span className="badge badge-warning badge-xs">Only {flight.seatsAvailable} seats left</span>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="text-right flex-shrink-0">
            <div className="text-3xl font-bold text-primary">${flight.price}</div>
            <div className="text-xs text-base-content/60">{flight.currency || 'USD'}</div>
            <div className="text-xs text-base-content/60">per person</div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleViewDeal(flight);
              }}
              className="btn btn-primary btn-sm mt-2"
            >
              View Deal
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHotelCard = (hotel) => (
    <div key={hotel.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body">
        <div className="flex gap-4">
          {hotel.image && (
            <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
              <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-lg">{hotel.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex text-warning">
                {[...Array(5)].map((_, i) => (
                  <FaStar key={i} className={i < (hotel.stars || 0) ? 'opacity-100' : 'opacity-20'} />
                ))}
              </div>
              {hotel.rating && (
                <span className="badge badge-sm">{hotel.rating}/10</span>
              )}
            </div>
            <p className="text-sm text-base-content/70 mt-2">{hotel.address}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {hotel.amenities?.slice(0, 3).map((amenity, i) => (
                <span key={i} className="badge badge-outline badge-sm">{amenity}</span>
              ))}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold text-primary">${hotel.price}</p>
            <p className="text-sm text-base-content/70">per night</p>
          </div>
        </div>
        <div className="card-actions justify-end mt-4">
          <button 
            onClick={() => handleViewDeal(hotel)}
            className="btn btn-primary"
          >
            View Deal
          </button>
        </div>
      </div>
    </div>
  );

  const renderCarCard = (car) => (
    <div key={car.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body">
        <div className="flex gap-4">
          {car.image && (
            <div className="w-32 h-24 rounded-lg overflow-hidden flex-shrink-0">
              <img src={car.image} alt={car.model} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-lg">{car.model}</h3>
            <p className="text-sm text-base-content/70">{car.company}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-sm">
              <span>{car.category}</span>
              <span>•</span>
              <span>{car.passengers} passengers</span>
              <span>•</span>
              <span>{car.transmission}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {car.features?.slice(0, 3).map((feature, i) => (
                <span key={i} className="badge badge-outline badge-sm">{feature}</span>
              ))}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold text-primary">${car.price}</p>
            <p className="text-sm text-base-content/70">per day</p>
          </div>
        </div>
        <div className="card-actions justify-end mt-4">
          <button 
            onClick={() => handleViewDeal(car)}
            className="btn btn-primary"
          >
            View Deal
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <FaArrowLeft />
            </button>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {flow === 'flights' && <><FaPlane /> Flight Results</>}
                {flow === 'hotels' && <><FaBed /> Hotel Results</>}
                {flow === 'cars' && <><FaCar /> Car Rental Results</>}
              </h2>
              <p className="text-sm text-base-content/70">
                {loading ? 'Searching...' : `${results.length} result${results.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
          </div>
          <button
            onClick={onModifySearch}
            className="btn btn-outline btn-sm gap-2"
          >
            <FaEdit />
            Modify Search
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-scroll p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FaSpinner className="text-4xl text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Searching for the best options...</p>
              <p className="text-sm text-base-content/70">This may take a few moments</p>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              {flow === 'flights' && <FaPlane className="text-6xl text-base-content/20 mx-auto mb-4" />}
              {flow === 'hotels' && <FaBed className="text-6xl text-base-content/20 mx-auto mb-4" />}
              {flow === 'cars' && <FaCar className="text-6xl text-base-content/20 mx-auto mb-4" />}
              <h3 className="text-xl font-bold mb-2">No Results Found</h3>
              <p className="text-base-content/70 mb-4">
                We couldn't find any options matching your search.
                {flow === 'flights' && (
                  <span className="block mt-2 text-sm">
                    Try searching different dates, routes, or use the chat to ask about available options.
                  </span>
                )}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={onModifySearch}
                  className="btn btn-primary"
                >
                  Modify Search
                </button>
                {onBack && (
                  <button
                    onClick={onBack}
                    className="btn btn-ghost btn-sm"
                  >
                    Back to Chat
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {flow === 'flights' && results.map(renderFlightCard)}
            {flow === 'hotels' && results.map(renderHotelCard)}
            {flow === 'cars' && results.map(renderCarCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentResultsView;
