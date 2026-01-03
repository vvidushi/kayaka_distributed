import apiClient from '../../config/api';

export const authApi = {
  register: async (userData) => {
    const { data } = await apiClient.post('/auth/register', userData);
    return data;
  },

  login: async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data;
  },

  logout: async () => {
    const { data } = await apiClient.post('/auth/logout');
    return data;
  },

  getMe: async () => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  refreshToken: async () => {
    const { data } = await apiClient.post('/auth/refresh');
    return data;
  },

  updateProfile: async (updates) => {
    const { data } = await apiClient.put('/auth/profile', updates);
    return data;
  },
};

