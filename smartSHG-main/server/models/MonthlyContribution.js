const mongoose = require("mongoose");

const paymentAttemptSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    razorpaySignature: { type: String, trim: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["CREATED", "CAPTURED", "FAILED", "CANCELLED"],
      default: "CREATED",
    },
    paymentMethod: { type: String, trim: true },
    attemptedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date },
    failureReason: { type: String, trim: true },
  },
  { _id: true }
);

const monthlyContributionSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      index: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Period must be in YYYY-MM format"],
      index: true,
    },
    expectedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    carriedForwardAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalPayable: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID", "OVERDUE"],
      default: "PENDING",
      index: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentAttempts: [paymentAttemptSchema],
    savingsRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: "Savings" }],
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

monthlyContributionSchema.index({ memberId: 1, period: 1 }, { unique: true });
monthlyContributionSchema.index({ groupId: 1, period: 1 });

module.exports = mongoose.model("MonthlyContribution", monthlyContributionSchema);
