/**
 * Health Check Controller
 * Confirms API server status without exposing any secrets, environment variables, or database state.
 */
export const getHealth = (req, res) => {
  return res.status(200).json({
    status: 'ok',
    success: true,
    service: 'Shivneri Classic Apartment Management API',
    wing: 'A Wing',
    location: 'Panchavati, Nashik',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
};

