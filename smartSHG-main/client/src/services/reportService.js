import api from './api';

export const reportService = {
  getFinancialSummary: async (groupId, timeRange = 'MONTH') => {
    const res = await api.get(`/groups/${groupId}/reports/summary`, { params: { timeRange } });
    return res.data;
  },
  getLoanReport: async (groupId) => {
    const res = await api.get(`/groups/${groupId}/reports/loans`);
    return res.data;
  },
  getMemberStatement: async (groupId, memberId) => {
    const res = await api.get(`/groups/${groupId}/reports/member-statement/${memberId}`);
    return res.data;
  },
};
