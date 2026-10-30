const crypto = require("crypto");
const MonthlyContribution = require("../models/MonthlyContribution");
const Savings = require("../models/Savings");
const Member = require("../models/Member");
const Group = require("../models/Group");
const { recordTransaction } = require("../services/ledgerService");
const { logAudit } = require("../services/auditService");
const { createNotification } = require("../services/notificationService");
const {
  RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET,
} = require("../config/env");

/**
 * Lazily create a Razorpay instance.
 * If credentials are not configured, operations fall back gracefully.
 */
let razorpayInstance = null;
function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file."
    );
  }
  const Razorpay = require("razorpay");
  razorpayInstance = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
  return razorpayInstance;
}

/**
 * @desc  Create a Razorpay TEST order for a monthly contribution
 * @route POST /api/groups/:groupId/contributions/:contributionId/create-order
 */
const createContributionOrder = async (req, res, next) => {
  try {
    const { contributionId } = req.params;

    const contribution = await MonthlyContribution.findById(contributionId).populate("memberId");
    if (!contribution) {
      return res.status(404).json({ success: false, message: "Contribution record not found." });
    }

    // IDOR: member can only pay their own contribution
    if (req.user.role === "MEMBER" && contribution.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only pay your own contribution." });
    }

    if (contribution.status === "PAID") {
      return res.status(400).json({ success: false, message: "This month's contribution is already fully paid." });
    }

    const amountToPay = Math.round(contribution.pendingBalance * 100); // Razorpay uses paise
    if (amountToPay <= 0) {
      return res.status(400).json({ success: false, message: "No pending balance to pay." });
    }

    const rzp = getRazorpay();
    const order = await rzp.orders.create({
      amount: amountToPay,
      currency: "INR",
      receipt: `CONT-${contribution._id.toString().slice(-8)}-${Date.now()}`,
      notes: {
        groupId: contribution.groupId.toString(),
        memberId: contribution.memberId._id.toString(),
        contributionId: contribution._id.toString(),
        period: contribution.period,
        type: "MONTHLY_CONTRIBUTION",
      },
    });

    // Record the payment attempt
    contribution.paymentAttempts.push({
      razorpayOrderId: order.id,
      amount: contribution.pendingBalance,
      status: "CREATED",
      attemptedAt: new Date(),
    });
    await contribution.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      contributionId: contribution._id,
      period: contribution.period,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Verify Razorpay payment signature after checkout success and update contribution
 * @route POST /api/groups/:groupId/contributions/:contributionId/verify-payment
 */
const verifyContributionPayment = async (req, res, next) => {
  try {
    const { contributionId } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment details incomplete. Cannot verify." });
    }

    // Signature verification
    const hmac = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest("hex");

    if (expectedSignature !== razorpay_signature) {
      // Mark attempt as failed
      const contribution = await MonthlyContribution.findById(contributionId);
      if (contribution) {
        const attempt = contribution.paymentAttempts.find(
          (a) => a.razorpayOrderId === razorpay_order_id
        );
        if (attempt) {
          attempt.status = "FAILED";
          attempt.failureReason = "Signature mismatch";
        }
        await contribution.save();
      }
      return res.status(400).json({ success: false, message: "Payment signature verification failed. Transaction not recorded." });
    }

    // Fetch payment details from Razorpay to get actual amount and method
    const rzp = getRazorpay();
    const payment = await rzp.payments.fetch(razorpay_payment_id);

    if (payment.status !== "captured") {
      return res.status(400).json({
        success: false,
        message: `Payment not captured. Status: ${payment.status}`,
      });
    }

    const paidAmountRupees = payment.amount / 100; // Convert paise to rupees

    const contribution = await MonthlyContribution.findById(contributionId).populate({
      path: "memberId",
      populate: { path: "userId", select: "name phone email" },
    });
    if (!contribution) {
      return res.status(404).json({ success: false, message: "Contribution record not found." });
    }

    // Duplicate payment guard
    const alreadyCaptured = contribution.paymentAttempts.find(
      (a) => a.razorpayPaymentId === razorpay_payment_id && a.status === "CAPTURED"
    );
    if (alreadyCaptured) {
      return res.status(409).json({ success: false, message: "This payment has already been recorded." });
    }

    // Update the attempt record
    const attempt = contribution.paymentAttempts.find(
      (a) => a.razorpayOrderId === razorpay_order_id
    );
    if (attempt) {
      attempt.razorpayPaymentId = razorpay_payment_id;
      attempt.razorpaySignature = razorpay_signature;
      attempt.status = "CAPTURED";
      attempt.paymentMethod = payment.method;
      attempt.verifiedAt = new Date();
    }

    // Update contribution balances
    const group = await require("../models/Group").findById(contribution.groupId);
    contribution.amountPaid = Math.round((contribution.amountPaid + paidAmountRupees) * 100) / 100;
    contribution.pendingBalance = Math.max(
      0,
      Math.round((contribution.totalPayable - contribution.amountPaid) * 100) / 100
    );
    if (contribution.pendingBalance === 0) {
      contribution.status = "PAID";
    } else if (contribution.amountPaid > 0) {
      contribution.status = "PARTIAL";
    }

    // Create a verified Savings record
    const receiptNumber = `RCP-SAV-RZP-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const txId = `TXN-SAV-RZP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const finTx = await recordTransaction({
      groupId: contribution.groupId,
      transactionType: "SAVINGS_COLLECTION",
      category: "Member Monthly Savings",
      description: `Online payment for monthly savings ${contribution.period} by ${contribution.memberId.userId.name}`,
      amount: paidAmountRupees,
      paymentMethod: "ONLINE",
      sourceAccount: "EXTERNAL",
      destinationAccount: "BANK",
      memberId: contribution.memberId._id,
      reference: razorpay_payment_id,
      createdBy: req.user._id,
    });

    const savings = await Savings.create({
      transactionId: txId,
      receiptNumber,
      groupId: contribution.groupId,
      memberId: contribution.memberId._id,
      userId: contribution.userId,
      period: contribution.period,
      amount: paidAmountRupees,
      paymentMethod: "ONLINE",
      status: "COMPLETED",
      date: new Date(),
      recordedBy: req.user._id,
      notes: `Razorpay TEST payment. Order: ${razorpay_order_id}`,
      financialTransactionId: finTx._id,
    });

    contribution.savingsRecords.push(savings._id);

    // Update member total savings
    await Member.findByIdAndUpdate(contribution.memberId._id, {
      $inc: { totalSavings: paidAmountRupees },
    });

    await contribution.save();

    await logAudit({
      groupId: contribution.groupId,
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: "SAVINGS_RECORDED",
      targetModel: "MonthlyContribution",
      targetId: contribution._id,
      amount: paidAmountRupees,
      description: `Razorpay payment of Rs${paidAmountRupees} verified for ${contribution.period}. PaymentId: ${razorpay_payment_id}`,
      reference: receiptNumber,
    });

    await createNotification({
      userId: contribution.userId,
      groupId: contribution.groupId,
      title: { en: "Payment Successful", te: "చెల్లింపు విజయవంతమైంది" },
      message: {
        en: `Your payment of Rs${paidAmountRupees} for ${contribution.period} is confirmed. Receipt: ${receiptNumber}`,
        te: `${contribution.period} కి Rs${paidAmountRupees} చెల్లింపు నిర్ధారించబడింది. రసీదు: ${receiptNumber}`,
      },
      type: "SAVINGS_RECORDED",
      link: "/contributions",
    });

    res.json({
      success: true,
      message: "Payment verified and savings recorded successfully.",
      contribution,
      receiptNumber,
      amountPaid: paidAmountRupees,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Handle Razorpay webhook events (payment.captured, payment.failed)
 * @route POST /api/payments/webhook
 */
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSignature = req.headers["x-razorpay-signature"];
    if (!webhookSignature || !RAZORPAY_WEBHOOK_SECRET) {
      return res.status(400).json({ success: false, message: "Webhook secret not configured." });
    }

    const hmac = crypto.createHmac("sha256", RAZORPAY_WEBHOOK_SECRET);
    hmac.update(req.rawBody || "");
    const expectedSig = hmac.digest("hex");

    if (expectedSig !== webhookSignature) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature." });
    }

    const event = req.body;
    // Only handling payment.failed for now (captures are verified client-side)
    if (event.event === "payment.failed") {
      const orderId = event.payload?.payment?.entity?.order_id;
      if (orderId) {
        const contribution = await MonthlyContribution.findOne({
          "paymentAttempts.razorpayOrderId": orderId,
        });
        if (contribution) {
          const attempt = contribution.paymentAttempts.find((a) => a.razorpayOrderId === orderId);
          if (attempt && attempt.status === "CREATED") {
            attempt.status = "FAILED";
            attempt.failureReason = event.payload?.payment?.entity?.error_description || "Payment failed";
            await contribution.save();
          }
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { createContributionOrder, verifyContributionPayment, handleWebhook };
