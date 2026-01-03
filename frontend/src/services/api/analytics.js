import apiClient from '../../config/api';

export const analyticsApi = {
  getClicksPerPage: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/clicks/per-page', { params });
    return data;
  },

  getPropertyClicks: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/clicks/properties', { params });
    return data;
  },

  getLeastSeenSections: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/sections/least-seen', { params });
    return data;
  },

  getPropertyReviews: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/reviews/properties', { params });
    return data;
  },

  getUserTrace: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/traces/users', { params });
    return data;
  },

  getCohortAnalysis: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/cohorts', { params });
    return data;
  },

  getBiddingTracking: async (params = {}) => {
    const { data } = await apiClient.get('/analytics/bidding', { params });
    return data;
  },

  // Track click/view events
  trackClick: async (clickData) => {
    try {
      const { data } = await apiClient.post('/tracking/click', clickData);
      return data;
    } catch (error) {
      console.warn('Failed to track click:', error);
      return null;
    }
  },
};

