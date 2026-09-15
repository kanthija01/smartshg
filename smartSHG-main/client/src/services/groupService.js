import api from './api';

export const groupService = {
  getMyGroups: async () => {
    const res = await api.get('/groups/my-groups');
    return res.data;
  },
  createGroup: async (groupData) => {
    const res = await api.post('/groups', groupData);
    return res.data;
  },
  getGroupDetails: async (groupId) => {
    const res = await api.get(`/groups/${groupId}`);
    return res.data;
  },
  updateGroup: async (groupId, data) => {
    const res = await api.put(`/groups/${groupId}`, data);
    return res.data;
  },
  getGroupStats: async (groupId) => {
    const res = await api.get(`/groups/${groupId}/stats`);
    return res.data;
  },
};
