import apiClient from '../../config/api';

export const listingsApi = {
  searchFlights: async (params = {}) => {
    const { data } = await apiClient.get('/flights/search', { params });
    return data;
  },

  // Get available airlines based on search criteria
  getAvailableAirlines: async (params = {}) => {
    const { data } = await apiClient.get('/flights/airlines', { params });
    return data;
  },

  // Autocomplete for flight locations (origins/destinations)
  searchFlightLocations: async (query, limit = 10) => {
    const { data } = await apiClient.get('/flights/locations', {
      params: { q: query, limit },
    });
    return data;
  },

  // Get flight prices by date range for calendar view
  getFlightPricesByDate: async (params) => {
    const { data } = await apiClient.get('/flights/prices-by-date', { params });
    return data;
  },

  getFlight: async (flightId) => {
    const { data } = await apiClient.get(`/flights/${flightId}`);
    return data;
  },

  searchHotels: async (params = {}) => {
    const { data } = await apiClient.get('/hotels/search', { params });
    return data;
  },

  // Autocomplete for hotel locations (cities)
  searchHotelLocations: async (query, limit = 10) => {
    const { data } = await apiClient.get('/hotels/locations', {
      params: { q: query, limit },
    });
    return data;
  },

  getHotel: async (hotelId) => {
    const { data } = await apiClient.get(`/hotels/${hotelId}`);
    return data;
  },

  searchCars: async (params = {}) => {
    const { data } = await apiClient.get('/cars/search', { params });
    return data;
  },

  // Autocomplete for car locations
  searchCarLocations: async (query, limit = 10) => {
    const { data } = await apiClient.get('/cars/locations', {
      params: { q: query, limit },
    });
    return data;
  },

  getCar: async (carId) => {
    const { data } = await apiClient.get(`/cars/${carId}`);
    return data;
  },
};

