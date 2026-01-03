import apiClient from '../../config/api';

export const usersApi = {
  listUsers: async (params = {}) => {
    const { data } = await apiClient.get('/users', { params });
    return data;
  },

  createUser: async (userData) => {
    const { data } = await apiClient.post('/users', userData);
    return data;
  },

  getUser: async (userId) => {
    const { data } = await apiClient.get(`/users/${userId}`);
    return data;
  },

  updateUser: async (userId, userData) => {
    const { data } = await apiClient.put(`/users/${userId}`, userData);
    return data;
  },

  deleteUser: async (userId) => {
    await apiClient.delete(`/users/${userId}`);
  },

  updateSsn: async (userId, payload) => {
    const { data } = await apiClient.patch(`/users/${userId}/compliance/ssn`, payload);
    return data;
  },

  getUserBookings: async (userId, params = {}) => {
    const { data } = await apiClient.get(`/users/${userId}/bookings`, { params });
    return data;
  },

  createUserBooking: async (userId, bookingData) => {
    const { data } = await apiClient.post(`/users/${userId}/bookings`, bookingData);
    return data;
  },

  getUserReviews: async (userId) => {
    const { data } = await apiClient.get(`/users/${userId}/reviews`);
    return data;
  },
};
