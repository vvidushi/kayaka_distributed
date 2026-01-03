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
  const initialSearchData = location.state?.search;
  const [searchData, setSearchData] = useState(initialSearchData);
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  
  // Sync searchData when location.state changes
  useEffect(() => {
    if (location.state?.search) {
      setSearchData(location.state.search);
    }
  }, [location.state?.search]);

  // Initialize filters with search data if available
  const initialFilters = {
    ...defaultFilters,
    location: initialSearchData?.location || '',
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
  const [expandedFilterSections, setExpandedFilterSections] = useState({
    location: true,
    vehicle: true,
    vendors: false,
    priceSort: false,
  });
  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false);
  const [isStickyCompact, setIsStickyCompact] = useState(false);
  
  // Date states - initialize from initialSearchData
  const [pickUpDate, setPickUpDate] = useState(initialSearchData?.pickUp || '');
  const [dropOffDate, setDropOffDate] = useState(initialSearchData?.dropOff || '');
  const [showPickUpCalendar, setShowPickUpCalendar] = useState(false);
  const [showDropOffCalendar, setShowDropOffCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [editingTime, setEditingTime] = useState(null); // 'pickup' or 'dropoff'

  const pickUpTime = searchData?.pickUpTime || '12:00';
  const dropOffTime = searchData?.dropOffTime || '12:00';

  // Detect scroll for compact sticky mode
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsStickyCompact(scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Sync date states when searchData changes
  useEffect(() => {
    if (searchData?.pickUp && searchData.pickUp !== pickUpDate) {
      setPickUpDate(searchData.pickUp);
    }
    if (searchData?.dropOff && searchData.dropOff !== dropOffDate) {
      setDropOffDate(searchData.dropOff);
    }
  }, [searchData?.pickUp, searchData?.dropOff]);

  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'firegram-1r.appspot.com';
  const placeholderImage = 'https://via.placeholder.com/400x300/4A5568/FFFFFF?text=Car+Image';

  const resolveCarImageUrl = (rawUrl) => {
    if (!rawUrl || rawUrl === 'null' || rawUrl === 'undefined') {
      return placeholderImage;
    }

    // If it's already a full URL, return it
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }

    // If it's a Firebase storage path, construct the URL
    let path = rawUrl;
    
    // Handle different path formats
    if (path.startsWith('kayak/product/cars/')) {
      // Already in correct format
    } else if (path.startsWith('kayak/cars/')) {
      // Convert old format to new format
      path = path.replace('kayak/cars/', 'kayak/product/cars/');
    } else if (!path.startsWith('kayak/')) {
      // Add kayak/product/cars/ prefix if not present
      path = `kayak/product/cars/${path}`;
    }

    const encodedPath = encodeURIComponent(path);
    return `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}?alt=media`;
  };
  
  // Helper to get car image from multiple possible fields
  const getCarImage = (car) => {
    // Check all possible image fields in priority order
    return car.imageStoragePath || 
           car.imageUrl || 
           car.images?.[0] || 
           car.image ||
           car.photo ||
           car.photoUrl ||
           null;
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
      
      // Debug: Log first car to see what image fields are available
      if (filteredResults.length > 0) {
        console.log('Sample car data:', {
          id: filteredResults[0].id,
          imageStoragePath: filteredResults[0].imageStoragePath,
          imageUrl: filteredResults[0].imageUrl,
          images: filteredResults[0].images,
          allKeys: Object.keys(filteredResults[0])
        });
      }
      
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

  // Sync local date states with searchData
  useEffect(() => {
    if (searchData?.pickUp && searchData.pickUp !== pickUpDate) {
      setPickUpDate(searchData.pickUp);
    }
    if (searchData?.dropOff && searchData.dropOff !== dropOffDate) {
      setDropOffDate(searchData.dropOff);
    }
  }, [searchData?.pickUp, searchData?.dropOff]);

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
    // Close mobile filter drawer after applying
    setShowFiltersDrawer(false);
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
    // If dropoff is before new pickup, adjust it
    let newDropOffDate = dropOffDate;
    if (dropOffDate && dropOffDate < dateStr) {
      const nextDay = new Date(parseLocalDate(dateStr));
      nextDay.setDate(nextDay.getDate() + 1);
      newDropOffDate = nextDay.toISOString().split('T')[0];
      setDropOffDate(newDropOffDate);
    }
    
    setPickUpDate(dateStr);
    setShowPickUpCalendar(false);
    
    // Update search data immediately
    const updatedSearchData = {
      ...searchData,
      pickUp: dateStr,
      dropOff: newDropOffDate || dropOffDate,
    };
    setSearchData(updatedSearchData);
    
    // Navigate with updated search data (for persistence and browser back button)
    navigate('/cars', { state: { search: updatedSearchData }, replace: true });
    
    // Trigger new search immediately with updated dates
    loadCars(1);
  };
  
  const handleDropOffDateSelect = (dateStr) => {
    setDropOffDate(dateStr);
    setShowDropOffCalendar(false);
    
    // Update search data immediately
    const updatedSearchData = {
      ...searchData,
      pickUp: pickUpDate,
      dropOff: dateStr,
    };
    setSearchData(updatedSearchData);
    
    // Navigate with updated search data (for persistence and browser back button)
    navigate('/cars', { state: { search: updatedSearchData }, replace: true });
    
    // Trigger new search immediately with updated dates
    loadCars(1);
  };

  const handleTimeSelect = (timeStr, timeType) => {
    setShowTimePicker(false);
    setEditingTime(null);
    
    // Update search data immediately
    const updatedSearchData = {
      ...searchData,
      [timeType === 'pickup' ? 'pickUpTime' : 'dropOffTime']: timeStr,
    };
    setSearchData(updatedSearchData);
    
    // Navigate with updated search data (for persistence and browser back button)
    navigate('/cars', { state: { search: updatedSearchData }, replace: true });
    
    // Trigger new search immediately with updated time
    loadCars(1);
  };

  // Quick filter chips handler
  const handleQuickFilter = (filterType, value) => {
    if (filterType === 'type') {
      const newFilters = {
        ...filters,
        type: filters.type === value ? 'any' : value
      };
      setFilters(newFilters);
      setActiveFilters(newFilters);
      loadCars(1, newFilters);
    } else if (filterType === 'clear') {
      const resetFilters = {
        ...defaultFilters,
        location: searchData?.location || '',
        state: '',
      };
      setFilters(resetFilters);
      setActiveFilters(resetFilters);
      loadCars(1, resetFilters);
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      {/* Search Summary Header - Sticky Pill-Style Card */}
      <div className={`sticky top-0 z-40 bg-base-100/95 backdrop-blur-sm transition-all duration-200 ${isStickyCompact ? 'py-2 shadow-lg' : 'py-3 shadow-sm'}`} id="trip-summary-header">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`bg-gradient-to-r from-slate-50 to-gray-50 dark:from-base-200 dark:to-base-300 rounded-2xl border border-base-300/50 transition-all duration-200 ${isStickyCompact ? 'px-3 py-2' : 'px-4 py-3'}`}>
            <div className={`flex flex-wrap items-center transition-all duration-200 ${isStickyCompact ? 'gap-3 lg:gap-4' : 'gap-4 lg:gap-6'}`}>
              {/* Location Section */}
              <button
                type="button"
                onClick={() => {
                  // Navigate to HomePage with current search data to edit location
                  navigate('/', { 
                    state: { 
                      search: {
                        ...searchData,
                        activeTab: 'cars', // Pre-select Cars tab
                      }
                    } 
                  });
                }}
                className={`group flex items-center gap-2 rounded-lg hover:bg-white/80 dark:hover:bg-base-100/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${isStickyCompact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
                title="Click to change location"
              >
                <FaMapMarkerAlt className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className={`uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium ${isStickyCompact ? 'text-[10px]' : 'text-xs'}`}>Location</span>
                  <span className={`font-semibold text-base-content ${isStickyCompact ? 'text-xs' : 'text-sm'}`}>{searchData?.location || 'Select Location'}</span>
            </div>
              </button>

              {/* Divider */}
              {(pickUpDate || searchData?.pickUpTime) && (
                <div className={`w-px bg-gray-300 dark:bg-base-content/20 ${isStickyCompact ? 'h-6' : 'h-8'}`}></div>
              )}

              {/* Dates Section */}
            {pickUpDate && dropOffDate && (
              <>
                <button
                  type="button"
                  onClick={() => setShowPickUpCalendar(true)}
                    className={`group flex items-center gap-2 rounded-lg hover:bg-white/80 dark:hover:bg-base-100/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${isStickyCompact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
                    title="Click to change dates"
                  >
                    <FaCalendarAlt className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span className={`uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium ${isStickyCompact ? 'text-[10px]' : 'text-xs'}`}>Dates</span>
                      <span className={`font-semibold text-base-content ${isStickyCompact ? 'text-xs' : 'text-sm'}`}>
                        {formatDate(pickUpDate)} - {formatDate(dropOffDate)}
                      </span>
                    </div>
                </button>

                  {/* Duration Badge - Highlight Chip (Clickable) */}
                  <button
                    type="button"
                    onClick={() => setShowPickUpCalendar(true)}
                    className={`rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${isStickyCompact ? 'px-2 py-1' : 'px-3 py-1.5'}`}
                    title="Click to change dates"
                  >
                    <div className="flex flex-col items-center">
                      <span className={`uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium ${isStickyCompact ? 'text-[10px]' : 'text-xs'}`}>Duration</span>
                      <span className={`font-bold ${isStickyCompact ? 'text-[10px]' : 'text-xs'}`}>{rentalDays} day{rentalDays > 1 ? 's' : ''}</span>
                    </div>
                  </button>
                </>
              )}

              {/* Divider */}
              {searchData?.pickUpTime && (pickUpDate || searchData?.location) && (
                <div className={`w-px bg-gray-300 dark:bg-base-content/20 ${isStickyCompact ? 'h-6' : 'h-8'}`}></div>
              )}

              {/* Times Section */}
              {searchData?.pickUpTime && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTime('pickup');
                    setShowTimePicker(true);
                  }}
                  className={`group flex items-center gap-2 rounded-lg hover:bg-white/80 dark:hover:bg-base-100/50 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${isStickyCompact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
                  title="Click to change times"
                >
                  <FaClock className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className={`uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium ${isStickyCompact ? 'text-[10px]' : 'text-xs'}`}>Times</span>
                    <span className={`font-semibold text-base-content ${isStickyCompact ? 'text-xs' : 'text-sm'}`}>
                      {searchData.pickUpTime}
                      {searchData?.dropOffTime && ` / ${searchData.dropOffTime}`}
                </span>
                </div>
                </button>
              )}

              {/* Change CTA - Right Side */}
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    // Scroll to search form
                    const searchForm = document.querySelector('form, [class*="search"]');
                    if (searchForm) {
                      searchForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      setTimeout(() => {
                        const firstInput = searchForm.querySelector('input, select');
                        if (firstInput) firstInput.focus();
                      }, 500);
                    }
                  }}
                  className={`text-primary hover:text-primary-focus font-medium hover:underline transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 rounded ${isStickyCompact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'}`}
                >
                  Change
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mobile Filter Overlay */}
        {showFiltersDrawer && (
          <div
            className="fixed inset-0 bg-black/50 z-40 xl:hidden"
            onClick={() => setShowFiltersDrawer(false)}
          ></div>
        )}
        
        <div className="flex flex-col xl:flex-row gap-6 relative">
          {/* Sidebar Filters - Responsive */}
          <aside className={`xl:w-64 flex-shrink-0 ${showFiltersDrawer ? 'fixed xl:relative left-0 top-0 h-full xl:h-auto z-50 xl:z-auto w-80 xl:w-64' : 'hidden xl:block'}`}>
            <div className="card bg-base-100 shadow-xl sticky top-4 h-[calc(100vh-2rem)] xl:h-auto overflow-y-auto">
              <div className="card-body p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold">Filters</h2>
                  <button
                    onClick={() => setShowFiltersDrawer(false)}
                    className="btn btn-sm btn-circle btn-ghost xl:hidden"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>

                {/* Location Section */}
                <div className="collapse collapse-arrow bg-base-200 mb-2">
                  <input
                    type="checkbox"
                    checked={expandedFilterSections.location}
                    onChange={(e) => setExpandedFilterSections(prev => ({ ...prev, location: e.target.checked }))}
                  />
                  <div className="collapse-title text-sm font-semibold px-3 py-2 min-h-0">
                    📍 Location
                  </div>
                  <div className="collapse-content px-3 pb-3">
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text text-xs">State</span>
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
                  </div>
                </div>

                {/* Vehicle Section */}
                <div className="collapse collapse-arrow bg-base-200 mb-2">
                  <input
                    type="checkbox"
                    checked={expandedFilterSections.vehicle}
                    onChange={(e) => setExpandedFilterSections(prev => ({ ...prev, vehicle: e.target.checked }))}
                  />
                  <div className="collapse-title text-sm font-semibold px-3 py-2 min-h-0">
                    Vehicle
                  </div>
                  <div className="collapse-content px-3 pb-3 space-y-3">
                    {/* Car Type Filter with Icons */}
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text text-xs">Car Type</span>
                  </label>
                  <select
                    name="type"
                    value={filters.type}
                    onChange={handleInputChange}
                    className="select select-sm select-bordered w-full"
                  >
                    <option value="any">All Types</option>
                    {availableCarTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                    ))}
                  </select>
                </div>

                {/* Seats Filter */}
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text text-xs">Minimum Seats</span>
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
                  </div>
                </div>

                {/* Vendors Section */}
                <div className="collapse collapse-arrow bg-base-200 mb-2">
                  <input
                    type="checkbox"
                    checked={expandedFilterSections.vendors}
                    onChange={(e) => setExpandedFilterSections(prev => ({ ...prev, vendors: e.target.checked }))}
                  />
                  <div className="collapse-title text-sm font-semibold px-3 py-2 min-h-0">
                    🏢 Vendors
                  </div>
                  <div className="collapse-content px-3 pb-3">
                    <div className="max-h-40 overflow-y-auto border border-base-300 rounded-lg p-2 bg-base-100">
                      <label className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-xs"
                        checked={filters.vendors.length === availableVendors.length}
                        onChange={handleAllVendorsToggle}
                      />
                        <span className="text-xs font-medium">All Vendors</span>
                    </label>
                    <div className="divider my-1"></div>
                    {availableVendors.map(vendor => (
                        <label key={vendor} className="flex items-center gap-2 p-1 hover:bg-base-200 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={filters.vendors.includes(vendor)}
                          onChange={() => handleVendorToggle(vendor)}
                        />
                          <span className="text-xs">{vendor}</span>
                      </label>
                    ))}
                    </div>
                  </div>
                </div>

                {/* Price & Sort Section */}
                <div className="collapse collapse-arrow bg-base-200 mb-2" style={{ overflow: 'visible' }}>
                  <input
                    type="checkbox"
                    checked={expandedFilterSections.priceSort}
                    onChange={(e) => setExpandedFilterSections(prev => ({ ...prev, priceSort: e.target.checked }))}
                  />
                  <div className="collapse-title text-sm font-semibold px-3 py-2 min-h-0">
                    💰 Price & Sort
                  </div>
                  <div className="collapse-content px-3 pb-3 space-y-3" style={{ overflow: 'visible' }}>
                {/* Price Range Filter */}
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text text-xs">Price Per Day</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="label py-0">
                            <span className="label-text-alt text-xs">Min</span>
                      </label>
                      <input
                        type="number"
                        name="minPrice"
                        value={filters.minPrice}
                        onChange={handleInputChange}
                            className="input input-xs input-bordered w-full"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="label py-0">
                            <span className="label-text-alt text-xs">Max</span>
                      </label>
                      <input
                        type="number"
                        name="maxPrice"
                        value={filters.maxPrice}
                        onChange={handleInputChange}
                            className="input input-xs input-bordered w-full"
                        placeholder="∞"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                    {/* Sort By Filter - Icon-based */}
                    <div className="form-control">
                      <label className="label py-1">
                        <span className="label-text text-xs">Sort By</span>
                  </label>
                      <div className="dropdown dropdown-top dropdown-end w-full">
                        <label tabIndex={0} className="btn btn-sm btn-outline w-full justify-between">
                          <span className="flex items-center gap-2">
                            {filters.sort === 'price-asc' && <>💰 Lowest Price</>}
                            {filters.sort === 'price-desc' && <>💸 Highest Price</>}
                            {filters.sort === 'seats-desc' && <>👥 Most Seats</>}
                            {filters.sort === 'vendor-asc' && <>🏢 Vendor A-Z</>}
                            {!['price-asc', 'price-desc', 'seats-desc', 'vendor-asc'].includes(filters.sort) && <>Sort Options</>}
                          </span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </label>
                        <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[9999] w-full p-2 shadow-lg border border-base-300 mb-2">
                          <li>
                            <a
                              onClick={() => {
                                setFilters(prev => ({ ...prev, sort: 'price-asc' }));
                                handleInputChange({ target: { name: 'sort', value: 'price-asc' } });
                                applyFilters();
                              }}
                              className={filters.sort === 'price-asc' ? 'active' : ''}
                            >
                              <span className="text-lg">💰</span>
                              <span>Lowest Price</span>
                              {filters.sort === 'price-asc' && <span className="text-primary">✓</span>}
                            </a>
                          </li>
                          <li>
                            <a
                              onClick={() => {
                                setFilters(prev => ({ ...prev, sort: 'price-desc' }));
                                handleInputChange({ target: { name: 'sort', value: 'price-desc' } });
                                applyFilters();
                              }}
                              className={filters.sort === 'price-desc' ? 'active' : ''}
                            >
                              <span className="text-lg">💸</span>
                              <span>Highest Price</span>
                              {filters.sort === 'price-desc' && <span className="text-primary">✓</span>}
                            </a>
                          </li>
                          <li>
                            <a
                              onClick={() => {
                                setFilters(prev => ({ ...prev, sort: 'seats-desc' }));
                                handleInputChange({ target: { name: 'sort', value: 'seats-desc' } });
                                applyFilters();
                              }}
                              className={filters.sort === 'seats-desc' ? 'active' : ''}
                            >
                              <span className="text-lg">👥</span>
                              <span>Most Seats</span>
                              {filters.sort === 'seats-desc' && <span className="text-primary">✓</span>}
                            </a>
                          </li>
                          <li>
                            <a
                              onClick={() => {
                                setFilters(prev => ({ ...prev, sort: 'vendor-asc' }));
                                handleInputChange({ target: { name: 'sort', value: 'vendor-asc' } });
                                applyFilters();
                              }}
                              className={filters.sort === 'vendor-asc' ? 'active' : ''}
                            >
                              <span className="text-lg">🏢</span>
                              <span>Vendor A-Z</span>
                              {filters.sort === 'vendor-asc' && <span className="text-primary">✓</span>}
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={applyFilters}
                    className="btn btn-primary btn-sm flex-1"
                    disabled={loading}
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleReset}
                    className="btn btn-ghost btn-sm flex-1"
                    disabled={loading}
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Results Area */}
          <main className="flex-1 min-w-0">
            {/* Results Header with Filter Toggle and Sort */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
                  className="btn btn-sm btn-ghost xl:hidden"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                </button>
                <h1 className="text-xl sm:text-2xl font-bold">
                {pagination ? `${pagination.totalItems} Car${pagination.totalItems !== 1 ? 's' : ''} Found` : 'Search Results'}
              </h1>
              </div>
              
              {/* Sort Dropdown - Always Visible */}
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="btn btn-sm btn-outline">
                  <span className="flex items-center gap-2">
                    {filters.sort === 'price-asc' && <>💰 Lowest Price</>}
                    {filters.sort === 'price-desc' && <>💸 Highest Price</>}
                    {filters.sort === 'seats-desc' && <>👥 Most Seats</>}
                    {filters.sort === 'vendor-asc' && <>🏢 Vendor A-Z</>}
                    {!['price-asc', 'price-desc', 'seats-desc', 'vendor-asc'].includes(filters.sort) && <>Sort By</>}
                  </span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </label>
                <ul tabIndex={0} className="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow-lg border border-base-300">
                  <li>
                    <a
                      onClick={() => {
                        setFilters(prev => ({ ...prev, sort: 'price-asc' }));
                        handleInputChange({ target: { name: 'sort', value: 'price-asc' } });
                        applyFilters();
                      }}
                      className={filters.sort === 'price-asc' ? 'active' : ''}
                    >
                      <span className="text-lg">💰</span>
                      <span>Lowest Price</span>
                      {filters.sort === 'price-asc' && <span className="text-primary">✓</span>}
                    </a>
                  </li>
                  <li>
                    <a
                      onClick={() => {
                        setFilters(prev => ({ ...prev, sort: 'price-desc' }));
                        handleInputChange({ target: { name: 'sort', value: 'price-desc' } });
                        applyFilters();
                      }}
                      className={filters.sort === 'price-desc' ? 'active' : ''}
                    >
                      <span className="text-lg">💸</span>
                      <span>Highest Price</span>
                      {filters.sort === 'price-desc' && <span className="text-primary">✓</span>}
                    </a>
                  </li>
                  <li>
                    <a
                      onClick={() => {
                        setFilters(prev => ({ ...prev, sort: 'seats-desc' }));
                        handleInputChange({ target: { name: 'sort', value: 'seats-desc' } });
                        applyFilters();
                      }}
                      className={filters.sort === 'seats-desc' ? 'active' : ''}
                    >
                      <span className="text-lg">👥</span>
                      <span>Most Seats</span>
                      {filters.sort === 'seats-desc' && <span className="text-primary">✓</span>}
                    </a>
                  </li>
                  <li>
                    <a
                      onClick={() => {
                        setFilters(prev => ({ ...prev, sort: 'vendor-asc' }));
                        handleInputChange({ target: { name: 'sort', value: 'vendor-asc' } });
                        applyFilters();
                      }}
                      className={filters.sort === 'vendor-asc' ? 'active' : ''}
                    >
                      <span className="text-lg">🏢</span>
                      <span>Vendor A-Z</span>
                      {filters.sort === 'vendor-asc' && <span className="text-primary">✓</span>}
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick Filter Chips */}
            {!loading && (
              <div className="mb-4 overflow-x-auto">
                <div className="flex gap-2 pb-2">
                  {availableCarTypes.slice(0, 5).map(type => (
                    <button
                      key={type}
                      onClick={() => handleQuickFilter('type', type)}
                      className={`btn btn-sm btn-outline flex-shrink-0 gap-1 transition-all ${filters.type === type ? 'btn-primary shadow-md' : 'hover:btn-primary'}`}
                    >
                      <span>{type}</span>
                    </button>
                  ))}
                  {filters.type !== 'any' && (
                    <button
                      onClick={() => handleQuickFilter('clear', null)}
                      className="btn btn-sm btn-ghost flex-shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="alert alert-error mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Loading State - Skeleton Loaders with Shimmer */}
            {loading && (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="card bg-base-100 shadow-xl border border-base-200">
                    <div className="card-body p-0">
                      <div className="flex flex-col md:flex-row">
                        {/* Image Skeleton with Shimmer */}
                        <div 
                          className="md:w-64 w-full h-48 md:h-auto bg-gradient-to-r from-base-300 via-base-200 to-base-300 rounded-t-lg md:rounded-t-none md:rounded-l-lg"
                          style={{
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 2s infinite'
                          }}
                        ></div>
                        {/* Content Skeleton */}
                        <div className="flex-1 p-6 space-y-4">
                          <div 
                            className="h-6 bg-gradient-to-r from-base-300 via-base-200 to-base-300 rounded w-3/4"
                            style={{
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 2s infinite'
                            }}
                          ></div>
                          <div 
                            className="h-4 bg-gradient-to-r from-base-300 via-base-200 to-base-300 rounded w-1/2"
                            style={{
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 2s infinite'
                            }}
                          ></div>
                          <div 
                            className="h-4 bg-gradient-to-r from-base-300 via-base-200 to-base-300 rounded w-2/3"
                            style={{
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 2s infinite'
                            }}
                          ></div>
                          <div className="flex gap-2">
                            {[1, 2, 3].map((j) => (
                              <div
                                key={j}
                                className="h-6 bg-gradient-to-r from-base-300 via-base-200 to-base-300 rounded w-20"
                                style={{
                                  backgroundSize: '200% 100%',
                                  animation: 'shimmer 2s infinite'
                                }}
                              ></div>
                            ))}
                          </div>
                          <div className="flex justify-between items-end mt-auto">
                            <div className="space-y-2">
                              <div 
                                className="h-5 bg-gradient-to-r from-base-300 via-base-200 to-base-300 rounded w-24"
                                style={{
                                  backgroundSize: '200% 100%',
                                  animation: 'shimmer 2s infinite'
                                }}
                              ></div>
                              <div 
                                className="h-8 bg-gradient-to-r from-base-300 via-base-200 to-base-300 rounded w-32"
                                style={{
                                  backgroundSize: '200% 100%',
                                  animation: 'shimmer 2s infinite'
                                }}
                              ></div>
                            </div>
                            <div 
                              className="h-10 bg-gradient-to-r from-base-300 via-base-200 to-base-300 rounded w-24"
                              style={{
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 2s infinite'
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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

            {/* Results Grid - Responsive */}
            {!loading && results.length > 0 && (
              <>
                <div className="grid grid-cols-1 gap-4 mb-6">
                  {results.map((car, index) => {
                    const totalPrice = car.pricePerDay * rentalDays;
                    
                    // Determine highlight tags based on car properties
                    const highlightTags = [];
                    if (car.pricePerDay < 50) highlightTags.push({ text: 'Best Value', color: 'badge-success' });
                    if (index < 3) highlightTags.push({ text: 'Popular Choice', color: 'badge-primary' });
                    if (car.seats >= 7) highlightTags.push({ text: 'Family Friendly', color: 'badge-info' });
                    if (car.type?.toLowerCase().includes('luxury') || car.type?.toLowerCase().includes('premium')) {
                      highlightTags.push({ text: 'Premium', color: 'badge-warning' });
                    }
                    
                    return (
                      <div key={car.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 border border-base-200 w-full">
                        <div className="card-body p-0">
                          <div className="flex flex-col md:flex-row">
                            {/* Car Image - Fixed size, responsive */}
                            <figure className="md:w-64 w-full h-48 md:h-auto overflow-hidden bg-base-200 relative flex-shrink-0 rounded-t-lg md:rounded-t-none md:rounded-l-lg">
                            {!imageLoaded[car.id] && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <FaCar className="w-12 h-12 text-base-300 animate-pulse" />
                              </div>
                            )}
                            <img
                                src={(() => {
                                  const imageSource = getCarImage(car);
                                  const resolvedUrl = resolveCarImageUrl(imageSource);
                                  if (!imageSource) {
                                    console.warn(`Car ${car.id} (${car.vendor} ${car.type}) has no image fields:`, {
                                      id: car.id,
                                      imageStoragePath: car.imageStoragePath,
                                      imageUrl: car.imageUrl,
                                      images: car.images,
                                      image: car.image,
                                      photo: car.photo,
                                      photoUrl: car.photoUrl,
                                      allKeys: Object.keys(car).filter(k => k.toLowerCase().includes('image') || k.toLowerCase().includes('photo'))
                                    });
                                  } else {
                                    console.log(`Car ${car.id} image source:`, imageSource, '→ resolved:', resolvedUrl);
                                  }
                                  return resolvedUrl;
                                })()}
                                alt={`${car.type} - ${car.vendor}`}
                                className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded[car.id] ? 'opacity-100' : 'opacity-0'}`}
                                onLoad={() => setImageLoaded(prev => ({ ...prev, [car.id]: true }))}
                                onError={(e) => {
                                  console.error(`Failed to load image for car ${car.id} (${car.vendor} ${car.type}):`, {
                                    attemptedUrl: e.target.src,
                                    imageSource: getCarImage(car),
                                    car: { 
                                      id: car.id,
                                      imageStoragePath: car.imageStoragePath, 
                                      imageUrl: car.imageUrl, 
                                      images: car.images, 
                                      image: car.image,
                                      photo: car.photo,
                                      photoUrl: car.photoUrl
                                    }
                                  });
                                  e.target.src = placeholderImage;
                                  setImageLoaded(prev => ({ ...prev, [car.id]: true }));
                                }}
                              />
                              {/* Highlight tags overlay on image */}
                              {highlightTags.length > 0 && (
                                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                  {highlightTags.slice(0, 2).map((tag, idx) => (
                                    <span key={idx} className={`badge badge-sm ${tag.color} shadow-lg`}>
                                      {tag.text}
                                    </span>
                                  ))}
                                </div>
                              )}
                          </figure>

                            {/* Car Details */}
                            <div className="flex-1 p-6 flex flex-col">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-2xl font-bold">{car.type}</h3>
                                    <span className="badge badge-sm badge-outline">
                                      {car.type}
                                    </span>
                                  </div>
                                  <p className="text-base-content/70 flex items-center gap-2 mb-2">
                                    <span className="font-semibold text-base-content">{car.vendor}</span>
                                  </p>
                                  <div className="flex items-center gap-2 text-base-content/60 text-sm">
                                    <FaMapMarkerAlt className="w-3 h-3" />
                                    <span>{car.location}</span>
                                </div>
                                </div>
                                <div className="badge badge-lg badge-outline gap-2 flex-shrink-0">
                                  <FaUsers className="w-4 h-4" />
                                  {car.seats} seats
                                </div>
                              </div>

                              {/* Amenities Row */}
                              <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-base-200">
                                <span className="badge badge-sm badge-ghost">✓ Automatic</span>
                                <span className="badge badge-sm badge-ghost">❄️ Air Conditioning</span>
                                <span className="badge badge-sm badge-ghost">🔄 Free Cancellation</span>
                                <span className="badge badge-sm badge-ghost">⛽ Unlimited Mileage</span>
                              </div>

                              {/* Pricing */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-auto">
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
                                  className="btn btn-primary btn-lg"
                                  onClick={async () => {
                                    // Track the click
                                    try {
                                      await listingsApi.trackClick({
                                        listingId: car.id || car._id,
                                        listingType: 'car',
                                        action: 'click',
                                        page: 'car-search',
                                        metadata: {
                                          carModel: car.model,
                                          vendor: car.vendor,
                                          city: car.city,
                                          price: car.pricePerDay
                                        }
                                      });
                                    } catch (error) {
                                      console.error('Failed to track click:', error);
                                    }

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

                                    // Navigate to car detail page
                                    const pickupDate = pickUpDate || searchData?.pickUp || new Date().toISOString().split('T')[0];
                                    const dropoffDate = dropOffDate || searchData?.dropOff || new Date(Date.now() + 86400000).toISOString().split('T')[0];

                                    navigate(`/cars/${car.id || car._id}`, {
                                      state: {
                                        searchData: {
                                          location: filters.location,
                                          pickupDate,
                                          dropoffDate,
                                          pickupTime: pickUpTime || searchData?.pickUpTime || '12:00',
                                          dropoffTime: dropOffTime || searchData?.dropOffTime || '12:00',
                                        }
                                      }
                                    });
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

      {/* Time Picker Modal */}
      {showTimePicker && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">
                Select {editingTime === 'pickup' ? 'Pickup' : 'Dropoff'} Time
              </h3>
              <button
                onClick={() => {
                  setShowTimePicker(false);
                  setEditingTime(null);
                }}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {editingTime === 'pickup' ? 'Pickup' : 'Dropoff'} Time
                  </span>
                </label>
                <input
                  type="time"
                  id="time-picker-input"
                  className="input input-bordered w-full"
                  defaultValue={editingTime === 'pickup' ? searchData?.pickUpTime : searchData?.dropOffTime}
                />
              </div>
              
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowTimePicker(false);
                    setEditingTime(null);
                  }}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const timeInput = document.getElementById('time-picker-input');
                    if (timeInput && timeInput.value) {
                      handleTimeSelect(timeInput.value, editingTime);
                    }
                  }}
                  className="btn btn-primary"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowTimePicker(false);
            setEditingTime(null);
          }}></div>
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
