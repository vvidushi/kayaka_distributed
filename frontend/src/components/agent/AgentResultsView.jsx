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
      navigate('/booking/hotel', { state: { hotel: item } });
    } else if (flow === 'cars') {
      navigate('/booking/car', { state: { car: item } });
    }
  };

  const renderFlightCard = (flight) => (
    <div key={flight.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg">{flight.airline}</h3>
            <div className="flex items-center gap-4 mt-2">
              <div>
                <p className="text-2xl font-bold">{flight.departure_time}</p>
                <p className="text-sm text-base-content/70">{flight.origin}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="border-t border-base-300 w-12"></div>
                <FaPlane className="text-primary" />
                <div className="border-t border-base-300 w-12"></div>
              </div>
              <div>
                <p className="text-2xl font-bold">{flight.arrival_time}</p>
                <p className="text-sm text-base-content/70">{flight.destination}</p>
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-sm text-base-content/70">
              <span>{flight.duration}</span>
              <span>•</span>
              <span>{flight.stops === 0 ? 'Non-stop' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-primary">${flight.price}</p>
            <p className="text-sm text-base-content/70">per person</p>
          </div>
        </div>
        <div className="card-actions justify-end mt-4">
          <button 
            onClick={() => handleViewDeal(flight)}
            className="btn btn-primary"
          >
            View Deal
          </button>
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
