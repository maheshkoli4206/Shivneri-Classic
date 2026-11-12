import mongoose from 'mongoose';

/**
 * Global connection cache for Serverless environments (e.g. Vercel, AWS Lambda)
 * Reuses existing active MongoDB connections across function invocations,
 * preventing connection pool exhaustion on MongoDB Atlas.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB Atlas (Cloud) or local MongoDB instance.
 * Automatically resolves connection URI from:
 * 1. process.env.MONGODB_URI
 * 2. process.env.DATABASE_URL
 */
export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || process.env.DATABASE_URL;

  if (!mongoURI) {
    const errorMsg = 'MONGODB_URI / DATABASE_URL पर्यावरण व्हेरिएबल आढळले नाही (MONGODB_URI or DATABASE_URL environment variable is missing)';
    console.error(`❌ Database Configuration Error: ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // Return existing active connection if already connected (Serverless Warm Start)
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    mongoose.set('strictQuery', true);

    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

    const opts = {
      autoIndex: process.env.NODE_ENV !== 'production' || process.env.AUTO_INDEX === 'true',
      serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds if cloud cluster is unreachable
      socketTimeoutMS: 45000,
      maxPoolSize: isServerless ? 10 : 50, // Controlled pool size for serverless functions
    };

    cached.promise = mongoose.connect(mongoURI, opts).then((mongooseInstance) => {
      console.log(`✅ MongoDB Connected successfully to database: "${mongooseInstance.connection.name}" on host: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null; // Clear promise cache on failure to allow subsequent retries
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
      // For standalone CLI scripts, exit on fatal connection error
      // In serverless, throw so the HTTP error handler can respond
      throw error;
    }
    throw error;
  }
};

// Listen to connection lifecycle events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 MongoDB connection reconnected.');
});

export default connectDB;
