import 'dotenv/config';
import app from './src/app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🏛️  शिवनेरी क्लासिक अपार्टमेंट - ए विंग (नाशिक)`);
  console.log(`🚀 API Server running on port: ${PORT}`);
  console.log(`🩺 Health endpoint: http://localhost:${PORT}/api/v1/health`);
  console.log(`⚠️  Phase 2 Scaffolding: Database connection intentionally deferred`);
  console.log(`=======================================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default server;
