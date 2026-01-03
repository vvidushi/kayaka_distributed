import apiClient from '../../config/api';

export const profileApi = {
  getProfile: async () => {
    const { data } = await apiClient.get('/profile');
    return data.data || data;
  },
  createProfile: async (payload) => {
    const { data } = await apiClient.post('/profile', payload);
    return data.data || data;
  },
  updateProfile: async (updates) => {
    const { data } = await apiClient.put('/profile', updates);
    return data.data || data;
  },
  deleteProfile: async () => {
    const { data } = await apiClient.delete('/profile');
    return data;
  },
};
