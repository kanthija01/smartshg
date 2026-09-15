import api from "./api";

export const notificationService = {
  async getNotifications() {
    const response = await api.get("/notifications");
    return response.data;
  },

  async markAsRead(id) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead() {
    const response = await api.patch("/notifications/read-all");
    return response.data;
  }
};