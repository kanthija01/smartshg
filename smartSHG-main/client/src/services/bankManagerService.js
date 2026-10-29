import api from "./api";

export const bankManagerService = {
  getDashboard: async () => {
    const res = await api.get("/bank-manager/dashboard");
    return res.data;
  },
  listGroups: async () => {
    const res = await api.get("/bank-manager/groups");
    return res.data;
  },
  listLoans: async (params = {}) => {
    const res = await api.get("/bank-manager/loans", { params });
    return res.data;
  },
  getLoan: async (loanId) => {
    const res = await api.get(`/bank-manager/loans/${loanId}`);
    return res.data;
  },
  submitReview: async (loanId, data) => {
    const res = await api.put(`/bank-manager/loans/${loanId}/review`, data);
    return res.data;
  },
  approveLoan: async (loanId, data) => {
    const res = await api.put(`/bank-manager/loans/${loanId}/approve`, data);
    return res.data;
  },
  rejectLoan: async (loanId, data) => {
    const res = await api.put(`/bank-manager/loans/${loanId}/reject`, data);
    return res.data;
  },
};
