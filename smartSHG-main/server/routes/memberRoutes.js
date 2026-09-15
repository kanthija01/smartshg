const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  listMembers,
  getMemberDetails,
  addMemberByHead,
  joinGroupRequest,
  approveMember,
  rejectMember,
  updateMemberProfile,
} = require('../controllers/memberController');
const {
  verifyToken,
  requireHead,
  verifyGroupMembership,
  verifyResourceOwnership,
} = require('../middleware/authMiddleware');

// Group membership join request (open to authenticated users)
router.post('/join', verifyToken, joinGroupRequest);

// Endpoints scoped under /api/groups/:groupId/members
router.get('/', verifyToken, verifyGroupMembership, listMembers);
router.post('/', verifyToken, verifyGroupMembership, requireHead, addMemberByHead);
router.get('/:memberId', verifyToken, verifyGroupMembership, verifyResourceOwnership('memberId'), getMemberDetails);
router.put('/:memberId/approve', verifyToken, verifyGroupMembership, requireHead, approveMember);
router.put('/:memberId/reject', verifyToken, verifyGroupMembership, requireHead, rejectMember);
router.put('/:memberId', verifyToken, verifyGroupMembership, requireHead, updateMemberProfile);

module.exports = router;
