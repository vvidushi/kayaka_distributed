import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './HotelsMap.css';
import L from 'leaflet';
import { listingsApi } from '../../services/api/listings';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { US_STATES } from '../../constants/usStates';
import AgentInlineChat from '../../components/agent/AgentInlineChat';

// Fix for default marker icon in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom price marker icon
const createPriceIcon = (price) => {
  return L.divIcon({
    className: 'custom-price-marker',
    html: `<div style="
      background: #3b82f6;
      color: white;
      padding: 4px 8px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 12px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 2px solid white;
    ">$${price}</div>`,
    iconSize: [60, 30],
    iconAnchor: [30, 15],
  });
};

const MAX_CITY_SUGGESTIONS = 18;

const mapHotelLocationToOption = (item) => {
  if (!item) return null;
  const baseCity = item.city || item.name || '';
  if (!baseCity) return null;

  const regionParts = [];
  if (item.state) regionParts.push(item.state);
  if (item.country && !regionParts.includes(item.country)) {
    regionParts.push(item.country);
  }

  return {
    id: `${item.type || 'location'}-${baseCity}-${regionParts.join('-')}`,
    label: item.displayName || baseCity,
    city: baseCity,
    region: regionParts.join(', '),
    type: item.type || 'location',
  };
};

const defaultFilters = {
  city: '',
  state: '',
  minPrice: '',
  maxPrice: '',
  minRating: '',
  amenity: '',
  sortBy: 'pricePerNight',
  sortOrder: 'asc',
};

const HotelsPage = () => {
  useDocumentTitle('Search Hotels');
  
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  const searchData = location.state?.search;
  const agentMode = Boolean(location.state?.agentMode);
  const initialAgentPrompt = useMemo(() => {
    const text = location.state?.agentInitialPrompt;
    const id = location.state?.agentInitialPromptId;
    return text ? { text, id: id || `hotels-agent-${Date.now()}` } : null;
  }, [location.state]);
  
  // Initialize filters with search data from HomePage if available
  // Extract just the city name from full location string (e.g., "New York, New York, United States" -> "New York")
  // Also handles airport codes (e.g., "New Delhi (DEL)" -> "New Delhi")
  const extractCityName = (location) => {
    if (!location) return '';
    const parts = location.split(',');
    let cityName = parts[0].trim(); // Get first part before comma
    // Remove airport code in parentheses if present
    cityName = cityName.replace(/\s*\([A-Z]{3}\)\s*$/, '');
    return cityName;
  };
  
  const initialFilters = {
    ...defaultFilters,
    city: extractCityName(searchData?.location) || '',
  };
  
  const [filters, setFilters] = useState(initialFilters);
  const [cityInput, setCityInput] = useState(extractCityName(searchData?.location) || '');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC
  const [mapZoom, setMapZoom] = useState(12);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityDropdownRef = useRef(null);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [selectedPriceRange, setSelectedPriceRange] = useState('');

  const navigateAgentTo = (mode) => {
    if (!agentMode) return;
    if (mode === 'flights') {
      navigate('/agent/flights', { state: { agentMode: true } });
      return;
    }
    if (mode === 'cars') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      navigate('/cars', {
        state: {
          agentMode: true,
          search: { location: filters.city, pickUp: today, dropOff: tomorrow },
        },
      });
      return;
    }
    // already on hotels
  };
  const priceDropdownRef = useRef(null);
  const [showAllFilters, setShowAllFilters] = useState(false);
  const [selectedFilterSection, setSelectedFilterSection] = useState('price');
  const [freebies, setFreebies] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const cityDebounceRef = useRef(null);

  const fetchCityOptions = useCallback(async (query = '') => {
    try {
      setIsCityLoading(true);
      const results = await listingsApi.searchHotelLocations(query || '', MAX_CITY_SUGGESTIONS);
      const formatted = (results || [])
        .map(mapHotelLocationToOption)
        .filter(Boolean);

      if (query) {
        setCitySuggestions(formatted);
      } else {
        setPopularCities(formatted);
        setCitySuggestions(formatted);
      }
    } catch (fetchError) {
      console.error('Failed to load hotel locations', fetchError);
      if (query) {
        setCitySuggestions([]);
      }
    } finally {
      setIsCityLoading(false);
    }
  }, []);

  const loadHotels = async (overridePage, overrideFilters) => {
    const currentPage = overridePage ?? page;
    const activeFilters = overrideFilters ?? filters;
    
    // Only show loading spinner on initial load or when there are no results
    // This prevents flickering when filters change
    if (results.length === 0) {
    setLoading(true);
    } else {
      // Show subtle refresh indicator when updating existing results
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const params = {
        page: currentPage,
        pageSize,
        sortBy: activeFilters.sortBy,
        sortOrder: activeFilters.sortOrder,
      };

      if (activeFilters.city) params.city = activeFilters.city;
      if (activeFilters.state) params.state = activeFilters.state;
      if (activeFilters.minPrice) params.minPrice = activeFilters.minPrice;
      if (activeFilters.maxPrice) params.maxPrice = activeFilters.maxPrice;
      if (activeFilters.minRating) params.minRating = activeFilters.minRating;
      if (activeFilters.amenity) params.amenity = activeFilters.amenity;

      const data = await listingsApi.searchHotels(params);
      setResults(data.items || []);
      setPagination(data.pagination || null);
      setPage(currentPage);

      // Update map center based on first result
      if (data.items && data.items.length > 0 && data.items[0].lat && data.items[0].lng) {
        setMapCenter([data.items[0].lat, data.items[0].lng]);
        setMapZoom(12);
      }
    } catch (err) {
      console.error('Failed to load hotels', err);
      setError(err.response?.data?.message || 'Failed to load hotels');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load hotels when component mounts or when search data changes
  useEffect(() => {
    if (searchData?.location) {
      // If we have search data from navigation, extract city and load with those filters
      const cityName = extractCityName(searchData.location);
      const newFilters = { ...filters, city: cityName };
      setFilters(newFilters);
      setCityInput(cityName);
      // Load hotels immediately with the new filters
      loadHotels(1, newFilters);
    } else {
      // No search data, just load all hotels
      loadHotels(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target)) {
        setShowCityDropdown(false);
      }
      if (priceDropdownRef.current && !priceDropdownRef.current.contains(event.target)) {
        setShowPriceFilter(false);
      }
    };

    if (showCityDropdown || showPriceFilter) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCityDropdown, showPriceFilter]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    loadHotels(1, newFilters);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newFilters = { ...filters, city: cityInput };
    setFilters(newFilters);
    setShowCityDropdown(false);
    loadHotels(1, newFilters);
  };
  
  const handleCityInputChange = (e) => {
    setCityInput(e.target.value);
    setShowCityDropdown(true);
  };

  useEffect(() => {
    fetchCityOptions('');
  }, [fetchCityOptions]);

  useEffect(() => {
    const trimmed = cityInput.trim();
    if (!trimmed) {
      setCitySuggestions([...(popularCities ?? [])]);
      return undefined;
    }

    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
    }

    cityDebounceRef.current = setTimeout(() => {
      fetchCityOptions(trimmed);
    }, 300);

    return () => {
      if (cityDebounceRef.current) {
        clearTimeout(cityDebounceRef.current);
      }
    };
  }, [cityInput, fetchCityOptions, popularCities]);

  const handleCitySelect = (cityOption) => {
    const selectedCity = cityOption?.city || cityOption?.name;
    if (!selectedCity) return;
    setCityInput(cityOption.label || selectedCity);
    const newFilters = { ...filters, city: selectedCity };
    setFilters(newFilters);
    setShowCityDropdown(false);
    loadHotels(1, newFilters);
  };

  const goToPage = (newPage) => {
    if (!pagination) return;
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadHotels(newPage);
  };

  const handleViewDeal = (hotel) => {
    console.log('=== View Deal clicked ===');
    console.log('Hotel:', hotel);
    console.log('isAuthenticated:', isAuthenticated);
    console.log('searchData:', searchData);
    
    // Check if user is authenticated
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      toast.showError('Please log in to continue with booking');
      // Save booking data to sessionStorage to restore after login
      const checkIn = searchData?.checkIn || new Date().toISOString().split('T')[0];
      const checkOut = searchData?.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1;

      const bookingData = {
        type: 'hotel',
        hotel,
        checkIn,
        checkOut,
        nights,
        guests: searchData?.guests || 1,
      };
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      sessionStorage.setItem('returnPath', '/bookings');
      navigate('/login');
      return;
    }

    // Calculate nights between check-in and check-out
    // Use searchData first, then fallback to today/tomorrow
    const checkIn = searchData?.checkIn || new Date().toISOString().split('T')[0];
    const checkOut = searchData?.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24)) || 1;

    const bookingData = {
      type: 'hotel',
      hotel,
      checkIn,
      checkOut,
      nights,
      guests: searchData?.guests || 1,
    };

    console.log('Navigating to /bookings with bookingData:', bookingData);
    navigate('/bookings', { state: { bookingData } });
  };

  const handlePriceFilterApply = () => {
    const newFilters = {
      ...filters,
      minPrice: tempMinPrice,
      maxPrice: tempMaxPrice
    };
    setFilters(newFilters);
    loadHotels(1, newFilters);
    setShowPriceFilter(false);
  };

  const handlePriceFilterReset = () => {
    setTempMinPrice('');
    setTempMaxPrice('');
    setSelectedPriceRange('');
    const newFilters = {
      ...filters,
      minPrice: '',
      maxPrice: ''
    };
    setFilters(newFilters);
    loadHotels(1, newFilters);
  };

  const handleQuickPriceSelect = (range, minPrice, maxPrice) => {
    setTempMinPrice(minPrice);
    setTempMaxPrice(maxPrice);
    setSelectedPriceRange(range);
  };

  const getPriceFilterLabel = () => {
    if (filters.minPrice && filters.maxPrice) {
      return `$${filters.minPrice} - $${filters.maxPrice}`;
    } else if (filters.minPrice) {
      return `$${filters.minPrice}+`;
    } else if (filters.maxPrice) {
      return `Up to $${filters.maxPrice}`;
    }
    return 'Price';
  };

  const handleAllFiltersApply = () => {
    const newFilters = {
      ...filters,
      minPrice: tempMinPrice,
      maxPrice: tempMaxPrice,
    };
    setFilters(newFilters);
    loadHotels(1, newFilters);
    setShowAllFilters(false);
  };

  const handleAllFiltersReset = () => {
    setTempMinPrice('');
    setTempMaxPrice('');
    setSelectedPriceRange('');
    setFreebies([]);
    const newFilters = {
      ...defaultFilters,
      city: filters.city, // Keep city filter
    };
    setFilters(newFilters);
    loadHotels(1, newFilters);
  };

  const toggleFreebie = (freebie) => {
    setFreebies(prev => 
      prev.includes(freebie) 
        ? prev.filter(f => f !== freebie)
        : [...prev, freebie]
    );
  };

  const activeCityOptions = (cityInput.trim() ? citySuggestions : popularCities);

  return (
    <div className="min-h-screen bg-base-100">
      {/* Top search bar - Kayak style */}
      <div className="bg-base-100/90 backdrop-blur-sm border-b border-base-300 sticky top-0 z-20 shadow-sm">
        <div className="max-w-full mx-auto px-4 py-3">
          <form className="flex items-center gap-2" onSubmit={handleSubmit}>
            <div className="relative flex-1 max-w-md" ref={cityDropdownRef}>
              <input
                type="text"
                name="city"
                placeholder="Search city (e.g., New York, Miami, Austin...)"
                value={cityInput}
                onChange={handleCityInputChange}
                onFocus={() => setShowCityDropdown(true)}
                className="input input-sm input-bordered w-full"
                autoComplete="off"
              />
              
              {/* Autocomplete Dropdown */}
              {showCityDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-base-100 border-2 border-primary/20 rounded-lg shadow-2xl w-full max-h-96 overflow-y-auto" style={{ zIndex: 9999 }}>
                  <div className="sticky top-0 bg-base-200 px-4 py-2 text-xs font-semibold text-base-content/70 border-b border-base-300 flex items-center justify-between">
                    <span>
                      {isCityLoading
                        ? 'Searching cities...'
                        : `${activeCityOptions.length} ${activeCityOptions.length === 1 ? 'city' : 'cities'} found`}
                    </span>
                    {isCityLoading && <span className="loading loading-xs loading-spinner text-primary"></span>}
                  </div>

                  {isCityLoading && (
                    <div className="px-4 py-6 text-sm text-base-content/70 flex items-center gap-2">
                      <span className="loading loading-sm loading-spinner text-primary"></span>
                      Fetching the best matches...
                    </div>
                  )}

                  {!isCityLoading && activeCityOptions.length === 0 && (
                    <div className="px-4 py-4 text-sm text-base-content/60">
                      No cities found. Try broadening your search or check spelling.
                    </div>
                  )}

                  {!isCityLoading && activeCityOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-primary/10 flex items-start gap-3 border-b border-base-200 last:border-b-0 transition-colors"
                      onClick={() => handleCitySelect(option)}
                    >
                      <span className="text-primary text-lg mt-0.5"></span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-base-content">{option.label}</div>
                        {option.region && (
                          <div className="text-xs text-base-content/60 mt-0.5">{option.region}</div>
                        )}
                      </div>
                      <span className="badge badge-xs badge-outline uppercase tracking-wide">
                        {option.type === 'property' ? 'Property' : 'City'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <input
              type="date"
              className="input input-sm input-bordered w-32"
              value={searchData?.checkIn || ''}
              readOnly
            />
            <input
              type="date"
              className="input input-sm input-bordered w-32"
              value={searchData?.checkOut || ''}
              readOnly
            />
            <div className="text-sm px-3">
              {searchData?.guests || 1} guest{searchData?.guests > 1 ? 's' : ''}
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-sm btn-circle"
              disabled={loading}
            >
              
            </button>
          </form>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-base-200 border-b border-base-300">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2 items-center">
              <button
              className="btn btn-sm btn-outline"
                onClick={() => {
                setShowAllFilters(true);
                setTempMinPrice(filters.minPrice || '');
                setTempMaxPrice(filters.maxPrice || '');
              }}
            >
              All filters
            </button>
            {filters.state && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => {
                  const newFilters = { ...filters, state: '' };
                  setFilters(newFilters);
                  loadHotels(1, newFilters);
                }}
              >
                State: {US_STATES.find(s => s.value === filters.state)?.label || filters.state}
                <span className="ml-2">×</span>
              </button>
            )}
            <button className="btn btn-sm btn-outline">Smart Filters</button>
            <button 
              className={`btn btn-sm ${filters.amenity === 'breakfast' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => {
                const newFilters = {
                  ...filters,
                  amenity: filters.amenity === 'breakfast' ? '' : 'breakfast'
                };
                  setFilters(newFilters);
                  loadHotels(1, newFilters);
                }}
              >
              Free breakfast
              </button>
            
            {/* Price Filter with Dropdown */}
            <div className="relative" ref={priceDropdownRef}>
              <button
                className={`btn btn-sm ${filters.minPrice || filters.maxPrice ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => {
                  setShowPriceFilter(!showPriceFilter);
                  setTempMinPrice(filters.minPrice || '');
                  setTempMaxPrice(filters.maxPrice || '');
                  
                  // Detect and highlight the matching quick select range
                  const min = filters.minPrice || '';
                  const max = filters.maxPrice || '';
                  if (min === '' && max === '100') {
                    setSelectedPriceRange('under100');
                  } else if (min === '100' && max === '200') {
                    setSelectedPriceRange('100-200');
                  } else if (min === '200' && max === '300') {
                    setSelectedPriceRange('200-300');
                  } else if (min === '300' && max === '') {
                    setSelectedPriceRange('300+');
                  } else {
                    setSelectedPriceRange('');
                  }
                }}
              >
                {getPriceFilterLabel()}
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showPriceFilter && (
                <div className="absolute top-full left-0 mt-2 bg-base-100 border-2 border-primary/20 rounded-lg shadow-2xl p-4 w-80 z-50">
                  <div className="mb-4">
                    <h3 className="font-semibold text-base-content mb-3">Price Range</h3>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-base-content/60 mb-1 block">Min Price</label>
                        <input
                          type="number"
                          placeholder="$0"
                          value={tempMinPrice}
                          onChange={(e) => {
                            setTempMinPrice(e.target.value);
                            setSelectedPriceRange(''); // Clear selection when manually editing
                          }}
                          className="input input-sm input-bordered w-full"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-base-content/60 mb-1 block">Max Price</label>
                        <input
                          type="number"
                          placeholder="Any"
                          value={tempMaxPrice}
                          onChange={(e) => {
                            setTempMaxPrice(e.target.value);
                            setSelectedPriceRange(''); // Clear selection when manually editing
                          }}
                          className="input input-sm input-bordered w-full"
                          min="0"
                        />
        </div>
      </div>

                    {/* Quick select buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        className={`btn btn-xs ${selectedPriceRange === 'under100' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleQuickPriceSelect('under100', '', '100')}
                      >
                        Under $100
                      </button>
                      <button
                        className={`btn btn-xs ${selectedPriceRange === '100-200' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleQuickPriceSelect('100-200', '100', '200')}
                      >
                        $100 - $200
                      </button>
                      <button
                        className={`btn btn-xs ${selectedPriceRange === '200-300' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleQuickPriceSelect('200-300', '200', '300')}
                      >
                        $200 - $300
                      </button>
                      <button
                        className={`btn btn-xs ${selectedPriceRange === '300+' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleQuickPriceSelect('300+', '300', '')}
                      >
                        $300+
                      </button>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        className="btn btn-sm btn-ghost flex-1"
                        onClick={handlePriceFilterReset}
                      >
                        Reset
                      </button>
                      <button
                        className="btn btn-sm btn-primary flex-1"
                        onClick={handlePriceFilterApply}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <select
              name="minRating"
              value={filters.minRating}
              onChange={handleInputChange}
              className="select select-sm select-bordered"
            >
              <option value="">Hotel rating</option>
              <option value="3">3+ stars</option>
              <option value="3.5">3.5+ stars</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>

            <select
              name="amenity"
              value={filters.amenity}
              onChange={handleInputChange}
              className="select select-sm select-bordered"
            >
              <option value="">Amenities</option>
              <option value="wifi">WiFi</option>
              <option value="pool">Pool</option>
              <option value="parking">Parking</option>
              <option value="breakfast">Breakfast</option>
            </select>

            {(filters.minPrice || filters.maxPrice || filters.minRating || filters.amenity) && (
              <button
                className="btn btn-sm btn-ghost text-error"
                onClick={() => {
                  const newFilters = {
                    ...filters,
                    minPrice: '',
                    maxPrice: '',
                    minRating: '',
                    amenity: ''
                  };
                  setFilters(newFilters);
                  setTempMinPrice('');
                  setTempMaxPrice('');
                  setSelectedPriceRange('');
                  loadHotels(1, newFilters);
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content: Split view */}
      <div className="flex">
        {/* Left side: Hotel listings */}
        <div className="w-1/2 overflow-y-auto px-4 py-4" style={{ height: 'calc(100vh - 150px)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">{pagination?.totalItems || 0} results</span>
              {isRefreshing && (
                <span className="loading loading-spinner loading-xs"></span>
              )}
              <span className="ml-2 text-sm">Sort by</span>
              <select
                value={`${filters.sortBy}_${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('_');
                  const newFilters = { ...filters, sortBy, sortOrder };
                  setFilters(newFilters);
                  loadHotels(1, newFilters);
                }}
                className="select select-sm select-bordered ml-2"
              >
                <option value="pricePerNight_asc">Price: Lowest to Highest</option>
                <option value="pricePerNight_desc">Price: Highest to Lowest</option>
                <option value="rating_desc">Rating</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <span className="loading loading-spinner loading-lg"></span>
              <p className="mt-2">Loading hotels...</p>
            </div>
          )}

          {!loading && results.length === 0 && !error && (
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto mb-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-base-content/70 mb-4">No hotels found. Try adjusting your filters.</p>
              <div className="text-sm text-base-content/60">
                <p className="font-semibold mb-2">Popular destinations:</p>
                {popularCities.length === 0 ? (
                  <p className="text-xs text-base-content/50">We are loading top cities for you...</p>
                ) : (
                  <div className="flex flex-wrap gap-2 justify-center max-w-2xl mx-auto">
                    {popularCities.slice(0, 18).map((cityOption) => (
                      <button
                        key={cityOption.id}
                        className="btn btn-xs btn-outline"
                        onClick={() => handleCitySelect(cityOption)}
                      >
                        {cityOption.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className={`space-y-4 transition-opacity duration-300 ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
              {results.map((hotel) => (
                <div key={hotel.id} className="card bg-base-100 border border-base-300 hover:shadow-lg transition-shadow">
                  <div className="flex gap-4 p-4">
                    {/* Hotel Image */}
                    <div className="w-48 h-32 flex-shrink-0 bg-base-300 rounded-lg overflow-hidden">
                      {hotel.imageUrl ? (
                        <img
                          src={hotel.imageUrl}
                          alt={hotel.name}
                          className="w-full h-full object-cover transition-opacity duration-300"
                          loading="lazy"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = document.createElement('div');
                            fallback.className = 'w-full h-full flex items-center justify-center text-base-content/40';
                            fallback.innerHTML = '<svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                            e.target.parentElement.appendChild(fallback);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-base-content/40">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Hotel Details */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-base-content">{hotel.name}</h3>
                          <p className="text-sm text-base-content/60">{hotel.city}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="badge badge-success text-white font-bold">{hotel.rating.toFixed(1)}</span>
                            <span className="text-sm text-base-content/60">Very good</span>
                            <div className="flex gap-0.5">
                              {[...Array(Math.floor(hotel.rating))].map((_, i) => (
                                <span key={i} className="text-warning"></span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-2">
                            {Array.isArray(hotel.amenities) && hotel.amenities.slice(0, 3).map((amenity, i) => (
                              <span key={i} className="text-xs text-base-content/60">{amenity}</span>
                            ))}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            {hotel.currency} {hotel.pricePerNight.toFixed(0)}
                          </div>
                          <button 
                            className="btn btn-primary btn-sm mt-2"
                            onClick={() => handleViewDeal(hotel)}
                          >
                            View Deal
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                className="btn btn-sm"
                onClick={() => goToPage(pagination.page - 1)}
                disabled={!pagination.hasPrevPage || loading}
              >
                « Prev
              </button>
              <button className="btn btn-sm btn-ghost">
                {pagination.page}
              </button>
              <button
                className="btn btn-sm"
                onClick={() => goToPage(pagination.page + 1)}
                disabled={!pagination.hasNextPage || loading}
              >
                Next »
              </button>
            </div>
          )}
        </div>

        {/* Right side: Map */}
        <div className="w-1/2 sticky top-32" style={{ height: 'calc(100vh - 150px)' }}>
          {results.length > 0 && results[0].lat && results[0].lng ? (
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              key={`${mapCenter[0]}-${mapCenter[1]}`}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {results.map((hotel) => (
                hotel.lat && hotel.lng && (
                  <Marker 
                    key={hotel.id} 
                    position={[hotel.lat, hotel.lng]}
                    icon={createPriceIcon(hotel.pricePerNight.toFixed(0))}
                  >
                    <Popup>
                      <div className="p-2" style={{ minWidth: '180px' }}>
                        <h3 className="font-bold text-sm">{hotel.name}</h3>
                        <p className="text-xs text-base-content/70">{hotel.city}</p>
                        <p className="text-sm font-semibold text-primary mt-1">
                          {hotel.currency} {hotel.pricePerNight.toFixed(0)}/night
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="badge badge-success badge-xs text-white">{hotel.rating.toFixed(1)}</span>
                        </div>
                        <button 
                          className="btn btn-primary btn-xs w-full mt-2"
                          onClick={() => handleViewDeal(hotel)}
                        >
                          View Deal
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center bg-base-200">
              <div className="text-center">
                <div className="text-6xl mb-4"></div>
                <p className="text-lg font-semibold">Map View</p>
                <p className="text-sm text-base-content/60">
                  {loading ? 'Loading map...' : 'No hotels to display on map'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All Filters Modal */}
      {showAllFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-base-100 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-base-100 border-b border-base-300 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">All filters</h2>
              <button 
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setShowAllFilters(false)}
              >
                
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar - Filter Categories */}
              <div className="w-64 border-r border-base-300 overflow-y-auto">
                <div className="py-2">
                  <button
                    className={`w-full text-left px-6 py-3 hover:bg-base-200 ${selectedFilterSection === 'location' ? 'border-l-4 border-primary bg-base-200' : ''}`}
                    onClick={() => setSelectedFilterSection('location')}
                  >
                    <span className="font-semibold">Location</span>
                  </button>
                  <button
                    className={`w-full text-left px-6 py-3 hover:bg-base-200 ${selectedFilterSection === 'price' ? 'border-l-4 border-primary bg-base-200' : ''}`}
                    onClick={() => setSelectedFilterSection('price')}
                  >
                    <span className="font-semibold">Price</span>
                  </button>
                  <button
                    className={`w-full text-left px-6 py-3 hover:bg-base-200 ${selectedFilterSection === 'freebies' ? 'border-l-4 border-primary bg-base-200' : ''}`}
                    onClick={() => setSelectedFilterSection('freebies')}
                  >
                    <span className="font-semibold">Freebies</span>
                  </button>
                  <button
                    className={`w-full text-left px-6 py-3 hover:bg-base-200 ${selectedFilterSection === 'amenities' ? 'border-l-4 border-primary bg-base-200' : ''}`}
                    onClick={() => setSelectedFilterSection('amenities')}
                  >
                    <span className="font-semibold">Amenities</span>
                  </button>
                  <button
                    className={`w-full text-left px-6 py-3 hover:bg-base-200 ${selectedFilterSection === 'hotelRating' ? 'border-l-4 border-primary bg-base-200' : ''}`}
                    onClick={() => setSelectedFilterSection('hotelRating')}
                  >
                    <span className="font-semibold">Hotel rating</span>
                  </button>
                </div>
              </div>

              {/* Right Content - Filter Options */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Location Section */}
                {selectedFilterSection === 'location' && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Location</h3>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium mb-2">State</label>
                      <select
                        className="select select-bordered w-full"
                        value={filters.state}
                        onChange={(e) => {
                          const newFilters = { ...filters, state: e.target.value };
                          setFilters(newFilters);
                          loadHotels(1, newFilters);
                        }}
                      >
                        <option value="">All states</option>
                        {US_STATES.map((state) => (
                          <option key={state.value} value={state.value}>
                            {state.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Price Section */}
                {selectedFilterSection === 'price' && (
                  <div>
                    <h3 className="text-xl font-bold mb-4">Price</h3>
                    
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">Nightly including fees</label>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="text-xs text-base-content/60 mb-1 block">Min Price</label>
                        <input
                          type="number"
                          placeholder="$0"
                          value={tempMinPrice}
                          onChange={(e) => {
                            setTempMinPrice(e.target.value);
                            setSelectedPriceRange('');
                          }}
                          className="input input-bordered w-full"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-base-content/60 mb-1 block">Max Price</label>
                        <input
                          type="number"
                          placeholder="Any"
                          value={tempMaxPrice}
                          onChange={(e) => {
                            setTempMaxPrice(e.target.value);
                            setSelectedPriceRange('');
                          }}
                          className="input input-bordered w-full"
                          min="0"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`btn btn-sm ${selectedPriceRange === 'under100' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleQuickPriceSelect('under100', '', '100')}
                      >
                        Under $100
                      </button>
                      <button
                        className={`btn btn-sm ${selectedPriceRange === '100-200' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleQuickPriceSelect('100-200', '100', '200')}
                      >
                        $100 - $200
                      </button>
                      <button
                        className={`btn btn-sm ${selectedPriceRange === '200-300' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleQuickPriceSelect('200-300', '200', '300')}
                      >
                        $200 - $300
                      </button>
                      <button
                        className={`btn btn-sm ${selectedPriceRange === '300+' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => handleQuickPriceSelect('300+', '300', '')}
                      >
                        $300+
                      </button>
                    </div>
                  </div>
                )}

                {/* Freebies Section */}
                {selectedFilterSection === 'freebies' && (
                  <div>
                    <h3 className="text-xl font-bold mb-6">Freebies</h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {['Free cancellation', 'Free internet', 'Free parking', 'Free breakfast', 'All-inclusive', 'Free airport shuttle'].map((freebie) => (
                        <button
                          key={freebie}
                          className={`btn ${freebies.includes(freebie) ? 'btn-primary' : 'btn-outline'} justify-start`}
                          onClick={() => toggleFreebie(freebie)}
                        >
                          {freebie}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities Section */}
                {selectedFilterSection === 'amenities' && (
                  <div>
                    <h3 className="text-xl font-bold mb-6">Amenities</h3>
                    
                    <div className="space-y-4">
                      <h4 className="font-semibold text-base-content/70">General</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {['wifi', 'pool', 'parking', 'gym', 'spa', 'restaurant'].map((amenity) => (
                          <label key={amenity} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="amenity"
                              value={amenity}
                              checked={filters.amenity === amenity}
                              onChange={(e) => {
                                const newFilters = { ...filters, amenity: e.target.value };
                                setFilters(newFilters);
                              }}
                              className="radio radio-primary"
                            />
                            <span className="capitalize">{amenity}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Hotel Rating Section */}
                {selectedFilterSection === 'hotelRating' && (
                  <div>
                    <h3 className="text-xl font-bold mb-6">Hotel rating</h3>
                    
                    <div className="space-y-3">
                      {[
                        { value: '3', label: '3+ stars' },
                        { value: '3.5', label: '3.5+ stars' },
                        { value: '4', label: '4+ stars' },
                        { value: '4.5', label: '4.5+ stars' },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="minRating"
                            value={option.value}
                            checked={filters.minRating === option.value}
                            onChange={(e) => {
                              const newFilters = { ...filters, minRating: e.target.value };
                              setFilters(newFilters);
                            }}
                            className="radio radio-primary"
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-base-300 px-6 py-4 flex justify-between items-center bg-base-100">
              <button
                className="btn btn-ghost"
                onClick={handleAllFiltersReset}
              >
                Reset
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAllFiltersApply}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hotel Details Modal */}
      {showHotelModal && selectedHotel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowHotelModal(false)}>
          <div className="bg-base-100 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-base-100 border-b border-base-300 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{selectedHotel.name}</h2>
              <button 
                className="btn btn-ghost btn-sm btn-circle"
                onClick={() => setShowHotelModal(false)}
              >
                
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Hotel Image */}
              <div className="w-full h-64 bg-base-200 rounded-lg mb-6 overflow-hidden flex items-center justify-center">
                {selectedHotel.imageUrl ? (
                  <img
                    src={selectedHotel.imageUrl}
                    alt={selectedHotel.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/800x600/4A5568/FFFFFF?text=Hotel+Image';
                    }}
                  />
                ) : (
                  <span className="text-8xl"></span>
                )}
              </div>

              {/* Hotel Info */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="font-semibold text-sm text-base-content/60 mb-2">Location</h3>
                  <p className="text-lg">{selectedHotel.city}</p>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-base-content/60 mb-2">Rating</h3>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-success text-white font-bold text-lg p-3">{selectedHotel.rating.toFixed(1)}</span>
                    <div className="flex gap-0.5">
                      {[...Array(Math.floor(selectedHotel.rating))].map((_, i) => (
                        <span key={i} className="text-warning text-xl"></span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="mb-6">
                <h3 className="font-semibold text-sm text-base-content/60 mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(selectedHotel.amenities) && selectedHotel.amenities.map((amenity, i) => (
                    <span key={i} className="badge badge-outline badge-lg">{amenity}</span>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-base-200 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-base-content/60 mb-1">Price per night</p>
                    <p className="text-4xl font-bold text-primary">
                      {selectedHotel.currency} {selectedHotel.pricePerNight.toFixed(0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-base-content/60 mb-1">Check-in: {searchData?.checkIn || 'N/A'}</p>
                    <p className="text-sm text-base-content/60">Check-out: {searchData?.checkOut || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Booking Providers (Kayak-style) */}
              <div className="mb-6">
                <h3 className="font-semibold text-lg mb-4">Available on</h3>
                <div className="space-y-3">
                  {['Booking.com', 'Expedia', 'Hotels.com', 'Agoda'].map((provider, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border border-base-300 rounded-lg hover:border-primary transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-base-200 rounded flex items-center justify-center font-bold text-sm">
                          {provider.charAt(0)}
                        </div>
                        <span className="font-semibold">{provider}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-bold text-primary">
                          {selectedHotel.currency} {(selectedHotel.pricePerNight + (idx * 5)).toFixed(0)}
                        </span>
                        <a 
                          href="#"
                          className="btn btn-primary btn-sm"
                          onClick={(e) => {
                            e.preventDefault();
                            alert(`In a real app, this would redirect to ${provider}`);
                          }}
                        >
                          Book Now
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center text-sm text-base-content/60 pt-4 border-t border-base-300">
                <p>Prices shown are per night and may vary by date</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HotelsPage;
