const mongoose = require('mongoose');

// Cache the connection promise to avoid multiple connection attempts
let cachedConnection = null;

const connectDB = async () => {
  // Return existing connection if available
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Return cached promise if connection is in progress
  if (cachedConnection) {
    return cachedConnection;
  }

  // Create new connection
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  // Connection options optimized for serverless (Vercel) and MongoDB Atlas
  const options = {
    // Server selection timeout - increased for serverless cold starts
    serverSelectionTimeoutMS: 30000, // 30 seconds (increased from 10)
    socketTimeoutMS: 45000, // 45 seconds
    connectTimeoutMS: 30000, // 30 seconds for initial connection
    
    // Connection pool settings for serverless
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 0, // Start with 0 for serverless (connections created on demand)
    
    // Retry settings
    retryWrites: true,
    retryReads: true,
    
    // Heartbeat settings - keep connection alive
    heartbeatFrequencyMS: 10000,
    
    // Additional options for MongoDB Atlas
    compressors: ['zlib'], // Enable compression
    
    // Replica set options
    replicaSet: undefined, // Let MongoDB driver auto-detect from connection string
    
    // Read preference for replica sets
    readPreference: 'primaryPreferred', // Prefer primary, fallback to secondary
    
    // TLS is automatically enabled for mongodb+srv:// connections
    // No need to explicitly set tls options
  };

  cachedConnection = mongoose.connect(process.env.MONGODB_URI, options)
    .then(() => {
      console.log('MongoDB connected successfully');
      return mongoose.connection;
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      cachedConnection = null; // Reset on error so we can retry
      
      // Don't exit in serverless environments (Vercel)
      // Only exit if running as main module (local development)
      if (require.main === module) {
        console.error('Exiting process due to MongoDB connection failure');
        process.exit(1);
      }
      
      throw err;
    });

  return cachedConnection;
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
  cachedConnection = null; // Reset cache on disconnect
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed due to app termination');
  process.exit(0);
});

module.exports = connectDB; 