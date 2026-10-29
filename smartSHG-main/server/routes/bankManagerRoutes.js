const express = require("express");
const router = express.Router();
const {
  listGroupsForReview,
  listLoansForReview,
  getLoanForReview,
  submitBankReview,
  bankApproveLoan,
  bankRejectLoan,
  getBankManagerDashboard,
} = require("../controllers/bankManagerController");
const { verifyToken } = require("../middleware/authMiddleware");

// Middleware: Bank Manager only
const requireBankManager = (req, res, next) => {
  if (!req.user || req.user.role !== "BANK_MANAGER") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Bank Manager authorization required.",
    });
  }
  next();
};

router.use(verifyToken, requireBankManager);

router.get("/dashboard", getBankManagerDashboard);
router.get("/groups", listGroupsForReview);
router.get("/loans", listLoansForReview);
router.get("/loans/:loanId", getLoanForReview);
router.put("/loans/:loanId/review", submitBankReview);
router.put("/loans/:loanId/approve", bankApproveLoan);
router.put("/loans/:loanId/reject", bankRejectLoan);

module.exports = router;
