import apiClient from '../../config/api';

export const bookingsApi = {
  searchBookings: async (params = {}) => {
    const { data } = await apiClient.get('/bookings', { params });
    return data;
  },

  createBooking: async (bookingData) => {
    const { data } = await apiClient.post('/bookings', bookingData);
    return data;
  },

  getBooking: async (bookingId) => {
    const { data } = await apiClient.get(`/bookings/${bookingId}`);
    return data;
  },

  updateBooking: async (bookingId, updateData) => {
    const { data } = await apiClient.patch(`/bookings/${bookingId}`, updateData);
    return data;
  },

  confirmBooking: async (bookingId) => {
    const { data } = await apiClient.post(`/bookings/${bookingId}/confirm`);
    return data;
  },
};

