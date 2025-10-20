import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { APP_CONFIG } from './config/app';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import leaveRoutes from './routes/leave';
import adminRoutes from './modules/admin/routes';
import managerRoutes from './modules/manager/routes';
import employeeRoutes from './modules/employee/routes';

const createApp = (): express.Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(cors({
    origin: APP_CONFIG.SERVER.CORS_ORIGINS,
    credentials: true
  }));

  // Rate limiting - Very lenient for development
  const limiter = rateLimit({
    windowMs: APP_CONFIG.RATE_LIMIT.WINDOW_MS,
    max: APP_CONFIG.RATE_LIMIT.MAX_REQUESTS,
    message: APP_CONFIG.RATE_LIMIT.MESSAGE,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for localhost in development
      return req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1';
    }
  });
  app.use(limiter);

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware
  app.use(compression());

  // Logging middleware
  app.use(morgan('combined'));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: APP_CONFIG.SERVER.NODE_ENV
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/leaves', leaveRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/manager', managerRoutes);
  app.use('/api/employee', employeeRoutes);

  // Error handling middleware
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
