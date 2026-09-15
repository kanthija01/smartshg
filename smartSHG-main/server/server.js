const app = require('./app');
const { connectDB } = require('./config/db');
const { PORT } = require('./config/env');

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`[SmartSHG] Server listening on port ${PORT}`);
      console.log(`[SmartSHG] Health check at: http://localhost:${PORT}/api/health`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[SmartSHG] Received ${signal}. Closing server gracefully...`);
      server.close(async () => {
        const { disconnectDB } = require('./config/db');
        await disconnectDB();
        console.log('[SmartSHG] Database connections closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('[SmartSHG] Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
