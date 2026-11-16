import api from "./api";

export const notificationService = {
  async listNotifications() {
    const response = await api.get("/notifications");
    return response.data;
  },

  async getNotifications() {
    const response = await api.get("/notifications");
    return response.data;
  },

  async markAsRead(id) {
    // Backend uses PUT, not PATCH
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
    // Backend uses PUT, not PATCH
    const response = await api.put("/notifications/read-all");
    return response.data;
  }
};