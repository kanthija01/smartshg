const express = require('express');
const cors = require('cors');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const memberRoutes = require('./routes/memberRoutes');
const savingsRoutes = require('./routes/savingsRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const loanRoutes = require('./routes/loanRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const reportRoutes = require('./routes/reportRoutes');
const schemeRoutes = require('./routes/schemeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const contributionRoutes = require('./routes/contributionRoutes');
const bankManagerRoutes = require('./routes/bankManagerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// CORS configuration
app.use(
  cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-group-id'],
  })
);

// Express JSON body parser with rawBody capture for Razorpay Webhook HMAC verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
    limit: '5mb',
  })
);
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Apply rate limiting
app.use('/api/', apiLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const secret = process.env.RAZORPAY_KEY_SECRET || '';

  const razorpayStatus = (() => {
    if (!keyId || !secret) return 'missing';
    if (keyId.includes('REPLACE_WITH') || secret.includes('REPLACE_WITH')) return 'placeholder';
    if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) return 'invalid_format';
    return keyId.startsWith('rzp_test_') ? 'test_configured' : 'live_configured';
  })();

  res.json({
    status: 'ok',
    service: 'SmartSHG Core API',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    razorpay: razorpayStatus,
    razorpayKeyPrefix: keyId ? keyId.substring(0, 12) + '...' : 'not_set',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/members', memberRoutes); // Global member actions like join
app.use('/api/groups/:groupId/members', memberRoutes);
app.use('/api/groups/:groupId/savings', savingsRoutes);
app.use('/api/groups/:groupId/ledger', ledgerRoutes);
app.use('/api/groups/:groupId/loans', loanRoutes);
app.use('/api/groups/:groupId/meetings', meetingRoutes);
app.use('/api/groups/:groupId/expenses', expenseRoutes);
app.use('/api/groups/:groupId/reports', reportRoutes);
app.use('/api/groups/:groupId/audit', auditRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/groups/:groupId/contributions', contributionRoutes);
app.use('/api/bank-manager', bankManagerRoutes);
app.use('/api/payments', paymentRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
