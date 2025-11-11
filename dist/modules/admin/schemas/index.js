"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSchemas = exports.dateRangeSchema = exports.paginationSchema = exports.idParamSchema = exports.dashboardStatsSchema = exports.systemConfigSettingsSchema = exports.securitySettingsSchema = exports.notificationSettingsSchema = exports.leaveSettingsSchema = exports.companySettingsSchema = exports.exportAuditLogsSchema = exports.systemActivitySummarySchema = exports.userActivitySummarySchema = exports.auditLogStatsSchema = exports.createAuditLogSchema = exports.auditLogFiltersSchema = exports.reportFiltersSchema = exports.bulkUpdateLeavePoliciesSchema = exports.toggleLeavePolicyStatusSchema = exports.updateLeavePolicySchema = exports.createLeavePolicySchema = exports.leavePolicyFiltersSchema = exports.bulkUpdateLeaveRequestsSchema = exports.updateLeaveRequestStatusSchema = exports.leaveRequestFiltersSchema = exports.bulkUpdateEmployeeDepartmentSchema = exports.bulkDeleteEmployeesSchema = exports.bulkUpdateEmployeeStatusSchema = exports.toggleEmployeeStatusSchema = exports.updateEmployeeSchema = exports.createEmployeeSchema = exports.employeeFiltersSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.employeeFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().optional().allow(''),
    department: joi_1.default.string().optional().allow(''),
    role: joi_1.default.string().valid('admin', 'manager', 'employee').optional(),
    status: joi_1.default.string().valid('active', 'inactive', 'all').optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('asc'),
});
exports.createEmployeeSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required(),
    email: joi_1.default.string().email().required(),
    phone: joi_1.default.string().optional().allow(''),
    department: joi_1.default.string().required(),
    role: joi_1.default.string().valid('admin', 'manager', 'employee').required(),
    managerId: joi_1.default.string().optional().allow(null),
    password: joi_1.default.string().min(6).required(),
    bio: joi_1.default.string().optional().allow(''),
});
exports.updateEmployeeSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).optional(),
    email: joi_1.default.string().email().optional(),
    phone: joi_1.default.string().optional().allow(''),
    department: joi_1.default.string().optional(),
    position: joi_1.default.string().optional(),
    role: joi_1.default.string().valid('admin', 'manager', 'employee').optional(),
    managerId: joi_1.default.string().optional().allow(null),
    bio: joi_1.default.string().optional().allow(''),
    avatar: joi_1.default.string().uri().optional().allow(''),
});
exports.toggleEmployeeStatusSchema = joi_1.default.object({
    isActive: joi_1.default.boolean().required(),
});
exports.bulkUpdateEmployeeStatusSchema = joi_1.default.object({
    employeeIds: joi_1.default.array().items(joi_1.default.string().uuid()).min(1).required(),
    isActive: joi_1.default.boolean().required(),
});
exports.bulkDeleteEmployeesSchema = joi_1.default.object({
    employeeIds: joi_1.default.array().items(joi_1.default.string().uuid()).min(1).required(),
});
exports.bulkUpdateEmployeeDepartmentSchema = joi_1.default.object({
    employeeIds: joi_1.default.array().items(joi_1.default.string().uuid()).min(1).required(),
    department: joi_1.default.string().min(1).required(),
});
exports.leaveRequestFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().valid('pending', 'approved', 'rejected', 'all').optional(),
    leaveType: joi_1.default.string().optional().allow(''),
    department: joi_1.default.string().optional().allow(''),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
});
exports.updateLeaveRequestStatusSchema = joi_1.default.object({
    status: joi_1.default.string().valid('approved', 'rejected').required(),
    comments: joi_1.default.string().optional().allow(''),
});
exports.bulkUpdateLeaveRequestsSchema = joi_1.default.object({
    requestIds: joi_1.default.array().items(joi_1.default.string()).min(1).required(),
    status: joi_1.default.string().valid('approved', 'rejected').required(),
    comments: joi_1.default.string().optional().allow(''),
});
exports.leavePolicyFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().valid('all', 'active', 'inactive').default('all'),
    leaveType: joi_1.default.string().optional().allow(''),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
});
exports.createLeavePolicySchema = joi_1.default.object({
    leaveType: joi_1.default.string().min(2).max(100).required(),
    description: joi_1.default.string().optional().allow(''),
    totalDaysPerYear: joi_1.default.number().integer().min(1).required(),
    canCarryForward: joi_1.default.boolean().default(false),
    maxCarryForwardDays: joi_1.default.number().integer().min(0).allow(null).optional(),
    requiresApproval: joi_1.default.boolean().default(true),
    allowHalfDay: joi_1.default.boolean().default(true),
});
exports.updateLeavePolicySchema = joi_1.default.object({
    leaveType: joi_1.default.string().min(2).max(100).optional(),
    description: joi_1.default.string().optional().allow(''),
    totalDaysPerYear: joi_1.default.number().integer().min(1).optional(),
    canCarryForward: joi_1.default.boolean().optional(),
    maxCarryForwardDays: joi_1.default.number().integer().min(0).allow(null).optional(),
    requiresApproval: joi_1.default.boolean().optional(),
    allowHalfDay: joi_1.default.boolean().optional(),
});
exports.toggleLeavePolicyStatusSchema = joi_1.default.object({
    isActive: joi_1.default.boolean().required(),
});
exports.bulkUpdateLeavePoliciesSchema = joi_1.default.object({
    policyIds: joi_1.default.array().items(joi_1.default.string()).min(1).required(),
    updates: joi_1.default.object({
        isActive: joi_1.default.boolean().optional(),
        requiresApproval: joi_1.default.boolean().optional(),
        requiresDocumentation: joi_1.default.boolean().optional(),
    }).required(),
});
exports.reportFiltersSchema = joi_1.default.object({
    startDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().required(),
    department: joi_1.default.string().optional().allow(''),
    leaveType: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().optional().allow(''),
    format: joi_1.default.string().valid('pdf', 'excel', 'csv').default('pdf'),
});
exports.auditLogFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().optional().allow(''),
    action: joi_1.default.string().optional().allow(''),
    userId: joi_1.default.string().optional().allow(''),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
});
exports.createAuditLogSchema = joi_1.default.object({
    action: joi_1.default.string().required(),
    description: joi_1.default.string().required(),
    userId: joi_1.default.string().required(),
    ipAddress: joi_1.default.string().optional().allow(''),
    userAgent: joi_1.default.string().optional().allow(''),
    metadata: joi_1.default.object().optional(),
});
exports.auditLogStatsSchema = joi_1.default.object({
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
});
exports.userActivitySummarySchema = joi_1.default.object({
    userId: joi_1.default.string().required(),
    days: joi_1.default.number().integer().min(1).max(365).default(30),
});
exports.systemActivitySummarySchema = joi_1.default.object({
    days: joi_1.default.number().integer().min(1).max(365).default(30),
});
exports.exportAuditLogsSchema = joi_1.default.object({
    format: joi_1.default.string().valid('csv', 'excel', 'pdf').default('csv'),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    action: joi_1.default.string().optional().allow(''),
    userId: joi_1.default.string().optional().allow(''),
});
exports.companySettingsSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).optional().allow(''),
    email: joi_1.default.string().email().optional().allow(''),
    phone: joi_1.default.string().optional().allow(''),
    address: joi_1.default.string().optional().allow(''),
    website: joi_1.default.string().uri().optional().allow(''),
    logo: joi_1.default.string().uri().optional().allow(''),
    timezone: joi_1.default.string().optional().allow(''),
    dateFormat: joi_1.default.string().optional().allow(''),
    currency: joi_1.default.string().optional().allow(''),
    language: joi_1.default.string().optional().allow(''),
}).min(1);
exports.leaveSettingsSchema = joi_1.default.object({
    defaultLeaveDays: joi_1.default.number().integer().min(0).optional(),
    maxLeaveDays: joi_1.default.number().integer().min(0).optional(),
    carryForwardDays: joi_1.default.number().integer().min(0).optional(),
    maxCarryForwardDays: joi_1.default.number().integer().min(0).optional(),
    requireManagerApproval: joi_1.default.boolean().optional(),
    allowHalfDayLeave: joi_1.default.boolean().optional(),
    maxConsecutiveDays: joi_1.default.number().integer().min(1).optional(),
    advanceNoticeDays: joi_1.default.number().integer().min(0).optional(),
});
exports.notificationSettingsSchema = joi_1.default.object({
    emailNotifications: joi_1.default.boolean().optional(),
    smsNotifications: joi_1.default.boolean().optional(),
    pushNotifications: joi_1.default.boolean().optional(),
    notifyOnNewRequest: joi_1.default.boolean().optional(),
    notifyOnApproval: joi_1.default.boolean().optional(),
    notifyOnRejection: joi_1.default.boolean().optional(),
    notifyOnReminder: joi_1.default.boolean().optional(),
    notifyOnSystemUpdate: joi_1.default.boolean().optional(),
});
exports.securitySettingsSchema = joi_1.default.object({
    sessionTimeout: joi_1.default.number().integer().min(5).max(1440).optional(),
    requireTwoFactor: joi_1.default.boolean().optional(),
    passwordExpiry: joi_1.default.number().integer().min(30).max(365).optional(),
    maxLoginAttempts: joi_1.default.number().integer().min(3).max(10).optional(),
    lockoutDuration: joi_1.default.number().integer().min(5).max(60).optional(),
    enableAuditLogs: joi_1.default.boolean().optional(),
    dataRetentionDays: joi_1.default.number().integer().min(30).max(2555).optional(),
});
exports.systemConfigSettingsSchema = joi_1.default.object({
    maintenanceMode: joi_1.default.boolean().optional(),
    autoBackup: joi_1.default.boolean().optional(),
    backupFrequency: joi_1.default.string().valid('hourly', 'daily', 'weekly', 'monthly').optional(),
    logRetentionDays: joi_1.default.number().integer().min(30).max(2555).optional(),
    systemVersion: joi_1.default.string().optional(),
    lastUpdate: joi_1.default.string().optional(),
});
exports.dashboardStatsSchema = joi_1.default.object({
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso().optional(),
        endDate: joi_1.default.date().iso().optional(),
    }).optional(),
    department: joi_1.default.string().optional().allow(''),
});
exports.idParamSchema = joi_1.default.object({
    id: joi_1.default.string().required(),
});
exports.paginationSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
});
exports.dateRangeSchema = joi_1.default.object({
    startDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().required(),
});
const createHolidaySchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).required(),
    description: joi_1.default.string().max(500).optional().allow(''),
    date: joi_1.default.date().iso().required(),
    type: joi_1.default.string().valid('public', 'company', 'religious', 'national').required(),
    isRecurring: joi_1.default.boolean().default(false),
    isActive: joi_1.default.boolean().default(true),
});
const updateHolidaySchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).optional(),
    description: joi_1.default.string().max(500).optional().allow(''),
    date: joi_1.default.date().iso().optional(),
    type: joi_1.default.string().valid('public', 'company', 'religious', 'national').optional(),
    isRecurring: joi_1.default.boolean().optional(),
    isActive: joi_1.default.boolean().optional(),
});
const holidayQuerySchema = joi_1.default.object({
    type: joi_1.default.string().valid('all', 'public', 'company', 'religious', 'national').default('all'),
    year: joi_1.default.alternatives().try(joi_1.default.string().valid('all'), joi_1.default.string().pattern(/^\d{4}$/)).optional(),
    limit: joi_1.default.number().integer().min(1).max(100).default(50),
    page: joi_1.default.number().integer().min(1).default(1),
});
const toggleHolidayStatusSchema = joi_1.default.object({
    isActive: joi_1.default.boolean().required(),
});
exports.adminSchemas = {
    employeeFilters: exports.employeeFiltersSchema,
    createEmployee: exports.createEmployeeSchema,
    updateEmployee: exports.updateEmployeeSchema,
    toggleEmployeeStatus: exports.toggleEmployeeStatusSchema,
    bulkUpdateEmployeeStatus: exports.bulkUpdateEmployeeStatusSchema,
    bulkDeleteEmployees: exports.bulkDeleteEmployeesSchema,
    bulkUpdateEmployeeDepartment: exports.bulkUpdateEmployeeDepartmentSchema,
    leaveRequestFilters: exports.leaveRequestFiltersSchema,
    updateLeaveRequestStatus: exports.updateLeaveRequestStatusSchema,
    bulkUpdateLeaveRequests: exports.bulkUpdateLeaveRequestsSchema,
    leavePolicyFilters: exports.leavePolicyFiltersSchema,
    createLeavePolicy: exports.createLeavePolicySchema,
    updateLeavePolicy: exports.updateLeavePolicySchema,
    toggleLeavePolicyStatus: exports.toggleLeavePolicyStatusSchema,
    bulkUpdateLeavePolicies: exports.bulkUpdateLeavePoliciesSchema,
    reportFilters: exports.reportFiltersSchema,
    auditLogFilters: exports.auditLogFiltersSchema,
    createAuditLog: exports.createAuditLogSchema,
    auditLogStats: exports.auditLogStatsSchema,
    userActivitySummary: exports.userActivitySummarySchema,
    systemActivitySummary: exports.systemActivitySummarySchema,
    exportAuditLogs: exports.exportAuditLogsSchema,
    companySettings: exports.companySettingsSchema,
    leaveSettings: exports.leaveSettingsSchema,
    notificationSettings: exports.notificationSettingsSchema,
    securitySettings: exports.securitySettingsSchema,
    systemConfigSettings: exports.systemConfigSettingsSchema,
    dashboardStats: exports.dashboardStatsSchema,
    idParam: exports.idParamSchema,
    pagination: exports.paginationSchema,
    dateRange: exports.dateRangeSchema,
    createHoliday: createHolidaySchema,
    updateHoliday: updateHolidaySchema,
    holidayQuery: holidayQuerySchema,
    toggleHolidayStatus: toggleHolidayStatusSchema,
    salaryQuery: joi_1.default.object({
        year: joi_1.default.number().integer().min(2020).max(2030).optional(),
        month: joi_1.default.number().integer().min(1).max(12).optional(),
    }),
    generateSalarySchema: joi_1.default.object({
        year: joi_1.default.number().integer().min(2020).max(2030).required(),
        month: joi_1.default.number().integer().min(1).max(12).required(),
    }),
    approveSalarySchema: joi_1.default.object({
        notes: joi_1.default.string().optional().allow(''),
    }),
    createEmployeeSalarySchema: joi_1.default.object({
        userId: joi_1.default.string().required(),
        baseSalary: joi_1.default.number().positive().required(),
        hourlyRate: joi_1.default.number().positive().optional(),
        currency: joi_1.default.string().valid('USD', 'EUR', 'GBP', 'INR').default('USD'),
        effectiveDate: joi_1.default.date().iso().required(),
        endDate: joi_1.default.date().iso().optional(),
        isActive: joi_1.default.boolean().default(true),
    }),
    updateEmployeeSalarySchema: joi_1.default.object({
        baseSalary: joi_1.default.number().positive().optional(),
        hourlyRate: joi_1.default.number().positive().optional(),
        currency: joi_1.default.string().valid('USD', 'EUR', 'GBP', 'INR').optional(),
        effectiveDate: joi_1.default.date().iso().optional(),
        endDate: joi_1.default.date().iso().optional(),
        isActive: joi_1.default.boolean().optional(),
    }),
};
//# sourceMappingURL=index.js.map