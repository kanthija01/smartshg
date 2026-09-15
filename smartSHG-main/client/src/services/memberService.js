import api from './api';

export const memberService = {
  listMembers: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/members`, { params });
    return res.data;
  },
  getMemberDetails: async (groupId, memberId) => {
    const res = await api.get(`/groups/${groupId}/members/${memberId}`);
    return res.data;
  },
  addMember: async (groupId, memberData) => {
    const res = await api.post(`/groups/${groupId}/members`, memberData);
    return res.data;
  },
  joinGroup: async (groupCode) => {
    const res = await api.post('/members/join', { groupCode });
    return res.data;
  },
  approveMember: async (groupId, memberId) => {
    const res = await api.put(`/groups/${groupId}/members/${memberId}/approve`);
    return res.data;
  },
  rejectMember: async (groupId, memberId) => {
    const res = await api.put(`/groups/${groupId}/members/${memberId}/reject`);
    return res.data;
  },
  updateProfile: async (groupId, memberId, data) => {
    const res = await api.put(`/groups/${groupId}/members/${memberId}`, data);
    return res.data;
  },
};
