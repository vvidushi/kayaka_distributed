import apiClient from '../../config/api';

export const adminApi = {
  getRevenueReport: async (params = {}) => {
    const { data } = await apiClient.get('/admin/reports/revenue', { params });
    return data;
  },
  getTopProviders: async (params = {}) => {
    const { data } = await apiClient.get('/admin/reports/providers', { params });
    return data;
  },
  getTopProperties: async (params = {}) => {
    const { data } = await apiClient.get('/admin/reports/top-properties', { params });
    return data;
  },
  getCityRevenue: async (params = {}) => {
    const { data } = await apiClient.get('/admin/reports/city-revenue', { params });
    return data;
  },
  getProvidersLastMonth: async (params = {}) => {
    const { data } = await apiClient.get('/admin/reports/providers/last-month', { params });
    return data;
  },
  searchBills: async (params = {}) => {
    const { data } = await apiClient.get('/admin/bills', { params });
    return data;
  },
};
