import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

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
    origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:5173'],
    credentials: true
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
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
      environment: process.env.NODE_ENV
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
