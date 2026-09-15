const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroupDetails,
  updateGroup,
  getGroupStats,
  getMyGroups,
} = require('../controllers/groupController');
const { verifyToken, requireHead, verifyGroupMembership } = require('../middleware/authMiddleware');

router.get('/my-groups', verifyToken, getMyGroups);
router.post('/', verifyToken, createGroup);
router.get('/:groupId', verifyToken, verifyGroupMembership, getGroupDetails);
router.put('/:groupId', verifyToken, verifyGroupMembership, requireHead, updateGroup);
router.get('/:groupId/stats', verifyToken, verifyGroupMembership, getGroupStats);

module.exports = router;
