const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  createMeeting,
  listMeetings,
  getMeetingDetails,
  recordMeetingAttendance,
  getMemberAttendanceHistory,
} = require('../controllers/meetingController');
const {
  verifyToken,
  requireHead,
  verifyGroupMembership,
} = require('../middleware/authMiddleware');

// Endpoints under /api/groups/:groupId/meetings
router.post('/', verifyToken, verifyGroupMembership, requireHead, createMeeting);
router.get('/', verifyToken, verifyGroupMembership, listMeetings);
router.get('/my-attendance', verifyToken, verifyGroupMembership, getMemberAttendanceHistory);
router.get('/:meetingId', verifyToken, verifyGroupMembership, getMeetingDetails);
router.post('/:meetingId/attendance', verifyToken, verifyGroupMembership, requireHead, recordMeetingAttendance);

module.exports = router;
