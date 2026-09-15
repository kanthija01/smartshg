import api from './api';

export const savingsService = {
  listSavings: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/savings`, { params });
    return res.data;
  },
  recordSavings: async (groupId, savingsData) => {
    const res = await api.post(`/groups/${groupId}/savings`, savingsData);
    return res.data;
  },
  getMySavings: async (groupId) => {
    const res = await api.get(`/groups/${groupId}/savings/my-savings`);
    return res.data;
  },
  getSavingsSummary: async (groupId, period) => {
    const res = await api.get(`/groups/${groupId}/savings/summary`, { params: { period } });
    return res.data;
  },
};
