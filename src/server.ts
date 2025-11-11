import dotenv from 'dotenv';
import { Server } from 'http';
import createApp from './app';
import prisma from './lib/prisma';
import { APP_CONFIG } from './config/app';
import { validateEnvironment } from './lib/envValidation';
import { websocketService } from './modules/websocket/services/websocketService';

// Load environment variables
dotenv.config();

// Validate environment variables before starting
validateEnvironment();

const PORT = APP_CONFIG.SERVER.PORT;

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Create Express app
    const app = createApp();
    
    // Initialize scheduled reports
    const { initializeScheduledReports } = await import('./modules/report/services/reportSchedulerService');
    await initializeScheduledReports();
    console.log('✅ Scheduled reports initialized');
    
    // Initialize automation scheduler
    const { AutomationScheduler } = await import('./modules/automation/services/automationScheduler');
    AutomationScheduler.start();
    console.log('✅ Automation scheduler started');
    
    // Initialize leave accrual scheduler
    const { startLeaveAccrualScheduler } = await import('./services/leaveAccrualScheduler');
    startLeaveAccrualScheduler();
    console.log('✅ Leave accrual scheduler started');
    
    // Initialize working days calculation scheduler
    const { startWorkingDaysScheduler } = await import('./services/workingDaysScheduler');
    startWorkingDaysScheduler();
    console.log('✅ Working days calculation scheduler started');
    
    // Start HTTP server
    const server: Server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
    
    // Initialize WebSocket server
    websocketService.initialize(server);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down gracefully...');
  
  // Shutdown WebSocket server
  websocketService.shutdown();
  
  // Stop automation scheduler
  const { AutomationScheduler } = await import('./modules/automation/services/automationScheduler');
  AutomationScheduler.stop();
  console.log('✅ Automation scheduler stopped');
  
  // Stop leave accrual scheduler
  const { stopLeaveAccrualScheduler } = await import('./services/leaveAccrualScheduler');
  stopLeaveAccrualScheduler();
  console.log('✅ Leave accrual scheduler stopped');
  
  console.log('🔄 Closing database connections...');
  await prisma.$disconnect();
  console.log('✅ Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down gracefully...');
  
  // Shutdown WebSocket server
  websocketService.shutdown();
  
  // Stop automation scheduler
  const { AutomationScheduler } = await import('./modules/automation/services/automationScheduler');
  AutomationScheduler.stop();
  console.log('✅ Automation scheduler stopped');
  
  // Stop leave accrual scheduler
  const { stopLeaveAccrualScheduler } = await import('./services/leaveAccrualScheduler');
  stopLeaveAccrualScheduler();
  console.log('✅ Leave accrual scheduler stopped');
  
  console.log('🔄 Closing database connections...');
  await prisma.$disconnect();
  console.log('✅ Database connections closed');
  process.exit(0);
});

startServer();
