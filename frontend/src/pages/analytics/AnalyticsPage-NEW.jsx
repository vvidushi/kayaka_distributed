import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api/analytics';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAuth } from '../../hooks/useAuth';
import { getHomePageFlightImages, getHomePageStayImages, getHomePageCarImages } from '../../services/backgroundImages.service';
import { FaEyeSlash, FaChartBar, FaUsers, FaTrophy, FaHeart, FaHotel, FaEye, FaStar, FaDollarSign } from 'react-icons/fa';

const AnalyticsPage = () => {
  useDocumentTitle('Analytics Dashboard');
  const { user, isAdmin } = useAuth();
  const isOwner = user?.profileType === 'owner';
  
  // Get background images
  const flightImages = getHomePageFlightImages();
  const stayImages = getHomePageStayImages();
  const carImages = getHomePageCarImages();
  
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
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
            {isOwner ? '🏨 Property Owner Analytics' : '📊 Platform Analytics Dashboard'}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="card bg-gradient-to-br from-blue-600 to-blue-800 shadow-xl">
              <div className="card-body">
                <p className="text-sm text-white/80 mb-1 font-medium">Total Properties</p>
                <p className="text-5xl font-bold text-white">{propertyClicks?.items?.length || 0}</p>
                <p className="text-xs text-white/70 mt-2 font-medium">Hotels & Cars listed</p>
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-600 to-green-800 shadow-xl">
              <div className="card-body">
                <p className="text-sm text-white/80 mb-1 font-medium">Total Views</p>
                <p className="text-5xl font-bold text-white">
                  {propertyClicks?.items?.reduce((sum, item) => sum + item.clicks, 0) || 0}
                </p>
                <p className="text-xs text-white/70 mt-2 font-medium">Property clicks</p>
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

        {/* Main Analytics - 2 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top 5 Properties */}
          {renderBarChart(
            isOwner ? '🏆 My Top 5 Properties' : 'Top 5 Properties by Clicks',
            { items: propertyClicks?.items?.slice(0, 5) || [] },
            (item) => item.listingId,
            (item) => item.clicks,
            loadingProperties,
            <FaTrophy />
          )}

          {/* Top 5 Reviewed Properties */}
          {renderBarChart(
            isOwner ? '⭐ Top 5 Reviewed Properties' : 'Top 5 by Reviews',
            { items: propertyReviews?.items?.slice(0, 5) || [] },
            (item) => `${item.listingType}: ${item.listingId}`,
            (item) => item.reviewCount,
            loadingReviews,
            <FaHeart />
          )}
        </div>

        {/* Active Deals - Full Width, Top 5 */}
        <div className="mb-6">
          <div className="card bg-base-100/98 backdrop-blur-md shadow-xl border border-base-300">
            <div className="card-body">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                <h3 className="card-title text-lg">Active Deals & Limited Offers (Top 5)</h3>
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

