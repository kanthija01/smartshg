const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

let mongoMemoryServer = null;

const connectDB = async () => {
  try {
    // First try connecting to configured MONGODB_URI (e.g. local mongod or Atlas)
    console.log(`[Database] Attempting connection to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log('[Database] Connected to external MongoDB successfully.');
    return;
  } catch (err) {
    console.warn(`[Database] External MongoDB connection failed (${err.message}). Starting embedded MongoMemoryServer for zero-config run...`);
  }

  try {
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongoMemoryServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'smartshg',
      },
    });
    const memoryUri = mongoMemoryServer.getUri();
    await mongoose.connect(memoryUri);
    console.log(`[Database] Connected to embedded MongoDB Memory Server at: ${memoryUri}`);

    // Auto-seed if running on embedded memory server so it's ready out-of-the-box
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
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
};

module.exports = { connectDB, disconnectDB };
