import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { listingsApi } from '../../services/api/listings';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { FaCar, FaUsers, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaTimes } from 'react-icons/fa';
import { US_STATES } from '../../constants/usStates';

const defaultFilters = {
  location: '',
  state: '',
  type: 'any',
  seats: 'any',
  vendors: [],
  minPrice: '',
  maxPrice: '',
  sort: 'price-asc', // Combined sort option
};

// Helper function to parse date in local timezone
const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const CarsPage = () => {
  useDocumentTitle('Search Cars');
  
  const location = useLocation();
  const navigate = useNavigate();
  const searchData = location.state?.search;
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  // Initialize filters with search data if available
  const initialFilters = {
    ...defaultFilters,
    location: searchData?.location || '',
  };

  const [filters, setFilters] = useState(initialFilters);
  const [activeFilters, setActiveFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [results, setResults] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableCarTypes, setAvailableCarTypes] = useState([]);
  const [availableVendors, setAvailableVendors] = useState([]);
  const [imageLoaded, setImageLoaded] = useState({});
  
  // Date states
  const [pickUpDate, setPickUpDate] = useState(searchData?.pickUp || '');
  const [dropOffDate, setDropOffDate] = useState(searchData?.dropOff || '');
  const pickUpTime = searchData?.pickUpTime || '12:00';
  const dropOffTime = searchData?.dropOffTime || '12:00';
  const [showPickUpCalendar, setShowPickUpCalendar] = useState(false);
  const [showDropOffCalendar, setShowDropOffCalendar] = useState(false);

  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'firegram-1r.appspot.com';
  const placeholderImage = 'https://via.placeholder.com/400x300/4A5568/FFFFFF?text=Car+Image';

  const resolveCarImageUrl = (rawUrl) => {
    if (!rawUrl) return placeholderImage;

    // If it's a full URL, still rewrite the path segment if needed
    if (rawUrl.startsWith('http')) {
      return rawUrl.replace('/kayak/cars/', '/kayak/product/cars/');
    }

    let path = rawUrl;
    if (path.startsWith('kayak/cars/')) {
      path = path.replace('kayak/cars/', 'kayak/product/cars/');
    } else if (path.startsWith('kayak/product/cars/')) {
      // already correct
    } else if (path.startsWith('kayak/')) {
      // keep other kayak paths as-is
    } else {
      path = `kayak/product/cars/${path}`;
    }

    const encodedPath = encodeURIComponent(path);
    return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}?alt=media`;
  };

  // Calculate rental duration in days
  const calculateDuration = () => {
    if (!pickUpDate || !dropOffDate) return 1;
    
    const pickUp = new Date(`${pickUpDate}T${searchData?.pickUpTime || '12:00'}:00`);
    const dropOff = new Date(`${dropOffDate}T${searchData?.dropOffTime || '12:00'}:00`);
    
    const diffMs = dropOff - pickUp;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 1;
  };

  const rentalDays = calculateDuration();

  const loadCars = async (currentPage = 1, filtersToApply = activeFilters) => {
    setLoading(true);
    setError(null);

    try {
      // Parse combined sort option
      const [sortBy, sortOrder] = (filtersToApply.sort || 'price-asc').split('-');

      const params = {
        page: currentPage,
        pageSize,
        sortBy: sortBy === 'price' ? 'pricePerDay' : sortBy,
        sortOrder: sortOrder || 'asc',
      };

      if (filtersToApply.location) params.location = filtersToApply.location;
      if (filtersToApply.state) params.state = filtersToApply.state;
      if (filtersToApply.type && filtersToApply.type !== 'any') params.type = filtersToApply.type;
      if (filtersToApply.minPrice) params.minPrice = filtersToApply.minPrice;
      if (filtersToApply.maxPrice) params.maxPrice = filtersToApply.maxPrice;
      if (filtersToApply.vendors && filtersToApply.vendors.length > 0) {
        params.vendor = filtersToApply.vendors.join(',');
      }
      
      // Add pickup/dropoff dates and times for availability filtering
      if (pickUpDate) params.pickupDate = pickUpDate;
      if (dropOffDate) params.dropoffDate = dropOffDate;
      if (searchData?.pickUpTime) params.pickupTime = searchData.pickUpTime;
      if (searchData?.dropOffTime) params.dropoffTime = searchData.dropOffTime;

      console.log('Loading cars with params:', params);

      const data = await listingsApi.searchCars(params);
      
      let filteredResults = data.items || [];
      
      // Apply seats filter on client side
      if (filtersToApply.seats && filtersToApply.seats !== 'any') {
        const seatsNum = parseInt(filtersToApply.seats);
        filteredResults = filteredResults.filter(car => car.seats >= seatsNum);
      }

      setResults(filteredResults);
      setPagination(data.pagination || null);
      setPage(currentPage);
    } catch (err) {
      console.error('Failed to load cars', err);
      setError(err.response?.data?.message || 'Failed to load cars');
    } finally {
      setLoading(false);
    }
  };

  // Load available car types and vendors
  const loadFiltersData = async () => {
    try {
      // Get all cars to extract unique types and vendors
      const data = await listingsApi.searchCars({ pageSize: 1000 });
      const cars = data.items || [];

      const types = [...new Set(cars.map(car => car.type))].sort();
      const vendors = [...new Set(cars.map(car => car.vendor))].sort();

      setAvailableCarTypes(types);
      setAvailableVendors(vendors);
    } catch (err) {
      console.error('Failed to load filter options', err);
    }
  };

  useEffect(() => {
    // Load cars even if no search data - show all cars by default
    loadCars(1);
    loadFiltersData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const newFilters = { ...filters, [name]: value };
    setFilters(newFilters);
    // Auto-apply state filter immediately
    if (name === 'state') {
      setActiveFilters(newFilters);
      loadCars(1, newFilters);
    }
  };

  const handleVendorToggle = (vendor) => {
    setFilters(prev => {
      const vendors = prev.vendors.includes(vendor)
        ? prev.vendors.filter(v => v !== vendor)
        : [...prev.vendors, vendor];
      return { ...prev, vendors };
    });
  };

  const handleAllVendorsToggle = () => {
    setFilters(prev => ({
      ...prev,
      vendors: prev.vendors.length === availableVendors.length ? [] : [...availableVendors]
    }));
  };

  const applyFilters = () => {
    setActiveFilters(filters);
    loadCars(1, filters);
  };

  const handleReset = () => {
    const resetFilters = {
      ...defaultFilters,
      location: searchData?.location || '',
      state: '',
    };
    setFilters(resetFilters);
    setActiveFilters(resetFilters);
    loadCars(1, resetFilters);
  };

  const goToPage = (newPage) => {
    if (!pagination) return;
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadCars(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = parseLocalDate(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const handlePickUpDateSelect = (dateStr) => {
    setPickUpDate(dateStr);
    setShowPickUpCalendar(false);
    
    // If dropoff is before new pickup, adjust it
    if (dropOffDate && dropOffDate < dateStr) {
      const nextDay = new Date(parseLocalDate(dateStr));
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      setDropOffDate(nextDayStr);
    }
  };
  
  const handleDropOffDateSelect = (dateStr) => {
    setDropOffDate(dateStr);
    setShowDropOffCalendar(false);
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* Search Summary Header */}
      <div className="bg-base-100/90 backdrop-blur-sm text-base-content py-4 shadow-sm border-b border-base-300">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="w-4 h-4" />
              <span className="font-medium">{searchData?.location || 'Select Location'}</span>
            </div>
            {pickUpDate && dropOffDate && (
              <>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setShowPickUpCalendar(true)}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-base-300 hover:bg-base-content/10 rounded-md transition-colors cursor-pointer"
                  title="Click to change pickup date"
                >
                  <FaCalendarAlt className="w-3 h-3" />
                  <span>{formatDate(pickUpDate)}</span>
                </button>
                <span>-</span>
                <button
                  type="button"
                  onClick={() => setShowDropOffCalendar(true)}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-base-300 hover:bg-base-content/10 rounded-md transition-colors cursor-pointer"
                  title="Click to change dropoff date"
                >
                  <FaCalendarAlt className="w-3 h-3" />
                  <span>{formatDate(dropOffDate)}</span>
                </button>
                <span className="badge badge-sm bg-base-300 border-none">
                  {rentalDays} day{rentalDays > 1 ? 's' : ''}
                </span>
              </>
            )}
            {searchData?.pickUpTime && (
              <>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <FaClock className="w-4 h-4" />
                  <span>Pickup: {searchData.pickUpTime}</span>
                  {searchData?.dropOffTime && (
                    <span>| Dropoff: {searchData.dropOffTime}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="card bg-base-100 shadow-xl sticky top-4">
              <div className="card-body p-4">
                <h2 className="text-lg font-bold mb-4">Filters</h2>

                {/* State Filter */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">State</span>
                  </label>
                  <select
                    name="state"
                    value={filters.state}
                    onChange={handleInputChange}
                    className="select select-sm select-bordered w-full"
                  >
                    <option value="">All States</option>
                    {US_STATES.map(state => (
                      <option key={state.value} value={state.value}>{state.label}</option>
                    ))}
                  </select>
                </div>

                {/* Car Type Filter */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Car Type</span>
                  </label>
                  <select
                    name="type"
                    value={filters.type}
                    onChange={handleInputChange}
                    className="select select-sm select-bordered w-full"
                  >
                    <option value="any">All Types</option>
                    {availableCarTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Seats Filter */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Minimum Seats</span>
                  </label>
                  <select
                    name="seats"
                    value={filters.seats}
                    onChange={handleInputChange}
                    className="select select-sm select-bordered w-full"
                  >
                    <option value="any">Any</option>
                    <option value="2">2+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                    <option value="7">7+</option>
                  </select>
                </div>

                {/* Vendor Filter */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Vendor</span>
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-base-300 rounded-lg p-2 bg-base-200">
                    <label className="flex items-center gap-2 p-1 hover:bg-base-300 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={filters.vendors.length === availableVendors.length}
                        onChange={handleAllVendorsToggle}
                      />
                      <span className="text-sm font-medium">All Vendors</span>
                    </label>
                    <div className="divider my-1"></div>
                    {availableVendors.map(vendor => (
                      <label key={vendor} className="flex items-center gap-2 p-1 hover:bg-base-300 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={filters.vendors.includes(vendor)}
                          onChange={() => handleVendorToggle(vendor)}
                        />
                        <span className="text-sm">{vendor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Price Per Day</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="label py-0">
                        <span className="label-text-alt">Min</span>
                      </label>
                      <input
                        type="number"
                        name="minPrice"
                        value={filters.minPrice}
                        onChange={handleInputChange}
                        className="input input-sm input-bordered w-full"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="label py-0">
                        <span className="label-text-alt">Max</span>
                      </label>
                      <input
                        type="number"
                        name="maxPrice"
                        value={filters.maxPrice}
                        onChange={handleInputChange}
                        className="input input-sm input-bordered w-full"
                        placeholder="∞"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Sort By Filter */}
                <div className="form-control mb-4">
                  <label className="label">
                    <span className="label-text font-medium">Sort By</span>
                  </label>
                  <select
                    name="sort"
                    value={filters.sort}
                    onChange={handleInputChange}
                    className="select select-sm select-bordered w-full"
                  >
                    <option value="price-asc">Lowest to Highest Price</option>
                    <option value="price-desc">Highest to Lowest Price</option>
                    <option value="seats-desc">Most Seats</option>
                    <option value="vendor-asc">Vendor A-Z</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={applyFilters}
                    className="btn btn-primary btn-sm flex-1"
                    disabled={loading}
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleReset}
                    className="btn btn-ghost btn-sm"
                    disabled={loading}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Results Area */}
          <main className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">
                {pagination ? `${pagination.totalItems} Car${pagination.totalItems !== 1 ? 's' : ''} Found` : 'Search Results'}
              </h1>
            </div>

            {/* Error Message */}
            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-20">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            )}

            {/* No Results */}
            {!loading && results.length === 0 && !error && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body text-center py-20">
                  <FaCar className="w-16 h-16 mx-auto text-base-300 mb-4" />
                  <h3 className="text-xl font-bold mb-2">No cars found</h3>
                  <p className="text-base-content/60 mb-4">
                    Try adjusting your filters or search criteria
                  </p>
                  <button onClick={handleReset} className="btn btn-primary btn-sm mx-auto">
                    Reset Filters
                  </button>
                </div>
              </div>
            )}

            {/* Results Grid */}
            {!loading && results.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {results.map((car) => {
                    const totalPrice = car.pricePerDay * rentalDays;
                    
                    return (
                      <div key={car.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
                        <div className="card-body p-0">
                          <div className="flex flex-col md:flex-row">
                            {/* Car Image */}
                          <figure className="md:w-64 h-48 md:h-auto overflow-hidden bg-base-200 relative">
                            {!imageLoaded[car.id] && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <FaCar className="w-12 h-12 text-base-300 animate-pulse" />
                              </div>
                            )}
                            <img
                                src={resolveCarImageUrl(car.imageUrl)}
                                alt={`${car.type} - ${car.vendor}`}
                                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded[car.id] ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(prev => ({ ...prev, [car.id]: true }))}
                                onError={(e) => {
                                  e.target.src = placeholderImage;
                                  setImageLoaded(prev => ({ ...prev, [car.id]: true }));
                                }}
                              />
                          </figure>

                            {/* Car Details */}
                            <div className="flex-1 p-6">
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h3 className="text-2xl font-bold mb-1">{car.type}</h3>
                                  <p className="text-base-content/60 flex items-center gap-2">
                                    <span className="font-medium">{car.vendor}</span>
                                  </p>
                                </div>
                                <div className="badge badge-lg badge-outline gap-2">
                                  <FaUsers className="w-4 h-4" />
                                  {car.seats} seats
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-base-content/70 mb-4">
                                <FaMapMarkerAlt className="w-4 h-4" />
                                <span>{car.location}</span>
                              </div>

                              <div className="divider my-2"></div>

                              {/* Pricing */}
                              <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                                  <div>
                                    <p className="text-xs text-base-content/60">Per day</p>
                                    <p className="text-xl font-bold text-primary">
                                      {car.currency} ${car.pricePerDay.toFixed(0)}
                                    </p>
                                  </div>
                                  <div className="divider divider-horizontal hidden sm:flex mx-0"></div>
                                  <div>
                                    <p className="text-xs text-base-content/60">Total ({rentalDays} day{rentalDays > 1 ? 's' : ''})</p>
                                    <p className="text-2xl font-bold text-success">
                                      {car.currency} ${totalPrice.toFixed(0)}
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  className="btn btn-primary"
                                  onClick={() => {
                                    // Check if user is authenticated
                                    if (!isAuthenticated) {
                                      toast.showError('Please log in to continue with booking');
                                      // Save booking data to sessionStorage to restore after login
                                      const pickupDate = pickUpDate || searchData?.pickUp || new Date().toISOString().split('T')[0];
                                      const dropoffDate = dropOffDate || searchData?.dropOff || new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                      const pickupDateObj = new Date(pickupDate);
                                      const dropoffDateObj = new Date(dropoffDate);
                                      const days = Math.ceil((dropoffDateObj - pickupDateObj) / (1000 * 60 * 60 * 24)) || 1;

                                      const bookingData = {
                                        type: 'car',
                                        car,
                                        pickupDate,
                                        pickupTime: pickUpTime || searchData?.pickUpTime || '12:00',
                                        dropoffDate,
                                        dropoffTime: dropOffTime || searchData?.dropOffTime || '12:00',
                                        days,
                                      };
                                      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
                                      sessionStorage.setItem('returnPath', '/bookings');
                                      navigate('/login');
                                      return;
                                    }

                                    // Calculate days between pickup and dropoff
                                    const pickupDate = pickUpDate || searchData?.pickUp || new Date().toISOString().split('T')[0];
                                    const dropoffDate = dropOffDate || searchData?.dropOff || new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                    const pickupDateObj = new Date(pickupDate);
                                    const dropoffDateObj = new Date(dropoffDate);
                                    const days = Math.ceil((dropoffDateObj - pickupDateObj) / (1000 * 60 * 60 * 24)) || 1;

                                    const bookingData = {
                                      type: 'car',
                                      car,
                                      pickupDate,
                                      pickupTime: pickUpTime || searchData?.pickUpTime || '12:00',
                                      dropoffDate,
                                      dropoffTime: dropOffTime || searchData?.dropOffTime || '12:00',
                                      days,
                                    };

                                    navigate('/bookings', { state: { bookingData } });
                                  }}
                                >
                                  View Deal
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8 p-4 bg-base-100 rounded-lg shadow">
                    <div className="text-sm text-base-content/60">
                      Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems} result(s)
                    </div>
                    <div className="join">
                      <button
                        className="join-item btn btn-sm"
                        onClick={() => goToPage(pagination.page - 1)}
                        disabled={!pagination.hasPrevPage || loading}
                      >
                        « Prev
                      </button>
                      <button className="join-item btn btn-sm btn-active">
                        {pagination.page}
                      </button>
                      <button
                        className="join-item btn btn-sm"
                        onClick={() => goToPage(pagination.page + 1)}
                        disabled={!pagination.hasNextPage || loading}
                      >
                        Next »
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Pickup Date Calendar Modal */}
      {showPickUpCalendar && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Select Pickup Date</h3>
              <button
                onClick={() => setShowPickUpCalendar(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <FaTimes />
              </button>
            </div>

            <DateCalendar
              selectedDate={pickUpDate}
              onDateSelect={handlePickUpDateSelect}
              minDate={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="modal-backdrop" onClick={() => setShowPickUpCalendar(false)}></div>
        </div>
      )}

      {/* Dropoff Date Calendar Modal */}
      {showDropOffCalendar && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Select Dropoff Date</h3>
              <button
                onClick={() => setShowDropOffCalendar(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <FaTimes />
              </button>
            </div>

            <DateCalendar
              selectedDate={dropOffDate}
              onDateSelect={handleDropOffDateSelect}
              minDate={pickUpDate || new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="modal-backdrop" onClick={() => setShowDropOffCalendar(false)}></div>
        </div>
      )}
    </div>
  );
};

// Simple Date Calendar Component
const DateCalendar = ({ selectedDate, onDateSelect, minDate }) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedDate) {
      const date = parseLocalDate(selectedDate);
      return { year: date.getFullYear(), month: date.getMonth() };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const generateCalendarDays = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month === 0 ? 11 : prev.month - 1;
      const newYear = prev.month === 0 ? prev.year - 1 : prev.year;
      return { year: newYear, month: newMonth };
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const newMonth = prev.month === 11 ? 0 : prev.month + 1;
      const newYear = prev.month === 11 ? prev.year + 1 : prev.year;
      return { year: newYear, month: newMonth };
    });
  };

  const isDateDisabled = (day) => {
    if (!day || !minDate) return false;
    const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr < minDate;
  };

  const isDateSelected = (day) => {
    if (!day || !selectedDate) return false;
    const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === selectedDate;
  };

  const handleDateClick = (day) => {
    if (!day || isDateDisabled(day)) return;
    const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onDateSelect(dateStr);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const days = generateCalendarDays(currentMonth.year, currentMonth.month);

  return (
    <div className="w-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="btn btn-sm btn-ghost">
          ‹
        </button>
        <span className="font-semibold">
          {monthNames[currentMonth.month]} {currentMonth.year}
        </span>
        <button onClick={handleNextMonth} className="btn btn-sm btn-ghost">
          ›
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-base-content/60 p-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => (
          <div key={index} className="aspect-square">
            {day ? (
              <button
                onClick={() => handleDateClick(day)}
                disabled={isDateDisabled(day)}
                className={`
                  w-full h-full rounded-lg text-sm transition-colors
                  ${isDateSelected(day)
                    ? 'bg-primary text-primary-content font-bold'
                    : isDateDisabled(day)
                    ? 'text-base-content/30 cursor-not-allowed'
                    : 'hover:bg-base-300 cursor-pointer'
                  }
                `}
              >
                {day}
              </button>
            ) : (
              <div className="w-full h-full"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CarsPage;
