import Joi from 'joi';

// Employee Management Schemas
export const employeeFiltersSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  department: Joi.string().optional().allow(''),
  role: Joi.string().valid('admin', 'manager', 'employee').optional(),
  status: Joi.string().valid('active', 'inactive', 'all').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const createEmployeeSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional().allow(''),
  department: Joi.string().required(),
  role: Joi.string().valid('admin', 'manager', 'employee').required(),
  managerId: Joi.string().optional().allow(null),
  password: Joi.string().min(6).required(),
  bio: Joi.string().optional().allow(''),
  employeeType: Joi.string().valid('onshore', 'offshore').optional().allow(null),
  region: Joi.string().optional().allow(null, ''),
  timezone: Joi.string().optional().allow(null, ''),
});

export const updateEmployeeSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional().allow(''),
  employeeId: Joi.string().min(3).max(20).regex(/^[A-Za-z0-9_-]+$/).optional().allow(null, ''),
  department: Joi.string().optional(),
  position: Joi.string().optional(),
  role: Joi.string().valid('admin', 'manager', 'employee').optional(),
  managerId: Joi.string().optional().allow(null),
  bio: Joi.string().optional().allow(''),
  avatar: Joi.string().uri().optional().allow(''),
  employeeType: Joi.string().valid('onshore', 'offshore').optional().allow(null),
  region: Joi.string().optional().allow(null, ''),
  timezone: Joi.string().optional().allow(null, ''),
  joinDate: Joi.date().iso().optional().allow(null),
  probationStatus: Joi.string().valid('active', 'completed', 'extended', 'terminated').optional().allow(null),
});

export const toggleEmployeeStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

export const bulkUpdateEmployeeStatusSchema = Joi.object({
  employeeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  isActive: Joi.boolean().required(),
});

export const bulkDeleteEmployeesSchema = Joi.object({
  employeeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

export const bulkUpdateEmployeeDepartmentSchema = Joi.object({
  employeeIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  department: Joi.string().min(1).required(),
});

export const adjustLeaveBalanceSchema = Joi.object({
  leaveType: Joi.string().valid('annual', 'sick', 'casual', 'maternity', 'paternity', 'emergency').required(),
  additionalDays: Joi.number().integer().min(1).max(365).required(),
  reason: Joi.string().min(5).max(500).required(),
});

// Leave Request Management Schemas
export const leaveRequestFiltersSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'all').optional(),
  leaveType: Joi.string().optional().allow(''),
  department: Joi.string().optional().allow(''),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const updateLeaveRequestStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  comments: Joi.string().optional().allow(''),
});

export const updateLeaveRequestPaidStatusSchema = Joi.object({
  isPaid: Joi.boolean().required(),
  comments: Joi.string().optional().allow(''),
});

export const bulkUpdateLeaveRequestsSchema = Joi.object({
  requestIds: Joi.array().items(Joi.string()).min(1).required(),
  status: Joi.string().valid('approved', 'rejected').required(),
  comments: Joi.string().optional().allow(''),
});

// Leave Policy Schemas
export const leavePolicyFiltersSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  status: Joi.string().valid('all', 'active', 'inactive').default('all'),
  leaveType: Joi.string().optional().allow(''),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const createLeavePolicySchema = Joi.object({
  leaveType: Joi.string().min(2).max(100).required(),
  description: Joi.string().optional().allow(''),
  totalDaysPerYear: Joi.number().integer().min(1).required(),
  canCarryForward: Joi.boolean().default(false),
  maxCarryForwardDays: Joi.number().integer().min(0).allow(null).optional(),
  requiresApproval: Joi.boolean().default(true),
  allowHalfDay: Joi.boolean().default(true),
});

export const updateLeavePolicySchema = Joi.object({
  leaveType: Joi.string().min(2).max(100).optional(),
  description: Joi.string().optional().allow(''),
  totalDaysPerYear: Joi.number().integer().min(1).optional(),
  canCarryForward: Joi.boolean().optional(),
  maxCarryForwardDays: Joi.number().integer().min(0).allow(null).optional(),
  requiresApproval: Joi.boolean().optional(),
  allowHalfDay: Joi.boolean().optional(),
});

export const toggleLeavePolicyStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

export const bulkUpdateLeavePoliciesSchema = Joi.object({
  policyIds: Joi.array().items(Joi.string()).min(1).required(),
  updates: Joi.object({
    isActive: Joi.boolean().optional(),
    requiresApproval: Joi.boolean().optional(),
    requiresDocumentation: Joi.boolean().optional(),
  }).required(),
});

// Reports Schemas
export const reportFiltersSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  department: Joi.string().optional().allow(''),
  leaveType: Joi.string().optional().allow(''),
  status: Joi.string().optional().allow(''),
  format: Joi.string().valid('pdf', 'excel', 'csv').default('pdf'),
});

// Audit Log Schemas
export const auditLogFiltersSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  action: Joi.string().optional().allow(''),
  userId: Joi.string().optional().allow(''),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const createAuditLogSchema = Joi.object({
  action: Joi.string().required(),
  description: Joi.string().required(),
  userId: Joi.string().required(),
  ipAddress: Joi.string().optional().allow(''),
  userAgent: Joi.string().optional().allow(''),
  metadata: Joi.object().optional(),
});

export const auditLogStatsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

export const userActivitySummarySchema = Joi.object({
  userId: Joi.string().required(),
  days: Joi.number().integer().min(1).max(365).default(30),
});

export const systemActivitySummarySchema = Joi.object({
  days: Joi.number().integer().min(1).max(365).default(30),
});

export const exportAuditLogsSchema = Joi.object({
  format: Joi.string().valid('csv', 'excel', 'pdf').default('csv'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  action: Joi.string().optional().allow(''),
  userId: Joi.string().optional().allow(''),
});

// Settings Schemas
export const companySettingsSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().allow(''),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().optional().allow(''),
  address: Joi.string().optional().allow(''),
  website: Joi.string().uri().optional().allow(''),
  logo: Joi.string().uri().optional().allow(''),
  timezone: Joi.string().optional().allow(''),
  dateFormat: Joi.string().optional().allow(''),
  currency: Joi.string().optional().allow(''),
  language: Joi.string().optional().allow(''),
}).min(1); // At least one field must be provided

export const leaveSettingsSchema = Joi.object({
  defaultLeaveDays: Joi.number().integer().min(0).optional(),
  maxLeaveDays: Joi.number().integer().min(0).optional(),
  carryForwardDays: Joi.number().integer().min(0).optional(),
  maxCarryForwardDays: Joi.number().integer().min(0).optional(),
  requireManagerApproval: Joi.boolean().optional(),
  allowHalfDayLeave: Joi.boolean().optional(),
  maxConsecutiveDays: Joi.number().integer().min(1).optional(),
  advanceNoticeDays: Joi.number().integer().min(0).optional(),
});

export const notificationSettingsSchema = Joi.object({
  emailNotifications: Joi.boolean().optional(),
  smsNotifications: Joi.boolean().optional(),
  pushNotifications: Joi.boolean().optional(),
  notifyOnNewRequest: Joi.boolean().optional(),
  notifyOnApproval: Joi.boolean().optional(),
  notifyOnRejection: Joi.boolean().optional(),
  notifyOnReminder: Joi.boolean().optional(),
  notifyOnSystemUpdate: Joi.boolean().optional(),
});

export const securitySettingsSchema = Joi.object({
  sessionTimeout: Joi.number().integer().min(5).max(1440).optional(),
  requireTwoFactor: Joi.boolean().optional(),
  passwordExpiry: Joi.number().integer().min(30).max(365).optional(),
  maxLoginAttempts: Joi.number().integer().min(3).max(10).optional(),
  lockoutDuration: Joi.number().integer().min(5).max(60).optional(),
  enableAuditLogs: Joi.boolean().optional(),
  dataRetentionDays: Joi.number().integer().min(30).max(2555).optional(),
});

export const systemConfigSettingsSchema = Joi.object({
  maintenanceMode: Joi.boolean().optional(),
  autoBackup: Joi.boolean().optional(),
  backupFrequency: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').optional(),
  logRetentionDays: Joi.number().integer().min(30).max(2555).optional(),
  systemVersion: Joi.string().optional(),
  lastUpdate: Joi.string().optional(),
  defaultProbationDuration: Joi.number().integer().min(30).max(365).optional(),
});

// Dashboard Schemas
export const dashboardStatsSchema = Joi.object({
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }).optional(),
  department: Joi.string().optional().allow(''),
});

// Common Schemas
export const idParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
});

// Holiday schemas
const createHolidaySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  date: Joi.date().iso().required(),
  type: Joi.string().valid('public', 'company', 'religious', 'national').required(),
  isRecurring: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
});

const updateHolidaySchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  date: Joi.date().iso().optional(),
  type: Joi.string().valid('public', 'company', 'religious', 'national').optional(),
  isRecurring: Joi.boolean().optional(),
  isActive: Joi.boolean().optional(),
});

const holidayQuerySchema = Joi.object({
  type: Joi.string().valid('all', 'public', 'company', 'religious', 'national').default('all'),
  year: Joi.alternatives().try(
    Joi.string().valid('all'),
    Joi.string().pattern(/^\d{4}$/)
  ).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  page: Joi.number().integer().min(1).default(1),
});

const toggleHolidayStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

// Export all schemas for easy access
export const adminSchemas = {
  employeeFilters: employeeFiltersSchema,
  createEmployee: createEmployeeSchema,
  updateEmployee: updateEmployeeSchema,
  toggleEmployeeStatus: toggleEmployeeStatusSchema,
  bulkUpdateEmployeeStatus: bulkUpdateEmployeeStatusSchema,
  bulkDeleteEmployees: bulkDeleteEmployeesSchema,
  bulkUpdateEmployeeDepartment: bulkUpdateEmployeeDepartmentSchema,
  adjustLeaveBalanceSchema: adjustLeaveBalanceSchema,
  leaveRequestFilters: leaveRequestFiltersSchema,
  updateLeaveRequestStatus: updateLeaveRequestStatusSchema,
  updateLeaveRequestPaidStatus: updateLeaveRequestPaidStatusSchema,
  bulkUpdateLeaveRequests: bulkUpdateLeaveRequestsSchema,
  leavePolicyFilters: leavePolicyFiltersSchema,
  createLeavePolicy: createLeavePolicySchema,
  updateLeavePolicy: updateLeavePolicySchema,
  toggleLeavePolicyStatus: toggleLeavePolicyStatusSchema,
  bulkUpdateLeavePolicies: bulkUpdateLeavePoliciesSchema,
  reportFilters: reportFiltersSchema,
  auditLogFilters: auditLogFiltersSchema,
  createAuditLog: createAuditLogSchema,
  auditLogStats: auditLogStatsSchema,
  userActivitySummary: userActivitySummarySchema,
  systemActivitySummary: systemActivitySummarySchema,
  exportAuditLogs: exportAuditLogsSchema,
  companySettings: companySettingsSchema,
  leaveSettings: leaveSettingsSchema,
  notificationSettings: notificationSettingsSchema,
  securitySettings: securitySettingsSchema,
  systemConfigSettings: systemConfigSettingsSchema,
  dashboardStats: dashboardStatsSchema,
  idParam: idParamSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
  createHoliday: createHolidaySchema,
  updateHoliday: updateHolidaySchema,
  holidayQuery: holidayQuerySchema,
  toggleHolidayStatus: toggleHolidayStatusSchema,
  
  // Salary Management Schemas
  salaryQuery: Joi.object({
    year: Joi.number().integer().min(2020).max(2030).optional(),
    month: Joi.number().integer().min(1).max(12).optional(),
  }),
  
  generateSalarySchema: Joi.object({
    year: Joi.number().integer().min(2020).max(2030).required(),
    month: Joi.number().integer().min(1).max(12).required(),
  }),
  
  approveSalarySchema: Joi.object({
    notes: Joi.string().optional().allow(''),
  }),
  
  createEmployeeSalarySchema: Joi.object({
    userId: Joi.string().required(),
    baseSalary: Joi.number().positive().required(),
    hourlyRate: Joi.number().positive().optional(),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').default('USD'),
    effectiveDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().optional(),
    isActive: Joi.boolean().default(true),
  }),
  
  updateEmployeeSalarySchema: Joi.object({
    baseSalary: Joi.number().positive().optional(),
    hourlyRate: Joi.number().positive().optional(),
    currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').optional(),
    effectiveDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    isActive: Joi.boolean().optional(),
  }),
};
