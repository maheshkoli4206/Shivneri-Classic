/**
 * Anti-CSRF Middleware
 * Verifies custom request header for state-mutating HTTP methods (POST, PUT, PATCH, DELETE).
 * Browsers do not permit cross-site scripts or forms to send custom headers without explicit CORS preflight.
 */
export const verifyCsrfHeader = (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (mutatingMethods.includes(req.method)) {
    const requestedWith = req.headers['x-requested-with'];

    if (!requestedWith || requestedWith.toLowerCase() !== 'xmlhttprequest') {
      return res.status(403).json({
        success: false,
        message: 'सुरक्षा पडताळणी अयशस्वी (CSRF validation failed: Missing or invalid X-Requested-With header)'
      });
    }
  }

  next();
};

export default verifyCsrfHeader;

