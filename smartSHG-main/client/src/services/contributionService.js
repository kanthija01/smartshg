import api from "./api";

export const contributionService = {
  getMyContribution: async (groupId, period) => {
    const params = period ? { period } : {};
    const res = await api.get(`/groups/${groupId}/contributions/my-contribution`, { params });
    return res.data;
  },
  getContributionSummary: async (groupId, period) => {
    const params = period ? { period } : {};
    const res = await api.get(`/groups/${groupId}/contributions/summary`, { params });
    return res.data;
  },
  listContributions: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/contributions`, { params });
    return res.data;
  },
  recordOfflinePayment: async (groupId, contributionId, data) => {
    const res = await api.post(`/groups/${groupId}/contributions/${contributionId}/record-payment`, data);
    return res.data;
  },
  createRazorpayOrder: async (groupId, contributionId) => {
    const res = await api.post(`/groups/${groupId}/contributions/${contributionId}/create-order`);
    return res.data;
  },
  verifyPayment: async (groupId, contributionId, paymentData) => {
    const res = await api.post(`/groups/${groupId}/contributions/${contributionId}/verify-payment`, paymentData);
    return res.data;
  },
};
