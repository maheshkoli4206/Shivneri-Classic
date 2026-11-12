/**
 * Hardened Anti-CSRF Middleware
 * 1. Verifies custom request header 'X-Requested-With: XMLHttpRequest' for state-mutating HTTP methods.
 * 2. Explicitly verifies Origin and Referer headers against the configured allowed frontend origins allowlist,
 *    supporting both custom domains and Vercel cloud deployment origins.
 */
export const getAllowedOrigins = (req) => {
  const origins = [];
  const configuredOrigin = process.env.CLIENT_ORIGIN || '';

  if (configuredOrigin) {
    configuredOrigin
      .split(',')
      .map(o => o.trim().replace(/\/+$/, '').toLowerCase())
      .filter(Boolean)
      .forEach(o => origins.push(o));
  }

  // Automatically trust Vercel system deployment URLs if deployed on Vercel
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`.toLowerCase());
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.toLowerCase());
  }

  // If no origins configured, supply local development defaults
  if (origins.length === 0) {
    origins.push('https://localhost:5443', 'http://localhost:5173', 'http://localhost:5000');
  }

  // Trust same-origin dynamically if Host header is available (e.g. unified Vercel deployment)
  if (req && req.headers && req.headers.host) {
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    origins.push(`${proto}://${req.headers.host}`.toLowerCase());
  }

  return [...new Set(origins)];
};

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

    // 2. Strict Origin / Referer Validation against configured frontend origins allowlist
    const allowedOrigins = getAllowedOrigins(req);

    const requestOrigin = req.headers['origin'];
    if (requestOrigin) {
      const normalizedRequestOrigin = requestOrigin.trim().replace(/\/+$/, '').toLowerCase();
      const isAllowed = allowedOrigins.includes(normalizedRequestOrigin) ||
        (Boolean(process.env.VERCEL) && normalizedRequestOrigin.endsWith('.vercel.app'));

      if (!isAllowed) {
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
          const isAllowed = allowedOrigins.includes(refererOrigin) ||
            (Boolean(process.env.VERCEL) && refererOrigin.endsWith('.vercel.app'));

          if (!isAllowed) {
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
