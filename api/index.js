import connectDB from '../server/src/config/db.js';
import app from '../server/src/app.js';

/**
 * Vercel Serverless Function entry point.
 * Wraps Express application and guarantees an active MongoDB Atlas connection with caching.
 */
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (error) {
    console.error('Database connection failed in serverless handler:', error.message);
    return res.status(500).json({
      success: false,
      message: 'डेटाबेस कनेक्शन अयशस्वी झाले (Cloud database connection failed)',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  return app(req, res);
}

