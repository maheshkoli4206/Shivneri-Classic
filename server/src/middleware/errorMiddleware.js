/**
 * Centralized Error Handling Middleware
 */

export const notFoundHandler = (req, res, next) => {
  const error = new Error(`मार्ग सापडला नाही (Route Not Found) - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'अंतर्गत सर्व्हर त्रुटी (Internal Server Error)',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
