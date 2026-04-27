import mongoose from 'mongoose';

/**
 * Connects to MongoDB once per process.
 * Uses strictQuery for predictable filter behavior.
 */
export async function connectDb() {
  mongoose.set('strictQuery', true);
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in environment');
  }
  await mongoose.connect(uri);
  return mongoose.connection;
}
