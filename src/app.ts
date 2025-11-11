import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { auditMiddleware } from './middleware/auditMiddleware';
import { securityHeaders, enforceHTTPS, requestId } from './middleware/securityMiddleware';
import { authenticateToken } from './middleware/auth';
import { APP_CONFIG } from './config/app';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import leaveRoutes from './routes/leave';
import adminRoutes from './modules/admin/routes';
import managerRoutes from './modules/manager/routes';
import employeeRoutes from './modules/employee/routes';
import workspaceRoutes from './modules/workspace/routes';
import boardRoutes from './modules/board/routes';
import commentRoutes from './modules/comment/routes';
import fileRoutes from './modules/file/routes';
import approvalRoutes from './modules/approval/routes';
import automationRoutes from './modules/automation/routes';
import aiRoutes from './modules/ai/routes';
import permissionRoutes from './modules/permission/routes';
import auditRoutes from './modules/audit/routes';
import backupRoutes from './modules/backup/routes';
import dashboardRoutes from './modules/dashboard/routes';
import reportRoutes from './modules/report/routes';
import templateRoutes from './modules/template/routes';
import currencyRoutes from './modules/board/routes/currency';
import invoiceTemplateRoutes from './modules/invoice/routes';
import notificationRoutes from './modules/notification/routes';
import analyticsRoutes from './modules/analytics/routes';
import customizationRoutes from './modules/customization/routes';

const createApp = (): express.Application => {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(securityHeaders);
  app.use(requestId);
  app.use(enforceHTTPS);
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

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: APP_CONFIG.SERVER.NODE_ENV
    });
  });

  // Audit middleware - apply to authenticated routes
  // Note: This should be applied after routes that need authentication
  // We'll apply it selectively to routes that need auditing

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/leaves', leaveRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/manager', managerRoutes);
  app.use('/api/employee', employeeRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/boards', boardRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/files', fileRoutes);
  app.use('/api/approvals', approvalRoutes);
  app.use('/api/automations', automationRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/permissions', permissionRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/backup', backupRoutes);
  app.use('/api/dashboards', dashboardRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api', templateRoutes);
  app.use('/api/currency', currencyRoutes);
  app.use('/api/invoice-templates', invoiceTemplateRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/customization', customizationRoutes);

  // Error handling middleware
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

export default createApp;
