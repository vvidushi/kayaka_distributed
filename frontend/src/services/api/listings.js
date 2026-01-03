import apiClient from '../../config/api';

export const listingsApi = {
  searchFlights: async (params = {}) => {
    const { data } = await apiClient.get('/listings/flights/search', { params });
    return data;
  },

  // Get available airlines based on search criteria
  getAvailableAirlines: async (params = {}) => {
    const { data } = await apiClient.get('/listings/flights/airlines', { params });
    return data;
  },

  // Autocomplete for flight locations (origins/destinations)
  searchFlightLocations: async (query, limit = 10) => {
    const { data } = await apiClient.get('/listings/flights/locations', {
      params: { q: query, limit },
    });
    return data;
  },

  // Get flight prices by date range for calendar view
  getFlightPricesByDate: async (params) => {
    const { data } = await apiClient.get('/listings/flights/prices-by-date', { params });
    return data;
  },

  getFlight: async (flightId) => {
    const { data } = await apiClient.get(`/listings/flights/${flightId}`);
    return data;
  },

  searchHotels: async (params = {}) => {
    const { data } = await apiClient.get('/listings/hotels/search', { params });
    return data;
  },

  // Autocomplete for hotel locations (cities)
  searchHotelLocations: async (query, limit = 10) => {
    const { data } = await apiClient.get('/listings/hotels/locations', {
      params: { q: query, limit },
    });
    return data.items || data;
  },

  // Get hotel prices by date range for calendar view
  getHotelPricesByDate: async (params) => {
    const { data } = await apiClient.get('/listings/hotels/prices-by-date', { params });
    return data;
  },

  getHotel: async (hotelId) => {
    const { data } = await apiClient.get(`/listings/hotels/${hotelId}`);
    return data;
  },

  // Get all available amenities from the database
  getAvailableAmenities: async () => {
    const { data } = await apiClient.get('/listings/hotels/amenities');
    return data;
  },

  // Get all available property types from the database
  getAvailablePropertyTypes: async () => {
    const { data } = await apiClient.get('/listings/hotels/property-types');
    return data;
  },

  searchCars: async (params = {}) => {
    const { data } = await apiClient.get('/listings/cars/search', { params });
    return data;
  },

  // Autocomplete for car locations
  searchCarLocations: async (query, limit = 10) => {
    const { data } = await apiClient.get('/listings/cars/locations', {
      params: { q: query, limit },
    });
    return data;
  },

  getCar: async (carId) => {
    const { data } = await apiClient.get(`/listings/cars/${carId}`);
    return data;
  },

  // Track click/view events for analytics
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


