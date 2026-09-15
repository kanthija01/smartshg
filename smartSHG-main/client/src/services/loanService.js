import api from './api';

export const loanService = {
  listLoans: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/loans`, { params });
    return res.data;
  },
  getLoanDetails: async (groupId, loanId) => {
    const res = await api.get(`/groups/${groupId}/loans/${loanId}`);
    return res.data;
  },
  requestLoan: async (groupId, loanData) => {
    const res = await api.post(`/groups/${groupId}/loans`, loanData);
    return res.data;
  },
  approveLoan: async (groupId, loanId) => {
    const res = await api.put(`/groups/${groupId}/loans/${loanId}/approve`);
    return res.data;
  },
  rejectLoan: async (groupId, loanId, reason) => {
    const res = await api.put(`/groups/${groupId}/loans/${loanId}/reject`, { reason });
    return res.data;
  },
  disburseLoan: async (groupId, loanId, data) => {
    const res = await api.post(`/groups/${groupId}/loans/${loanId}/disburse`, data);
    return res.data;
  },
  repayLoan: async (groupId, loanId, data) => {
    const res = await api.post(`/groups/${groupId}/loans/${loanId}/repay`, data);
    return res.data;
  },
};
