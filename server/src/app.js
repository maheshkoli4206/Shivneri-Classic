import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import residentRoutes from './routes/residentRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import cashbookRoutes from './routes/cashbookRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import verifyCsrfHeader, { getAllowedOrigins } from './middleware/csrfMiddleware.js';
import { notFoundHandler, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Trust first proxy in production or Vercel serverless environment (enables secure cookies behind reverse proxy)
if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
  app.set('trust proxy', 1);
}

// Security HTTP headers
app.use(helmet());

// CORS Configuration supporting validated origins list and Vercel domains
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. server-to-server health checks or same-origin browser fetches)
    if (!origin) {
      return callback(null, true);
    }
    const normalized = origin.trim().replace(/\/+$/, '').toLowerCase();
    const allowed = getAllowedOrigins();
    if (allowed.includes(normalized) || (Boolean(process.env.VERCEL) && normalized.endsWith('.vercel.app'))) {
      return callback(null, true);
    }
    // Deny origin smoothly without crashing; downstream csrfMiddleware handles 403
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie Parser for HttpOnly JWT session tokens
app.use(cookieParser());

// Global Rate Limiter for general API endpoints: 2000 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'खूप जास्त विनंत्या पाठवल्या आहेत. कृपया १५ मिनिटांनी पुन्हा प्रयत्न करा. (Too many requests, please try again later.)'
  }
});

app.use('/api', apiLimiter);

// Anti-CSRF Header & Origin Check on mutating requests
app.use('/api', verifyCsrfHeader);

// API Routes
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/residents', residentRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/cashbook', cashbookRoutes);
app.use('/api/v1/reports', reportRoutes);

// Root and API index routes
app.get(['/', '/api', '/api/v1'], (req, res) => {
  res.status(200).json({
    success: true,
    message: 'शिवनेरी क्लासिक अपार्टमेंट (ए विंग) व्यवस्थापन API चालू आहे. (Shivneri Classic Apartment Management API is active.)',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      residents: '/api/v1/residents',
      maintenance: '/api/v1/maintenance',
      payments: '/api/v1/payments',
      expenses: '/api/v1/expenses',
      cashbook: '/api/v1/cashbook',
      reports: '/api/v1/reports'
    }
  });
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
