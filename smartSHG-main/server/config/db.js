const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    console.log(`[Database] Attempting connection to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('[Database] Connected to external MongoDB successfully.');
    return;
  } catch (err) {
    console.warn(`[Database] External MongoDB connection failed (${err.message}). Starting embedded MongoMemoryServer for zero-config run...`);
  }

  try {
    // Force MongoDB 8.0 — required for Node.js v24 compatibility
    // Must be set before MongoMemoryServer is imported/used
    process.env.MONGOMS_VERSION      = process.env.MONGOMS_VERSION      || '8.0.4';
    process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || './.mongodb-binaries';

    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create({ instance: { dbName: 'smartshg' } });
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[Database] Connected to embedded MongoDB Memory Server at: ${memoryUri}`);

    const seedDatabase = require('../scripts/seed');
    console.log('[Database] Auto-seeding embedded memory database with demo data...');
    await seedDatabase(false);
    console.log('[Database] Auto-seed complete!');
  } catch (memErr) {
    console.error('[Database] Failed to initialize embedded MongoDB:', memErr.message);
    throw memErr;
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
  if (mongoMemoryServer) await mongoMemoryServer.stop();
};

module.exports = { connectDB, disconnectDB };
