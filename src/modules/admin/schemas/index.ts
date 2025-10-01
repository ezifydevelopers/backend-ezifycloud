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
  position: Joi.string().required(),
  role: Joi.string().valid('admin', 'manager', 'employee').required(),
  managerId: Joi.string().optional().allow(null),
  password: Joi.string().min(6).required(),
  bio: Joi.string().optional().allow(''),
  skills: Joi.array().items(Joi.string()).optional(),
});

export const updateEmployeeSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional().allow(''),
  department: Joi.string().optional(),
  position: Joi.string().optional(),
  role: Joi.string().valid('admin', 'manager', 'employee').optional(),
  managerId: Joi.string().optional().allow(null),
  bio: Joi.string().optional().allow(''),
  skills: Joi.array().items(Joi.string()).optional(),
});

export const toggleEmployeeStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
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

export const bulkUpdateLeaveRequestsSchema = Joi.object({
  requestIds: Joi.array().items(Joi.string()).min(1).required(),
  status: Joi.string().valid('approved', 'rejected').required(),
  comments: Joi.string().optional().allow(''),
});

// Leave Policy Schemas
export const createLeavePolicySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().optional().allow(''),
  leaveType: Joi.string().required(),
  maxDays: Joi.number().integer().min(1).required(),
  carryForwardDays: Joi.number().integer().min(0).default(0),
  requiresApproval: Joi.boolean().default(true),
  advanceNoticeDays: Joi.number().integer().min(0).default(0),
  maxConsecutiveDays: Joi.number().integer().min(1).required(),
  applicableRoles: Joi.array().items(Joi.string().valid('admin', 'manager', 'employee')).required(),
  applicableDepartments: Joi.array().items(Joi.string()).required(),
});

export const updateLeavePolicySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().optional().allow(''),
  leaveType: Joi.string().optional(),
  maxDays: Joi.number().integer().min(1).optional(),
  carryForwardDays: Joi.number().integer().min(0).optional(),
  requiresApproval: Joi.boolean().optional(),
  advanceNoticeDays: Joi.number().integer().min(0).optional(),
  maxConsecutiveDays: Joi.number().integer().min(1).optional(),
  applicableRoles: Joi.array().items(Joi.string().valid('admin', 'manager', 'employee')).optional(),
  applicableDepartments: Joi.array().items(Joi.string()).optional(),
  isActive: Joi.boolean().optional(),
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

// Settings Schemas
export const companySettingsSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional().allow(''),
  address: Joi.string().optional().allow(''),
  website: Joi.string().uri().optional().allow(''),
  logo: Joi.string().uri().optional().allow(''),
  timezone: Joi.string().required(),
});

export const leaveSettingsSchema = Joi.object({
  defaultAnnualLeave: Joi.number().integer().min(0).required(),
  defaultSickLeave: Joi.number().integer().min(0).required(),
  defaultCasualLeave: Joi.number().integer().min(0).required(),
  allowCarryForward: Joi.boolean().required(),
  maxCarryForwardDays: Joi.number().integer().min(0).required(),
  requireManagerApproval: Joi.boolean().required(),
  allowHalfDayLeave: Joi.boolean().required(),
  maxConsecutiveDays: Joi.number().integer().min(1).required(),
  advanceNoticeDays: Joi.number().integer().min(0).required(),
});

export const notificationSettingsSchema = Joi.object({
  emailNotifications: Joi.boolean().required(),
  smsNotifications: Joi.boolean().required(),
  pushNotifications: Joi.boolean().required(),
  notifyOnNewRequest: Joi.boolean().required(),
  notifyOnApproval: Joi.boolean().required(),
  notifyOnRejection: Joi.boolean().required(),
  notifyOnReminder: Joi.boolean().required(),
  notifyOnSystemUpdate: Joi.boolean().required(),
});

export const securitySettingsSchema = Joi.object({
  sessionTimeout: Joi.number().integer().min(5).max(1440).required(),
  requireTwoFactor: Joi.boolean().required(),
  passwordExpiry: Joi.number().integer().min(30).max(365).required(),
  maxLoginAttempts: Joi.number().integer().min(3).max(10).required(),
  lockoutDuration: Joi.number().integer().min(5).max(60).required(),
  enableAuditLogs: Joi.boolean().required(),
  dataRetentionDays: Joi.number().integer().min(30).max(2555).required(),
});

export const systemConfigSettingsSchema = Joi.object({
  maintenanceMode: Joi.boolean().required(),
  autoBackup: Joi.boolean().required(),
  backupFrequency: Joi.string().valid('hourly', 'daily', 'weekly', 'monthly').required(),
  logRetentionDays: Joi.number().integer().min(30).max(2555).required(),
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
  id: Joi.string().uuid().required(),
});

export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
});

// Export all schemas for easy access
export const adminSchemas = {
  employeeFilters: employeeFiltersSchema,
  createEmployee: createEmployeeSchema,
  updateEmployee: updateEmployeeSchema,
  toggleEmployeeStatus: toggleEmployeeStatusSchema,
  leaveRequestFilters: leaveRequestFiltersSchema,
  updateLeaveRequestStatus: updateLeaveRequestStatusSchema,
  bulkUpdateLeaveRequests: bulkUpdateLeaveRequestsSchema,
  createLeavePolicy: createLeavePolicySchema,
  updateLeavePolicy: updateLeavePolicySchema,
  reportFilters: reportFiltersSchema,
  auditLogFilters: auditLogFiltersSchema,
  companySettings: companySettingsSchema,
  leaveSettings: leaveSettingsSchema,
  notificationSettings: notificationSettingsSchema,
  securitySettings: securitySettingsSchema,
  systemConfigSettings: systemConfigSettingsSchema,
  dashboardStats: dashboardStatsSchema,
  idParam: idParamSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
};
