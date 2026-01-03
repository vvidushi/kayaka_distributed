import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { analyticsApi } from '../../services/api/analytics';
import { listingsApi } from '../../services/api/listings';
import { ownerApi } from '../../services/api/owner';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../hooks/useAuth';
import { getHomePageFlightImages, getHomePageStayImages, getHomePageCarImages } from '../../services/backgroundImages.service';
import { FaEyeSlash, FaChartBar, FaUsers, FaTrophy, FaHeart, FaHotel, FaEye, FaStar, FaDollarSign, FaCar, FaMapMarkerAlt } from 'react-icons/fa';

const AnalyticsPage = () => {
  useDocumentTitle('Analytics Dashboard');
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.profileType === 'owner';
  
  // Get background images
  const flightImages = getHomePageFlightImages();
  const stayImages = getHomePageStayImages();
  const carImages = getHomePageCarImages();
  
  // Store property details (name, location, etc.)
  const [propertyDetails, setPropertyDetails] = useState({});
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow to include today's data
    listingType: '',
    page: '',
    action: 'click',
    limit: 20,
  });

  // Analytics queries
  const { data: clicksPerPage, isLoading: loadingClicks } = useQuery({
    queryKey: ['analytics', 'clicks-per-page', filters],
    queryFn: () => analyticsApi.getClicksPerPage({
      startDate: filters.startDate,
      endDate: filters.endDate,
      action: filters.action,
    }),
    enabled: true,
  });

  const { data: propertyClicks, isLoading: loadingProperties } = useQuery({
    queryKey: ['analytics', 'property-clicks', filters],
    queryFn: () => analyticsApi.getPropertyClicks({
      startDate: filters.startDate,
      endDate: filters.endDate,
      listingType: filters.listingType || undefined,
      limit: filters.limit,
    }),
    enabled: true,
  });

  // For owners, get the actual count of their properties (not just clicked ones)
  const { data: ownerHotels } = useQuery({
    queryKey: ['owner-hotels'],
    queryFn: () => ownerApi.getHotels(),
    enabled: isOwner,
  });

  const { data: ownerCars } = useQuery({
    queryKey: ['owner-cars'],
    queryFn: () => ownerApi.getCars(),
    enabled: isOwner,
  });

  // Only count ACTIVE properties (exclude unlisted)
  const activeHotelsCount = ownerHotels?.items?.filter(h => h.status !== 'unlisted').length || 0;
  const activeCarsCount = ownerCars?.items?.filter(c => c.status !== 'unlisted').length || 0;
  const totalOwnerProperties = activeHotelsCount + activeCarsCount;
  const { data: leastSeen, isLoading: loadingSections } = useQuery({
    queryKey: ['analytics', 'least-seen', filters],
    queryFn: () => analyticsApi.getLeastSeenSections({
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page || undefined,
    }),
    enabled: !isOwner,
  });

  const { data: propertyReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['analytics', 'property-reviews', filters],
    queryFn: () => analyticsApi.getPropertyReviews({
      listingType: filters.listingType || undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: filters.limit,
    }),
    enabled: true,
  });

  const { data: cohorts, isLoading: loadingCohorts } = useQuery({
    queryKey: ['analytics', 'cohorts', filters],
    queryFn: () => analyticsApi.getCohortAnalysis({
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    enabled: !isOwner,
  });

  const [traceFilters, setTraceFilters] = useState({ userId: '', cohort: '' });
  const { data: userTraces, isLoading: loadingTraces } = useQuery({
    queryKey: ['analytics', 'traces', traceFilters],
    queryFn: () => analyticsApi.getUserTrace({
      userId: traceFilters.userId || undefined,
      cohort: traceFilters.cohort || undefined,
      limit: 10,
    }),
    enabled: !!(traceFilters.userId || traceFilters.cohort) && !isOwner,
  });

  const { data: bidding, isLoading: loadingBidding } = useQuery({
    queryKey: ['analytics', 'bidding', filters],
    queryFn: () => analyticsApi.getBiddingTracking({
      listingType: filters.listingType || undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    enabled: true,
  });

  // Fetch property details when propertyClicks data changes
  useEffect(() => {
    const fetchPropertyDetails = async () => {
      if (!propertyClicks?.items) return;
      
      const details = {};
      const topProperties = propertyClicks.items.slice(0, 10); // Fetch top 10
      
      for (const property of topProperties) {
        try {
          const id = property.listingId;
          if (id.startsWith('HT')) {
            const response = await listingsApi.getHotel(id);
            // API returns hotel directly (not wrapped in {data: ...})
            if (response && response.name) {
              details[id] = {
                name: response.name,
                city: response.city,
                type: 'hotel',
              };
            }
          } else if (id.startsWith('CR')) {
            const response = await listingsApi.getCar(id);
            // API returns car directly (not wrapped in {data: ...})
            if (response && response.vendor) {
              details[id] = {
                name: `${response.vendor} ${response.type}`,
                city: response.city || response.location,
                type: 'car',
              };
            }
          }
        } catch (error) {
          console.error(`Failed to fetch details for ${property.listingId}:`, error);
        }
      }
      
      setPropertyDetails(details);
    };
    
    fetchPropertyDetails();
  }, [propertyClicks]);
  const renderBarChart = (title, data, getLabel, getValue, isLoading, icon) => {
    if (isLoading) {
      return (
        <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              {icon && <div className="text-2xl text-primary">{icon}</div>}
              <h3 className="card-title text-lg">{title}</h3>
            </div>
            <div className="flex justify-center items-center py-8">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          </div>
        </div>
      );
    }

    if (!data?.items?.length) {
      return (
        <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-4">
              {icon && <div className="text-2xl text-primary">{icon}</div>}
              <h3 className="card-title text-lg">{title}</h3>
            </div>
            <div className="text-center py-8">
              <div className="text-4xl mb-2 opacity-30">📊</div>
              <p className="text-sm text-base-content/70">No data available</p>
            </div>
          </div>
        </div>
      );
    }

    const maxValue = Math.max(...data.items.map(getValue));
    
    return (
      <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
        <div className="card-body">
          <div className="flex items-center gap-3 mb-4">
            {icon && <div className="text-2xl text-primary">{icon}</div>}
            <h3 className="card-title text-lg">{title}</h3>
          </div>
          <div className="space-y-3">
            {data.items.map((item, idx) => {
              const value = getValue(item);
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              const getBarColor = (index) => {
                if (index === 0) return 'bg-gradient-to-r from-primary to-secondary';
                if (index === 1) return 'bg-gradient-to-r from-secondary to-accent';
                if (index === 2) return 'bg-gradient-to-r from-accent to-primary';
                return 'bg-primary';
              };
              
              return (
                <div 
                  key={idx} 
                  className="space-y-2 p-3 rounded-lg bg-base-200/30 hover:bg-base-200/60 transition-all duration-200 hover:scale-[1.01]"
                >
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      {idx < 3 && <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>}
                      <span className="font-semibold">{getLabel(item)}</span>
                    </div>
                    <span className="badge badge-primary badge-lg">{value.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-base-300 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      className={`${getBarColor(idx)} h-3 rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="hero min-h-screen bg-base-100 relative overflow-hidden">
      {/* Background images */}
      <div className="absolute inset-0 z-0">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3 h-full p-2 lg:p-4 opacity-20">
          <div className="h-full rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg">
            <img src={flightImages.flight1} alt="Analytics BG 1" className="w-full h-full object-cover" />
          </div>
          <div className="h-full rounded-2xl lg:rounded-3xl overflow-hidden shadow-lg">
            <img src={stayImages.stays1} alt="Analytics BG 2" className="w-full h-full object-cover" />
          </div>
          <div className="hidden lg:block h-full rounded-3xl overflow-hidden shadow-lg">
            <img src={carImages.cars1} alt="Analytics BG 3" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-6 bg-base-100/98 backdrop-blur-md p-6 rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold mb-2">
            {isOwner ? 'Property Owner Analytics' : 'Platform Analytics Dashboard'}
          </h1>
          <p className="text-base-content/70">
            {isOwner ? 'Track your property performance and guest reviews' : 'Platform-wide analytics and insights'}
          </p>
          {isOwner && (
            <div className="mt-3 flex gap-2">
              <div className="badge badge-primary badge-lg">Owner View</div>
            </div>
          )}
        </div>

        {/* Owner Summary Cards */}
        {isOwner && (
          <>
            {totalOwnerProperties === 0 ? (
              /* No Properties Yet - Onboarding */
              <div className="card bg-gradient-to-br from-primary to-secondary shadow-xl mb-6">
                <div className="card-body text-center py-12">
                  <h2 className="text-3xl font-bold text-white mb-3">Welcome to Your Analytics Dashboard!</h2>
                  <p className="text-white/90 text-lg mb-6">
                    You haven't added any properties yet. Start listing your hotels or cars to see analytics here.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <button 
                      onClick={() => navigate('/owner/hotels/new')}
                      className="btn btn-lg bg-white text-primary hover:bg-white/90 border-none"
                    >
                      <FaHotel className="mr-2" />
                      Add Your First Hotel
                    </button>
                    <button 
                      onClick={() => navigate('/owner/cars/new')}
                      className="btn btn-lg btn-outline border-white text-white hover:bg-white/20"
                    >
                      <FaCar className="mr-2" />
                      Add Your First Car
                    </button>
                  </div>
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-white/80 text-sm">
                    <div className="p-4 bg-white/10 rounded-lg">
                      <div className="font-bold mb-2">Track Performance</div>
                      <div className="text-xs">See which properties get the most views</div>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg">
                      <div className="font-bold mb-2">Monitor Reviews</div>
                      <div className="text-xs">Track guest satisfaction and feedback</div>
                    </div>
                    <div className="p-4 bg-white/10 rounded-lg">
                      <div className="font-bold mb-2">Optimize Revenue</div>
                      <div className="text-xs">Get insights to boost bookings</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Has Properties - Show Stats */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="card bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl">
                  <div className="card-body">
                    <p className="text-sm text-white/80 mb-2 font-medium">Total Properties</p>
                    <p className="text-5xl font-bold text-white mb-4">{totalOwnerProperties}</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">{activeHotelsCount}</p>
                        <p className="text-xs text-white/80 mt-1">Hotels</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">{activeCarsCount}</p>
                        <p className="text-xs text-white/80 mt-1">Cars</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-green-600 to-green-800 shadow-xl">
                  <div className="card-body">
                    <p className="text-sm text-white/80 mb-2 font-medium">Total Views</p>
                    <p className="text-5xl font-bold text-white mb-4">
                      {propertyClicks?.items?.reduce((sum, item) => sum + item.clicks, 0) || 0}
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">
                          {propertyClicks?.items?.filter(item => item.listingId.startsWith('HT')).reduce((sum, item) => sum + item.clicks, 0) || 0}
                        </p>
                        <p className="text-xs text-white/80 mt-1">Hotel Views</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-3">
                        <p className="text-2xl font-bold text-white">
                          {propertyClicks?.items?.filter(item => item.listingId.startsWith('CR')).reduce((sum, item) => sum + item.clicks, 0) || 0}
                        </p>
                        <p className="text-xs text-white/80 mt-1">Car Views</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card bg-gradient-to-br from-orange-500 to-orange-700 shadow-xl">
                  <div className="card-body">
                    <p className="text-sm text-white/80 mb-1 font-medium">Avg Reviews</p>
                    <p className="text-5xl font-bold text-white">
                      {propertyReviews?.items?.length > 0 
                        ? (propertyReviews.items.reduce((sum, item) => sum + item.reviewCount, 0) / propertyReviews.items.length).toFixed(1)
                        : '0'}
                    </p>
                    <p className="text-xs text-white/70 mt-2 font-medium">Per property</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Main Analytics - Hotels vs Cars Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Hotels - Clickable with Names */}
          <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl text-primary"><FaHotel /></div>
                <h3 className="card-title text-lg">Top Hotels by Views</h3>
              </div>
              {loadingProperties ? (
                <div className="flex justify-center items-center py-8">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              ) : (
                <div className="space-y-3">
                  {(propertyClicks?.items || [])
                    .filter(item => item.listingId.startsWith('HT'))
                    .slice(0, 5)
                    .map((item, idx) => {
                      const details = propertyDetails[item.listingId];
                      const maxClicks = Math.max(...(propertyClicks?.items || []).map(p => p.clicks));
                      const percentage = (item.clicks / maxClicks) * 100;
                      
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            // Owner analytics - take to their hotels page to view their property
                            if (isOwner) {
                              navigate('/owner/hotels');
                            } else {
                              navigate('/hotels');
                            }
                          }}
                          className="space-y-2 p-3 rounded-lg bg-base-200/30 hover:bg-primary/10 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {idx < 3 && <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>}
                                <span className="font-bold text-sm">
                                  {details?.name || item.listingId}
                                </span>
                              </div>
                              {details?.city && (
                                <div className="flex items-center gap-1 mt-1">
                                  <FaMapMarkerAlt className="text-xs text-base-content/50" />
                                  <span className="text-xs text-base-content/60">{details.city}</span>
                                </div>
                              )}
                            </div>
                            <span className="badge badge-primary badge-lg">{item.clicks}</span>
                          </div>
                          <div className="w-full bg-base-300 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-primary to-secondary h-3 rounded-full transition-all duration-1000"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  {(propertyClicks?.items || []).filter(item => item.listingId.startsWith('HT')).length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2 opacity-30">🏨</div>
                      <p className="text-sm text-base-content/70">No hotel listings</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Top Cars - Clickable with Names */}
          <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl text-primary"><FaCar /></div>
                <h3 className="card-title text-lg">Top Cars by Views</h3>
              </div>
              {loadingProperties ? (
                <div className="flex justify-center items-center py-8">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
              ) : (
                <div className="space-y-3">
                  {(propertyClicks?.items || [])
                    .filter(item => item.listingId.startsWith('CR'))
                    .slice(0, 5)
                    .map((item, idx) => {
                      const details = propertyDetails[item.listingId];
                      const maxClicks = Math.max(...(propertyClicks?.items || []).map(p => p.clicks));
                      const percentage = (item.clicks / maxClicks) * 100;
                      
                      return (
                        <div 
                          key={idx}
                          onClick={() => {
                            // Owner analytics - take to their cars page to view their property
                            if (isOwner) {
                              navigate('/owner/cars');
                            } else {
                              navigate('/cars');
                            }
                          }}
                          className="space-y-2 p-3 rounded-lg bg-base-200/30 hover:bg-primary/10 transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:shadow-lg"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {idx < 3 && <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>}
                                <span className="font-bold text-sm">
                                  {details?.name || item.listingId}
                                </span>
                              </div>
                              {details?.city && (
                                <div className="flex items-center gap-1 mt-1">
                                  <FaMapMarkerAlt className="text-xs text-base-content/50" />
                                  <span className="text-xs text-base-content/60">{details.city}</span>
                                </div>
                              )}
                            </div>
                            <span className="badge badge-primary badge-lg">{item.clicks}</span>
                          </div>
                          <div className="w-full bg-base-300 rounded-full h-3 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-accent to-secondary h-3 rounded-full transition-all duration-1000"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  {(propertyClicks?.items || []).filter(item => item.listingId.startsWith('CR')).length === 0 && (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2 opacity-30">🚗</div>
                      <p className="text-sm text-base-content/70">No car rental listings</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Owner-Specific Bottom Section OR Admin Deals */}
        {isOwner ? (
          /* Property Performance Summary for Owners */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Property Insights Card */}
            <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
              <div className="card-body">
                <div className="mb-4">
                  <h3 className="card-title text-lg">Property Insights</h3>
                  <p className="text-xs text-base-content/60">Your listing breakdown</p>
                </div>
                <div className="space-y-4">
                  {/* Top Performer */}
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-base-content/80">Top Performer</span>
                      <span className="badge badge-primary badge-sm">Most Views</span>
                    </div>
                    <div className="font-bold text-lg text-primary">
                      {propertyDetails[propertyClicks?.items?.[0]?.listingId]?.name || propertyClicks?.items?.[0]?.listingId || 'N/A'}
                    </div>
                    <div className="text-sm text-base-content/60">
                      {propertyClicks?.items?.[0]?.clicks || 0} clicks
                    </div>
                  </div>

                  {/* Needs Attention */}
                  {propertyClicks?.items?.length > 1 && (
                    <div className="p-4 bg-gradient-to-r from-warning/10 to-warning/5 rounded-lg border border-warning/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-base-content/80">Needs Attention</span>
                        <span className="badge badge-warning badge-sm">Low Views</span>
                      </div>
                      <div className="font-bold text-lg text-warning">
                        {propertyDetails[propertyClicks?.items?.[propertyClicks.items.length - 1]?.listingId]?.name || propertyClicks?.items?.[propertyClicks.items.length - 1]?.listingId || 'N/A'}
                      </div>
                      <div className="text-sm text-base-content/60">
                        {propertyClicks?.items?.[propertyClicks.items.length - 1]?.clicks || 0} clicks
                      </div>
                    </div>
                  )}

                  {/* Property Type Breakdown - Only Active Properties */}
                  <div className="p-4 bg-gradient-to-r from-info/10 to-info/5 rounded-lg border border-info/20">
                    <div className="text-sm font-semibold text-base-content/80 mb-3">Your Active Portfolio</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-2xl font-bold text-info">
                          {ownerHotels?.items?.filter(h => h.status !== 'unlisted').length || 0}
                        </div>
                        <div className="text-xs text-base-content/60">Hotels</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-info">
                          {ownerCars?.items?.filter(c => c.status !== 'unlisted').length || 0}
                        </div>
                        <div className="text-xs text-base-content/60">Cars/Other</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Quick Actions / Tips for Owners */}
            <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
              <div className="card-body">
                <div className="mb-4">
                  <div>
                    <h3 className="card-title text-lg">Performance Tips</h3>
                    <p className="text-xs text-base-content/60">Boost your property visibility</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-primary/10 border-l-4 border-primary">
                    <div className="font-semibold text-sm mb-1">📸 Add Quality Photos</div>
                    <div className="text-xs text-base-content/70">Properties with 5+ photos get 3x more views</div>
                  </div>
                  <div className="p-3 rounded-lg bg-success/10 border-l-4 border-success">
                    <div className="font-semibold text-sm mb-1">Encourage Reviews</div>
                    <div className="text-xs text-base-content/70">4+ star ratings increase bookings by 40%</div>
                  </div>
                  <div className="p-3 rounded-lg bg-warning/10 border-l-4 border-warning">
                    <div className="font-semibold text-sm mb-1">Competitive Pricing</div>
                    <div className="text-xs text-base-content/70">Adjust rates based on demand and season</div>
                  </div>
                  <div className="p-3 rounded-lg bg-info/10 border-l-4 border-info">
                    <div className="font-semibold text-sm mb-1">Offer Deals</div>
                    <div className="text-xs text-base-content/70">Limited-time offers drive 2x conversions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Admin: Active Deals - Full Width, Top 5 */
          <div className="mb-6">
            <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🎯</span>
                  <h3 className="card-title text-lg">Active Platform Deals (Top 5)</h3>
                </div>
                {loadingBidding ? (
                  <div className="flex justify-center items-center py-8">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                  </div>
                ) : bidding?.items?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {bidding.items.slice(0, 5).map((item, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-all duration-200 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="badge badge-success badge-lg font-bold">
                            {item.savingsPercent > 0 ? `${item.savingsPercent}% OFF` : 'DEAL'}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{item.listingType}</div>
                            <div className="text-xs text-base-content/60">{item.listingId}</div>
                          </div>
                        </div>
                        <div className="text-2xl">💰</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2 opacity-30">🎯</div>
                    <p className="text-sm text-base-content/70">No active deals</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Admin-Only Analytics */}
        {!isOwner && (
          <div className="space-y-6">
            {/* Admin Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Clicks per Page */}
              {renderBarChart(
                'Top 5 Pages by Clicks',
                { items: clicksPerPage?.items?.slice(0, 5) || [] },
                (item) => item.page,
                (item) => item.clicks,
                loadingClicks,
                <FaChartBar />
              )}

              {/* Cohort Analysis */}
              <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
                <div className="card-body">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="text-2xl text-secondary"><FaUsers /></div>
                    <h3 className="card-title text-lg">Cohort Analysis (Top 5)</h3>
                  </div>
                  {loadingCohorts ? (
                    <div className="flex justify-center items-center py-8">
                      <span className="loading loading-spinner loading-lg text-primary"></span>
                    </div>
                  ) : cohorts?.items?.length > 0 ? (
                    <div className="space-y-3">
                      {cohorts.items.slice(0, 5).map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-3 rounded-lg bg-base-200/50 hover:bg-base-200 transition-all duration-200 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="avatar placeholder">
                              <div className="bg-secondary/20 text-secondary rounded-full w-10 h-10">
                                <FaUsers />
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-sm">Cohort {item.cohort}</div>
                              <div className="text-xs text-base-content/60">{item.userCount} users</div>
                            </div>
                          </div>
                          <div className="badge badge-secondary badge-lg">{item.avgStepsPerUser} steps</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2 opacity-30">📊</div>
                      <p className="text-sm text-base-content/70">No cohort data</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Underperforming Sections - Top 6 in 3-column grid */}
            <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-2xl text-warning"><FaEyeSlash /></div>
                  <div>
                    <h3 className="card-title text-lg">Underperforming Sections (Top 6)</h3>
                    <p className="text-xs text-base-content/60">Areas needing UX improvements</p>
                  </div>
                </div>
                {loadingSections ? (
                  <div className="flex justify-center items-center py-8">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                  </div>
                ) : leastSeen?.items?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {leastSeen.items.slice(0, 6).map((item, idx) => {
                      const getAlertBadge = (views) => {
                        if (views <= 3) return { color: 'badge-error', text: '🔴 Critical' };
                        if (views <= 5) return { color: 'badge-warning', text: '🟡 Low' };
                        return { color: 'badge-info', text: '🔵 Monitor' };
                      };
                      
                      const alert = getAlertBadge(item.views);
                      
                      return (
                        <div 
                          key={idx}
                          className="p-3 rounded-lg border-l-4 border-warning bg-base-200/50 hover:bg-base-200 transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`badge ${alert.color} badge-sm font-bold`}>{alert.text}</span>
                            <span className="font-bold text-xl">{item.views}</span>
                          </div>
                          <div className="font-semibold text-sm mb-1">{item.page}</div>
                          <div className="text-xs text-base-content/60">{item.section}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">✅</div>
                    <p className="text-sm text-base-content/70">All sections performing well!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;

