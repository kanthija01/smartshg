const Meeting = require('../models/Meeting');
const Attendance = require('../models/Attendance');
const Member = require('../models/Member');
const { logAudit } = require('../services/auditService');
const { notifyGroupMembers } = require('../services/notificationService');

// @desc    Create a new SHG meeting (HEAD only)
// @route   POST /api/groups/:groupId/meetings
const createMeeting = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { title, meetingDate, time, location, agenda, notes, actionItems } = req.body;

    if (!title || !meetingDate || !time || !location || !agenda) {
      return res.status(400).json({ success: false, message: 'All meeting fields (title, date, time, location, agenda) are required.' });
    }

    const meeting = await Meeting.create({
      groupId,
      title,
      meetingDate: new Date(meetingDate),
      time,
      location,
      agenda,
      notes,
      actionItems: actionItems || [],
      createdBy: req.user._id,
    });

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'MEETING_SCHEDULED',
      targetModel: 'Meeting',
      targetId: meeting._id,
      description: `Scheduled meeting "${title}" for ${new Date(meetingDate).toLocaleDateString('en-IN')}`,
      reference: title,
      req,
    });

    // Notify all active members
    await notifyGroupMembers({
      groupId,
      title: { en: 'New Meeting Scheduled', te: 'కొత్త సమావేశం షెడ్యూల్ చేయబడింది' },
      message: {
        en: `SHG meeting "${title}" scheduled on ${new Date(meetingDate).toLocaleDateString('en-IN')} at ${time}. Location: ${location}`,
        te: `స్వయం సహాయక సంఘ సమావేశం "${title}" ${new Date(meetingDate).toLocaleDateString('en-IN')} న ${time} గంటలకు షెడ్యూల్ చేయబడింది. స్థలం: ${location}`,
      },
      type: 'MEETING_REMINDER',
      link: `/meetings`,
      excludeUserId: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Meeting scheduled and group members notified.',
      meeting,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    List meetings for a group (upcoming & past)
// @route   GET /api/groups/:groupId/meetings
const listMeetings = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const filter = { groupId };
    if (status) filter.status = status;

    const total = await Meeting.countDocuments(filter);
    const meetings = await Meeting.find(filter)
      .populate('createdBy', 'name')
      .sort({ meetingDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      count: total,
      page: Number(page),
      totalPages: Math.ceil(total / limit) || 1,
      meetings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get meeting details along with recorded attendance
// @route   GET /api/groups/:groupId/meetings/:meetingId
const getMeetingDetails = async (req, res, next) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findById(meetingId).populate('createdBy', 'name');
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found.' });
    }

    const attendanceRecords = await Attendance.find({ meetingId })
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'name phone' },
      })
      .populate('recordedBy', 'name');

    res.json({
      success: true,
      meeting,
      attendance: attendanceRecords,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record or update attendance for meeting (HEAD only)
// @route   POST /api/groups/:groupId/meetings/:meetingId/attendance
const recordMeetingAttendance = async (req, res, next) => {
  try {
    const { meetingId, groupId } = req.params;
    const { attendees } = req.body; // Array of { memberId, status: 'PRESENT'|'ABSENT'|'LATE', fineAmount, notes }

    if (!Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ success: false, message: 'Attendees array is required.' });
    }

    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found.' });
    }

    const bulkOps = attendees.map((att) => ({
      updateOne: {
        filter: { meetingId, memberId: att.memberId },
        update: {
          $set: {
            groupId,
            status: att.status || 'PRESENT',
            fineAmount: Number(att.fineAmount) || 0,
            notes: att.notes || '',
            recordedBy: req.user._id,
          },
        },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(bulkOps);

    meeting.status = 'COMPLETED';
    await meeting.save();

    await logAudit({
      groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ATTENDANCE_RECORDED',
      targetModel: 'Meeting',
      targetId: meeting._id,
      description: `Attendance recorded for meeting "${meeting.title}" (${attendees.length} members)`,
      req,
    });

    res.json({
      success: true,
      message: 'Attendance recorded successfully.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get member's own attendance records
// @route   GET /api/groups/:groupId/meetings/my-attendance
const getMemberAttendanceHistory = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const member = await Member.findOne({ groupId, userId: req.user._id });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member profile not found.' });
    }

    const attendanceRecords = await Attendance.find({ memberId: member._id })
      .populate('meetingId', 'title meetingDate time location')
      .sort({ createdAt: -1 });

    const presentCount = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const totalCount = attendanceRecords.length;
    const attendancePercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 100;

    res.json({
      success: true,
      summary: {
        totalMeetings: totalCount,
        presentCount,
        absentCount: attendanceRecords.filter((a) => a.status === 'ABSENT').length,
        lateCount: attendanceRecords.filter((a) => a.status === 'LATE').length,
        attendancePercentage,
      },
      records: attendanceRecords,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMeeting,
  listMeetings,
  getMeetingDetails,
  recordMeetingAttendance,
  getMemberAttendanceHistory,
};
