import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas (or local isolated MongoDB instance)
 * Database: shivneri_classic_admin_db
 */
export const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGODB_URI पर्यावरण व्हेरिएबल आढळले नाही (MONGODB_URI environment variable is missing)');
  }

  try {
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(mongoURI, {
      autoIndex: true, // Ensure indexes (including singletonKey unique constraint) are built
    });

    console.log(`✅ MongoDB Connected successfully to database: "${conn.connection.name}" on host: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
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

