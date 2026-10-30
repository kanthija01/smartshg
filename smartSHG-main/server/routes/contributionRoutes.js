const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  getMyContribution,
  getContributionSummary,
  recordOfflinePayment,
  listContributions,
} = require("../controllers/contributionController");
const {
  createContributionOrder,
  verifyContributionPayment,
} = require("../controllers/paymentController");
const { verifyToken, verifyGroupMembership, requireHead } = require("../middleware/authMiddleware");

// Under /api/groups/:groupId/contributions
router.get("/my-contribution", verifyToken, verifyGroupMembership, getMyContribution);
router.get("/summary", verifyToken, verifyGroupMembership, requireHead, getContributionSummary);
router.get("/", verifyToken, verifyGroupMembership, listContributions);
router.post(
  "/:contributionId/record-payment",
  verifyToken,
  verifyGroupMembership,
  requireHead,
  recordOfflinePayment
);
router.post(
  "/:contributionId/create-order",
  verifyToken,
  verifyGroupMembership,
  createContributionOrder
);
router.post(
  "/:contributionId/verify-payment",
  verifyToken,
  verifyGroupMembership,
  verifyContributionPayment
);

module.exports = router;
