import apiClient from '../../config/api';

export const paymentsApi = {
  /**
   * List payments with optional filters
   */
  listPayments: async (params = {}) => {
    const { data } = await apiClient.get('/payments', { params });
    return data;
  },

  /**
   * Create a new payment
   */
  createPayment: async (paymentData) => {
    const { data } = await apiClient.post('/payments', paymentData);
    return data;
  },

  /**
   * Get payment by ID
   */
  getPayment: async (paymentId) => {
    const { data } = await apiClient.get(`/payments/${paymentId}`);
    return data;
  },

  /**
   * Process a payment (authorize and capture)
   */
  processPayment: async (paymentId, paymentMethodData = {}) => {
    const { data } = await apiClient.post(`/payments/${paymentId}/process`, paymentMethodData);
    return data;
  },

  /**
   * Refund a payment
   */
  refundPayment: async (paymentId, refundAmount = null) => {
    const body = {};
    if (refundAmount !== null && refundAmount !== undefined) {
      body.amount = refundAmount;
    }
    const { data } = await apiClient.post(`/payments/${paymentId}/refunds`, body);
    return data;
  },
};

