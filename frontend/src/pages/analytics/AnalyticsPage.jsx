import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api/analytics';
import { useToast } from '../../hooks/useToast';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const AnalyticsPage = () => {
  useDocumentTitle('Analytics Dashboard');
  const toast = useToast();
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    listingType: '',
    page: '',
    action: 'click',
    limit: 20,
  });

  // Clicks per page
  const { data: clicksPerPage, isLoading: loadingClicks } = useQuery({
    queryKey: ['analytics', 'clicks-per-page', filters],
    queryFn: () => analyticsApi.getClicksPerPage({
      startDate: filters.startDate,
      endDate: filters.endDate,
      action: filters.action,
    }),
    enabled: true,
  });

  // Property clicks
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

  // Least seen sections
  const { data: leastSeen, isLoading: loadingSections } = useQuery({
    queryKey: ['analytics', 'least-seen', filters],
    queryFn: () => analyticsApi.getLeastSeenSections({
      startDate: filters.startDate,
      endDate: filters.endDate,
      page: filters.page || undefined,
    }),
    enabled: true,
  });

  // Property reviews
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

  // Cohort analysis
  const { data: cohorts, isLoading: loadingCohorts } = useQuery({
    queryKey: ['analytics', 'cohorts', filters],
    queryFn: () => analyticsApi.getCohortAnalysis({
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    enabled: true,
  });

  // User traces
  const [traceFilters, setTraceFilters] = useState({ userId: '', cohort: '' });
  const { data: userTraces, isLoading: loadingTraces } = useQuery({
    queryKey: ['analytics', 'traces', traceFilters],
    queryFn: () => analyticsApi.getUserTrace({
      userId: traceFilters.userId || undefined,
      cohort: traceFilters.cohort || undefined,
      limit: 10,
    }),
    enabled: traceFilters.userId || traceFilters.cohort,
  });

  // Bidding tracking
  const { data: bidding, isLoading: loadingBidding } = useQuery({
    queryKey: ['analytics', 'bidding', filters],
    queryFn: () => analyticsApi.getBiddingTracking({
      listingType: filters.listingType || undefined,
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    enabled: true,
  });

  const renderChart = (title, data, renderItem, isLoading) => (
    <div className="card bg-base-100 shadow-md border border-base-300">
      <div className="card-body">
        <h3 className="card-title text-lg">{title}</h3>
        {isLoading ? (
          <span className="loading loading-spinner loading-md"></span>
        ) : data?.items?.length > 0 ? (
          <div className="space-y-2">
            {data.items.slice(0, 10).map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {renderItem(item)}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-base-content/70">No data available</p>
        )}
      </div>
    </div>
  );

  const renderBarChart = (title, data, getLabel, getValue, isLoading) => {
    if (isLoading) {
      return (
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-lg">{title}</h3>
            <span className="loading loading-spinner loading-md"></span>
          </div>
        </div>
      );
    }

    if (!data?.items?.length) {
      return (
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-lg">{title}</h3>
            <p className="text-sm text-base-content/70">No data available</p>
          </div>
        </div>
      );
    }

    const maxValue = Math.max(...data.items.map(getValue));
    
    return (
      <div className="card bg-base-100 shadow-md border border-base-300">
        <div className="card-body">
          <h3 className="card-title text-lg">{title}</h3>
          <div className="space-y-2">
            {data.items.slice(0, 10).map((item, idx) => {
              const value = getValue(item);
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{getLabel(item)}</span>
                    <span className="text-base-content/70">{value.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-base-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-base-content/70">Host/Provider analytics and insights</p>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-md border border-base-300 mb-6">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="label">
                <span className="label-text">Start Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">End Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Listing Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={filters.listingType}
                onChange={(e) => setFilters({ ...filters, listingType: e.target.value })}
              >
                <option value="">All</option>
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
                <option value="car">Car</option>
              </select>
            </div>
            <div>
              <label className="label">
                <span className="label-text">Page</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Filter by page"
                value={filters.page}
                onChange={(e) => setFilters({ ...filters, page: e.target.value })}
              />
            </div>
            <div>
              <label className="label">
                <span className="label-text">Limit</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value) || 20 })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Clicks per page */}
        {renderBarChart(
          'Clicks per Page',
          clicksPerPage,
          (item) => item.page,
          (item) => item.clicks,
          loadingClicks
        )}

        {/* Property clicks */}
        {renderBarChart(
          'Top Properties by Clicks',
          propertyClicks,
          (item) => item.listingId,
          (item) => item.clicks,
          loadingProperties
        )}

        {/* Least seen sections */}
        {renderChart(
          'Least Seen Sections',
          leastSeen,
          (item) => (
            <div className="flex justify-between w-full text-sm">
              <span>{item.page} / {item.section}</span>
              <span className="text-base-content/70">{item.views} views</span>
            </div>
          ),
          loadingSections
        )}

        {/* Property reviews */}
        {renderBarChart(
          'Properties by Reviews',
          propertyReviews,
          (item) => `${item.listingType}: ${item.listingId}`,
          (item) => item.reviewCount,
          loadingReviews
        )}
      </div>

      {/* Cohort Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {renderChart(
          'Cohort Analysis',
          cohorts,
          (item) => (
            <div className="flex justify-between w-full text-sm">
              <span className="font-medium">Cohort: {item.cohort}</span>
              <div className="flex gap-4">
                <span className="text-base-content/70">{item.userCount} users</span>
                <span className="text-base-content/70">{item.avgStepsPerUser} avg steps</span>
              </div>
            </div>
          ),
          loadingCohorts
        )}

        {/* User Trace Search */}
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body">
            <h3 className="card-title text-lg">User Trace Search</h3>
            <div className="space-y-4">
              <div>
                <label className="label">
                  <span className="label-text">User ID</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Enter user ID"
                  value={traceFilters.userId}
                  onChange={(e) => setTraceFilters({ ...traceFilters, userId: e.target.value })}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">Cohort</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="YYYY-MM-DD"
                  value={traceFilters.cohort}
                  onChange={(e) => setTraceFilters({ ...traceFilters, cohort: e.target.value })}
                />
              </div>
              {loadingTraces ? (
                <span className="loading loading-spinner loading-md"></span>
              ) : userTraces?.items?.length > 0 ? (
                <div className="space-y-4">
                  {userTraces.items.map((trace, idx) => (
                    <div key={idx} className="border border-base-300 rounded p-4">
                      <div className="mb-3">
                        <div className="text-sm font-medium">User: {trace.userId}</div>
                        <div className="text-xs text-base-content/70">Cohort: {trace.cohort}</div>
                        <div className="text-xs text-base-content/70">Total Steps: {trace.stepCount}</div>
                      </div>
                      {trace.steps?.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-medium mb-2">User Journey Trace:</div>
                          <div className="relative">
                            {/* Trace Diagram */}
                            <div className="space-y-2">
                              {trace.steps.slice(-10).map((step, stepIdx) => (
                                <div key={stepIdx} className="flex items-center gap-2">
                                  {/* Connection Line */}
                                  {stepIdx > 0 && (
                                    <div className="absolute left-4 w-0.5 h-4 bg-primary -top-2"></div>
                                  )}
                                  {/* Step Node */}
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <div className="flex-1 border-l-2 border-primary pl-3 py-2 bg-base-200 rounded-r">
                                      <div className="text-xs font-medium">{step.eventType}</div>
                                      <div className="text-xs text-base-content/70">
                                        {step.eventData?.status || step.eventData?.amount ? 
                                          `Status: ${step.eventData.status || 'N/A'} | Amount: ${step.eventData.amount || 'N/A'}` :
                                          new Date(step.createdAt).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {/* Arrow at end */}
                            {trace.steps.length > 0 && (
                              <div className="flex justify-center mt-2">
                                <div className="text-primary">↓</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-base-content/70">Enter user ID or cohort to search</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bidding/Deals Tracking */}
      <div className="mb-6">
        {renderChart(
          'Bidding/Limited Offers Tracking',
          bidding,
          (item) => (
            <div className="flex justify-between w-full text-sm">
              <span>{item.listingType}: {item.listingId}</span>
              <span className="text-base-content/70">
                {item.savingsPercent > 0 ? `${item.savingsPercent}% off` : 'Deal'}
              </span>
            </div>
          ),
          loadingBidding
        )}
        {bidding?.note && (
          <p className="text-xs text-base-content/70 mt-2">{bidding.note}</p>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
