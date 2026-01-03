import apiClient from '../../config/api';

export const reviewsApi = {
  listReviews: async (params = {}) => {
    const { data } = await apiClient.get('/reviews', { params });
    return data;
  },
  createReview: async (payload) => {
    const { data } = await apiClient.post('/reviews', payload);
    return data;
  },
};
