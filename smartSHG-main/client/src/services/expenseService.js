import api from './api';

export const expenseService = {
  listExpenses: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/expenses`, { params });
    return res.data;
  },
  recordExpense: async (groupId, data) => {
    const res = await api.post(`/groups/${groupId}/expenses`, data);
    return res.data;
  },
};
