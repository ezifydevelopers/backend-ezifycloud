// Centralized configuration for the backend application
// This file contains all configurable values that were previously hardcoded

export const APP_CONFIG = {
  // Server Configuration
  SERVER: {
    PORT: parseInt(process.env.PORT || '9001'),
    NODE_ENV: process.env.NODE_ENV || 'development',
    CORS_ORIGINS: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
      : ['http://localhost:3000'],
  },

  // Database Configuration
  DATABASE: {
    URL: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/ezify_cloud?schema=public',
  },

  // JWT Configuration
  JWT: {
    SECRET: process.env.JWT_SECRET || 'f3d29a7c01d64a86bb912c2f8d9fa4c67b82f1e6a07c25a14a7e0c639c37d2c5',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // Rate Limiting
  RATE_LIMIT: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5000'),
    MESSAGE: 'Too many requests from this IP, please try again later.',
  },

  // File Upload
  UPLOAD: {
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '5242880'), // 5MB
    PATH: process.env.UPLOAD_PATH || './uploads',
  },

  // Email Configuration
  EMAIL: {
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: parseInt(process.env.EMAIL_PORT || '587'),
    USER: process.env.EMAIL_USER || 'your_email@gmail.com',
    PASS: process.env.EMAIL_PASS || 'your_app_password',
  },

  // Business Logic Configuration
  BUSINESS: {
    // Default departments
    DEPARTMENTS: [
      'Engineering',
      'Human Resources',
      'Marketing',
      'Sales',
      'Finance',
      'Operations',
      'Customer Support',
      'IT',
    ],

    // User roles
    USER_ROLES: [
      'employee',
      'manager',
      'admin',
    ],

    // Leave types
    LEAVE_TYPES: [
      'annual',
      'sick',
      'casual',
      'maternity',
      'paternity',
      'emergency',
    ],

    // Leave statuses
    LEAVE_STATUSES: [
      'pending',
      'approved',
      'rejected',
      'escalated',
    ],

    // Default values
    DEFAULTS: {
      DEPARTMENT: 'Engineering',
      ROLE: 'employee',
      LEAVE_TYPE: 'annual',
      STATUS: 'pending',
    },
  },

  // Company Information
  COMPANY: {
    DEFAULT_NAME: 'Ezify Cloud',
    DEFAULT_EMAIL: 'info@ezify.com',
    DEFAULT_PHONE: '+1234567890',
    DEFAULT_ADDRESS: '123 Business St, City, State 12345',
    DEFAULT_WEBSITE: 'https://ezifycloud.com',
    DEFAULT_LOGO: 'https://example.com/logo.png',
    DEFAULT_TIMEZONE: 'UTC',
    DEFAULT_DATE_FORMAT: 'YYYY-MM-DD',
  },

  // Dashboard and Statistics
  DASHBOARD: {
    // Default limits for queries
    DEFAULT_LIMITS: {
      RECENT_ACTIVITIES: 10,
      NOTIFICATIONS: 10,
      UPCOMING_LEAVES: 10,
      TEAM_MEMBERS: 10,
    },

    // Performance metrics
    PERFORMANCE: {
      SCALE: {
        MIN: 1,
        MAX: 10,
        DEFAULT: 7.5,
      },
    },

    // Default values for missing data
    DEFAULT_VALUES: {
      MANAGER_NAME: 'No Manager',
      DEPARTMENT: 'Engineering',
      UNKNOWN_USER: 'Unknown User',
      PROJECT_MANAGER: 'Project Manager',
      TEAM_LEAD: 'Team Lead',
    },
  },

  // Time and Date Calculations
  TIME: {
    MILLISECONDS: {
      MINUTE: 60 * 1000,
      HOUR: 60 * 60 * 1000,
      DAY: 24 * 60 * 60 * 1000,
      WEEK: 7 * 24 * 60 * 60 * 1000,
      MONTH: 30 * 24 * 60 * 60 * 1000,
      YEAR: 365 * 24 * 60 * 60 * 1000,
    },

    DAYS: {
      REVIEW_PERIOD: 90,
      NOTIFICATION_DAYS: 2,
      ACHIEVEMENT_DAYS: 15,
      PROJECT_DAYS: 30,
      TRAINING_DAYS: 60,
    },
  },

  // Security Settings
  SECURITY: {
    PASSWORD: {
      MIN_LENGTH: 6,
      REQUIRE_UPPERCASE: true,
      REQUIRE_LOWERCASE: true,
      REQUIRE_NUMBERS: true,
      REQUIRE_SPECIAL_CHARS: false,
    },

    SESSION: {
      TIMEOUT: 30 * 60 * 1000, // 30 minutes
    },
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
  },

  // Sample Data for Development
  SAMPLE_DATA: {
    USERS: {
      ADMIN: {
        name: 'Admin User',
        email: 'admin@ezify.com',
        role: 'admin',
        department: 'IT',
      },
      MANAGER: {
        name: 'John Manager',
        email: 'manager@ezify.com',
        role: 'manager',
        department: 'Engineering',
      },
      EMPLOYEE: {
        name: 'Jane Employee',
        email: 'employee@ezify.com',
        role: 'employee',
        department: 'Engineering',
      },
    },
    HOLIDAYS: [
      {
        name: 'Independence Day',
        date: new Date('2024-07-04'),
        type: 'national',
        isRecurring: true,
      },
      {
        name: 'Christmas Day',
        date: new Date('2024-12-25'),
        type: 'national',
        isRecurring: true,
      },
      {
        name: 'Company Anniversary',
        date: new Date('2024-01-15'),
        type: 'company',
        isRecurring: true,
      },
    ],
  },

  // API Response Messages
  MESSAGES: {
    SUCCESS: {
      USER_CREATED: 'User created successfully',
      USER_UPDATED: 'User updated successfully',
      USER_DELETED: 'User deleted successfully',
      LEAVE_CREATED: 'Leave request created successfully',
      LEAVE_UPDATED: 'Leave request updated successfully',
      LEAVE_APPROVED: 'Leave request approved',
      LEAVE_REJECTED: 'Leave request rejected',
      SETTINGS_UPDATED: 'Settings updated successfully',
    },
    ERROR: {
      USER_NOT_FOUND: 'User not found',
      LEAVE_NOT_FOUND: 'Leave request not found',
      UNAUTHORIZED: 'Unauthorized access',
      FORBIDDEN: 'Access forbidden',
      VALIDATION_FAILED: 'Validation failed',
      INTERNAL_ERROR: 'Internal server error',
    },
  },
} as const;

// Helper functions for common operations
export const getDepartmentLabel = (value: string): string => {
  return APP_CONFIG.BUSINESS.DEPARTMENTS.find(dept => dept === value) || value;
};

export const getRoleLabel = (value: string): string => {
  const roleMap: Record<string, string> = {
    employee: 'Employee',
    manager: 'Manager',
    admin: 'Administrator',
  };
  return roleMap[value] || value;
};

export const getLeaveTypeLabel = (value: string): string => {
  const typeMap: Record<string, string> = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    casual: 'Casual Leave',
    maternity: 'Maternity Leave',
    paternity: 'Paternity Leave',
    emergency: 'Emergency Leave',
  };
  return typeMap[value] || value;
};

export const getStatusLabel = (value: string): string => {
  const statusMap: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    escalated: 'Escalated',
  };
  return statusMap[value] || value;
};

// Export individual sections for easier imports
export const {
  SERVER,
  DATABASE,
  JWT,
  RATE_LIMIT,
  UPLOAD,
  EMAIL,
  BUSINESS,
  COMPANY,
  DASHBOARD,
  TIME,
  SECURITY,
  PAGINATION,
  SAMPLE_DATA,
  MESSAGES,
} = APP_CONFIG;
