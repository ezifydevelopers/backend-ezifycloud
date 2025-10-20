import dotenv from 'dotenv';
import createApp from './app';
import prisma from './lib/prisma';
import { APP_CONFIG } from './config/app';
import { validateEnvironment } from './lib/envValidation';

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
    
    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database connections...');
  await prisma.$disconnect();
  console.log('✅ Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Closing database connections...');
  await prisma.$disconnect();
  console.log('✅ Database connections closed');
  process.exit(0);
});

startServer();
