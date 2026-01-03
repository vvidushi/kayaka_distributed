import apiClient from '../../config/api';

export const aiAgentApi = {
  /**
   * Create a new chat session
   */
  createSession: async (initialMessage = null, mode = null) => {
    const { data } = await apiClient.post('/ai-agent/sessions', {
      initial_message: initialMessage,
      chat_mode: mode,
    });
    return data;
  },

  /**
   * Get chat session
   */
  getSession: async (sessionId) => {
    const { data } = await apiClient.get(`/ai-agent/sessions/${sessionId}`);
    return data;
  },

  /**
   * Send message in chat session
   */
  sendMessage: async (sessionId, message) => {
    const { data } = await apiClient.post(`/ai-agent/sessions/${sessionId}/messages`, {
      message,
    });
    return data;
  },

  /**
   * Get bundles
   */
  getBundles: async (params = {}) => {
    const { data } = await apiClient.get('/ai-agent/bundles', { params });
    return data;
  },

  /**
   * Get bundle by ID
   */
  getBundle: async (bundleId) => {
    const { data } = await apiClient.get(`/ai-agent/bundles/${bundleId}`);
    return data;
  },

  /**
   * Create watch
   */
  createWatch: async (watchData) => {
    const { data } = await apiClient.post('/ai-agent/watches', watchData);
    return data;
  },

  /**
   * List watches
   */
  listWatches: async () => {
    const { data } = await apiClient.get('/ai-agent/watches');
    return data;
  },

  /**
   * Execute database query
   */
  executeQuery: async (question, context = {}) => {
    const { data } = await apiClient.post('/ai-agent/query', {
      question,
      context,
    });
    return data;
  },

  /**
   * Get policy answer
   */
  getPolicyAnswer: async (listingId, questionType) => {
    const { data } = await apiClient.post('/ai-agent/policy', {
      listing_id: listingId,
      question_type: questionType,
    });
    return data;
  },

  /**
   * Health check
   */
  healthCheck: async () => {
    const { data } = await apiClient.get('/ai-agent/health');
    return data;
  },
};
