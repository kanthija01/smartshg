import api from './api';

export const ledgerService = {
  getBalances: async (groupId) => {
    const res = await api.get(`/groups/${groupId}/ledger/balances`);
    return res.data;
  },
  listTransactions: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/ledger/transactions`, { params });
    return res.data;
  },
  depositCash: async (groupId, data) => {
    const res = await api.post(`/groups/${groupId}/ledger/deposit`, data);
    return res.data;
  },
  withdrawCash: async (groupId, data) => {
    const res = await api.post(`/groups/${groupId}/ledger/withdrawal`, data);
    return res.data;
  },
  reconcileBank: async (groupId, data) => {
    const res = await api.post(`/groups/${groupId}/ledger/reconcile`, data);
    return res.data;
  },
  reverseTransaction: async (groupId, txId, reason) => {
    const res = await api.post(`/groups/${groupId}/ledger/transactions/${txId}/reverse`, { reason });
    return res.data;
  },
};
