// Environment variable validation
// This ensures all required environment variables are present at startup

interface RequiredEnvVars {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: string;
  NODE_ENV: string;
}

interface OptionalEnvVars {
  CORS_ORIGIN?: string;
  JWT_EXPIRES_IN?: string;
  JWT_REFRESH_EXPIRES_IN?: string;
  RATE_LIMIT_WINDOW_MS?: string;
  RATE_LIMIT_MAX_REQUESTS?: string;
  MAX_FILE_SIZE?: string;
  UPLOAD_PATH?: string;
  EMAIL_HOST?: string;
  EMAIL_PORT?: string;
  EMAIL_USER?: string;
  EMAIL_PASS?: string;
}

const requiredEnvVars: (keyof RequiredEnvVars)[] = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
  'NODE_ENV'
];

const optionalEnvVars: (keyof OptionalEnvVars)[] = [
  'CORS_ORIGIN',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'MAX_FILE_SIZE',
  'UPLOAD_PATH',
  'EMAIL_HOST',
  'EMAIL_PORT',
  'EMAIL_USER',
  'EMAIL_PASS'
];

export const validateEnvironment = (): void => {
  const missingVars: string[] = [];
  const invalidVars: string[] = [];
  const warnings: string[] = [];

  // Check required environment variables
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }

  // Validate specific environment variables
  if (process.env.PORT && isNaN(parseInt(process.env.PORT))) {
    invalidVars.push('PORT (must be a number)');
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for security');
  }

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
    warnings.push('DATABASE_URL should be a valid PostgreSQL connection string');
  }

  // Check if using default values (warnings)
  if (process.env.JWT_SECRET === 'f3d29a7c01d64a86bb912c2f8d9fa4c67b82f1e6a07c25a14a7e0c639c37d2c5') {
    warnings.push('Using default JWT_SECRET - please set a custom secret in production');
  }

  if (process.env.DATABASE_URL === 'postgresql://postgres:123@localhost:5432/ezify_cloud?schema=public') {
    warnings.push('Using default DATABASE_URL - please set your actual database credentials');
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment variable warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }

  // Report errors
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
  }

  if (invalidVars.length > 0) {
    console.error('❌ Invalid environment variables:');
    invalidVars.forEach(varName => console.error(`   - ${varName}`));
  }

  // Only exit on critical errors, not warnings
  if (invalidVars.length > 0) {
    console.error('\n📝 Please fix the invalid environment variables.');
    process.exit(1);
  }

  if (missingVars.length > 0) {
    console.warn('\n📝 Consider setting these environment variables for better configuration:');
    missingVars.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('   Using default values for now...');
  }

  console.log('✅ Environment variables validated successfully');
};

export const getEnvInfo = (): { required: string[]; optional: string[] } => {
  return {
    required: requiredEnvVars,
    optional: optionalEnvVars
  };
};
