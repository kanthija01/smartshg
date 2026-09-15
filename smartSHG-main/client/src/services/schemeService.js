import api from './api';

export const schemeService = {
  listSchemes: async (params = {}) => {
    const res = await api.get('/schemes', { params });
    return res.data;
  },
  getSchemeDetails: async (id) => {
    const res = await api.get(`/schemes/${id}`);
    return res.data;
  },
};

export const notificationService = {
  listNotifications: async (params = {}) => {
    const res = await api.get('/notifications', { params });
    return res.data;
  },
  markAsRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },
  markAllAsRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },
};

export const auditService = {
  listAuditLogs: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/audit`, { params });
    return res.data;
  },
};
