/**
 * Hardened Anti-CSRF Middleware
 * 1. Verifies custom request header 'X-Requested-With: XMLHttpRequest' for state-mutating HTTP methods.
 * 2. Explicitly verifies Origin and Referer headers against the configured allowed frontend origin.
 */
export const verifyCsrfHeader = (req, res, next) => {
  const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

  if (mutatingMethods.includes(req.method)) {
    // 1. Verify custom request header
    const requestedWith = req.headers['x-requested-with'];
    if (!requestedWith || requestedWith.toLowerCase() !== 'xmlhttprequest') {
      return res.status(403).json({
        success: false,
        message: 'सुरक्षा पडताळणी अयशस्वी: आवश्यक सुरक्षा हेडर आढळले नाही (CSRF validation failed: Missing or invalid X-Requested-With header)'
      });
    }

    // 2. Strict Origin / Referer Validation against configured frontend origin
    const configuredOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
    const normalizedAllowedOrigin = configuredOrigin.replace(/\/+$/, '').toLowerCase();

    const requestOrigin = req.headers['origin'];
    if (requestOrigin) {
      const normalizedRequestOrigin = requestOrigin.replace(/\/+$/, '').toLowerCase();
      if (normalizedRequestOrigin !== normalizedAllowedOrigin) {
        return res.status(403).json({
          success: false,
          message: 'सुरक्षा पडताळणी अयशस्वी: अनधिकृत मूळ स्रोत (CSRF validation failed: Unauthorized request origin)'
        });
      }
    } else {
      // If Origin is not sent (some browsers on same-origin POST), check Referer
      const requestReferer = req.headers['referer'];
      if (requestReferer) {
        try {
          const refererUrl = new URL(requestReferer);
          const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`.toLowerCase();
          if (refererOrigin !== normalizedAllowedOrigin) {
            return res.status(403).json({
              success: false,
              message: 'सुरक्षा पडताळणी अयशस्वी: अनधिकृत संदर्भ स्रोत (CSRF validation failed: Unauthorized referer origin)'
            });
          }
        } catch {
          return res.status(403).json({
            success: false,
            message: 'सुरक्षा पडताळणी अयशस्वी: अवैध संदर्भ स्रोत (CSRF validation failed: Malformed referer)'
          });
        }
      }
    }
  }

  next();
};

export default verifyCsrfHeader;
