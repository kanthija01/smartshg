const Notification = require('../models/Notification');
const Member = require('../models/Member');

/**
 * Create a single in-app notification
 */
async function createNotification({ userId, groupId, title, message, type = 'GENERAL', link = '', metadata = {} }) {
  try {
    const notification = new Notification({
      userId,
      groupId,
      title: typeof title === 'object' ? title : { en: title, te: title },
      message: typeof message === 'object' ? message : { en: message, te: message },
      type,
      link,
      metadata,
    });
    await notification.save();
    return notification;
  } catch (err) {
    console.error('[NotificationService] Error creating notification:', err.message);
  }
}

/**
 * Notify all active members in a group
 */
async function notifyGroupMembers({ groupId, title, message, type = 'GENERAL', link = '', excludeUserId = null }) {
  try {
    const members = await Member.find({ groupId, status: 'ACTIVE' }).select('userId');
    const notifications = [];

    for (const m of members) {
      if (excludeUserId && m.userId.toString() === excludeUserId.toString()) {
        continue;
      }
      notifications.push({
        userId: m.userId,
        groupId,
        title: typeof title === 'object' ? title : { en: title, te: title },
        message: typeof message === 'object' ? message : { en: message, te: message },
        type,
        link,
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }
  } catch (err) {
    console.error('[NotificationService] Error notifying group members:', err.message);
  }
}

module.exports = {
  createNotification,
  notifyGroupMembers,
};
