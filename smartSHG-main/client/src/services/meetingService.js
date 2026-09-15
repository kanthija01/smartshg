import api from './api';

export const meetingService = {
  listMeetings: async (groupId, params = {}) => {
    const res = await api.get(`/groups/${groupId}/meetings`, { params });
    return res.data;
  },
  getMeetingDetails: async (groupId, meetingId) => {
    const res = await api.get(`/groups/${groupId}/meetings/${meetingId}`);
    return res.data;
  },
  createMeeting: async (groupId, data) => {
    const res = await api.post(`/groups/${groupId}/meetings`, data);
    return res.data;
  },
  recordAttendance: async (groupId, meetingId, attendees) => {
    const res = await api.post(`/groups/${groupId}/meetings/${meetingId}/attendance`, { attendees });
    return res.data;
  },
  getMyAttendance: async (groupId) => {
    const res = await api.get(`/groups/${groupId}/meetings/my-attendance`);
    return res.data;
  },
};
