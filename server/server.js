import 'dotenv/config';
import connectDB from './src/config/db.js';
import app from './src/app.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🏛️  शिवनेरी क्लासिक अपार्टमेंट - ए विंग (नाशिक)`);
      console.log(`🚀 API Server running on port: ${PORT}`);
      console.log(`🩺 Health endpoint: http://localhost:${PORT}/api/v1/health`);
      console.log(`🔐 Admin Auth endpoints active at: http://localhost:${PORT}/api/v1/auth`);
      console.log(`=======================================================`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => console.log('HTTP server closed'));
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received: closing HTTP server');
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;
