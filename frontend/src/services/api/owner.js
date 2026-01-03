import apiClient from '../../config/api';

export const ownerApi = {
  // Get owner's hotels
  getHotels: async () => {
    const { data } = await apiClient.get('/owner/hotels');
    return data;
  },

  // Get single hotel
  getHotel: async (hotelId) => {
    const { data } = await apiClient.get(`/owner/hotels/${hotelId}`);
    return data;
  },

  // Get owner's cars
  getCars: async () => {
    const { data } = await apiClient.get('/owner/cars');
    return data;
  },

  // Get single car
  getCar: async (carId) => {
    const { data } = await apiClient.get(`/owner/cars/${carId}`);
    return data;
  },

  // Create a new hotel
  createHotel: async (hotelData) => {
    const { data } = await apiClient.post('/owner/hotels', hotelData);
    return data;
  },

  // Update hotel
  updateHotel: async (hotelId, hotelData) => {
    const { data } = await apiClient.put(`/owner/hotels/${hotelId}`, hotelData);
    return data;
  },

  // Create a new car
  createCar: async (carData) => {
    const { data } = await apiClient.post('/owner/cars', carData);
    return data;
  },

  // Update car
  updateCar: async (carId, carData) => {
    const { data } = await apiClient.put(`/owner/cars/${carId}`, carData);
    return data;
  },

  // Update hotel status
  updateHotelStatus: async (hotelId, status) => {
    const { data } = await apiClient.patch(`/owner/hotels/${hotelId}/status`, { status });
    return data;
  },

  // Update car status
  updateCarStatus: async (carId, status) => {
    const { data } = await apiClient.patch(`/owner/cars/${carId}/status`, { status });
    return data;
  },

  // Delete hotel
  deleteHotel: async (hotelId) => {
    const { data } = await apiClient.delete(`/owner/hotels/${hotelId}`);
    return data;
  },

  // Delete car
  deleteCar: async (carId) => {
    const { data } = await apiClient.delete(`/owner/cars/${carId}`);
    return data;
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    const { data } = await apiClient.get('/owner/dashboard');
    return data;
  },
};

export default ownerApi;

