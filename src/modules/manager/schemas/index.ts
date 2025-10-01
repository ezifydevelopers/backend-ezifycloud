import Joi from 'joi';

// Manager Dashboard Schemas
export const managerDashboardStatsSchema = Joi.object({
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }).optional(),
  department: Joi.string().optional().allow(''),
});

// Team Management Schemas
export const teamFiltersSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  department: Joi.string().optional().allow(''),
  role: Joi.string().valid('manager', 'employee').optional(),
  status: Joi.string().valid('active', 'inactive', 'all').optional(),
  performance: Joi.string().valid('high', 'medium', 'low', 'all').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const updateTeamMemberSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional().allow(''),
  department: Joi.string().optional(),
  position: Joi.string().optional(),
  bio: Joi.string().optional().allow(''),
  skills: Joi.array().items(Joi.string()).optional(),
  performance: Joi.object({
    overall: Joi.number().min(1).max(5).optional(),
    attendance: Joi.number().min(1).max(5).optional(),
    productivity: Joi.number().min(1).max(5).optional(),
    teamwork: Joi.number().min(1).max(5).optional(),
    communication: Joi.number().min(1).max(5).optional(),
  }).optional(),
});

export const toggleTeamMemberStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
});

// Leave Approval Schemas
export const approvalFiltersSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'all').optional(),
  leaveType: Joi.string().optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high', 'all').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const approvalActionSchema = Joi.object({
  requestId: Joi.string().uuid().required(),
  action: Joi.string().valid('approve', 'reject').required(),
  comments: Joi.string().optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
});

export const bulkApprovalActionSchema = Joi.object({
  requestIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  action: Joi.string().valid('approve', 'reject').required(),
  comments: Joi.string().optional().allow(''),
});

export const updateApprovalStatusSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  comments: Joi.string().optional().allow(''),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
});

// Team Calendar Schemas
export const calendarFiltersSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  employeeId: Joi.string().uuid().optional().allow(''),
  leaveType: Joi.string().optional().allow(''),
  status: Joi.string().optional().allow(''),
  eventType: Joi.string().valid('leave', 'holiday', 'meeting', 'event', 'all').optional(),
});

export const createCalendarEventSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid('leave', 'holiday', 'meeting', 'event').required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  allDay: Joi.boolean().default(false),
  employeeId: Joi.string().uuid().optional(),
  leaveType: Joi.string().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  color: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
});

export const updateCalendarEventSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  type: Joi.string().valid('leave', 'holiday', 'meeting', 'event').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  allDay: Joi.boolean().optional(),
  employeeId: Joi.string().uuid().optional(),
  leaveType: Joi.string().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  color: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
});

// Team Overview Schemas
export const teamOverviewFiltersSchema = Joi.object({
  department: Joi.string().optional().allow(''),
  performance: Joi.string().valid('high', 'medium', 'low', 'all').optional(),
  status: Joi.string().valid('active', 'inactive', 'all').optional(),
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }).optional(),
});

export const createTeamGoalSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional().allow(''),
  targetDate: Joi.date().iso().required(),
  assignedTo: Joi.array().items(Joi.string().uuid()).min(1).required(),
});

export const updateTeamGoalSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().optional().allow(''),
  targetDate: Joi.date().iso().optional(),
  progress: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid('not_started', 'in_progress', 'completed', 'overdue').optional(),
  assignedTo: Joi.array().items(Joi.string().uuid()).optional(),
});

// Manager Settings Schemas
export const managerProfileSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().optional().allow(''),
  department: Joi.string().required(),
  position: Joi.string().required(),
  bio: Joi.string().optional().allow(''),
  avatar: Joi.string().uri().optional().allow(''),
  timezone: Joi.string().required(),
  workingHours: Joi.object({
    start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    days: Joi.array().items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')).min(1).required(),
  }).required(),
});

export const managerNotificationSettingsSchema = Joi.object({
  emailNotifications: Joi.boolean().required(),
  pushNotifications: Joi.boolean().required(),
  smsNotifications: Joi.boolean().required(),
  notifyOnNewRequest: Joi.boolean().required(),
  notifyOnUrgentRequest: Joi.boolean().required(),
  notifyOnTeamUpdate: Joi.boolean().required(),
  notifyOnSystemUpdate: Joi.boolean().required(),
  notifyOnHoliday: Joi.boolean().required(),
  notifyOnReview: Joi.boolean().required(),
  digestFrequency: Joi.string().valid('immediate', 'hourly', 'daily', 'weekly').required(),
});

export const approvalSettingsSchema = Joi.object({
  autoApprove: Joi.boolean().required(),
  autoApproveTypes: Joi.array().items(Joi.string()).required(),
  autoApproveMaxDays: Joi.number().integer().min(1).max(30).required(),
  requireComments: Joi.boolean().required(),
  requireWorkHandover: Joi.boolean().required(),
  escalationDays: Joi.number().integer().min(1).max(30).required(),
  escalationManagerId: Joi.string().uuid().optional().allow(null),
  approvalWorkflow: Joi.string().valid('sequential', 'parallel').required(),
  delegationEnabled: Joi.boolean().required(),
  delegationManagerId: Joi.string().uuid().optional().allow(null),
});

export const teamSettingsSchema = Joi.object({
  allowSelfApproval: Joi.boolean().required(),
  allowOverlappingLeaves: Joi.boolean().required(),
  maxConcurrentLeaves: Joi.number().integer().min(1).max(10).required(),
  requireAdvanceNotice: Joi.boolean().required(),
  advanceNoticeDays: Joi.number().integer().min(0).max(30).required(),
  allowHalfDayLeaves: Joi.boolean().required(),
  allowEmergencyLeaves: Joi.boolean().required(),
  teamGoalsEnabled: Joi.boolean().required(),
  performanceTracking: Joi.boolean().required(),
});

export const calendarSettingsSchema = Joi.object({
  defaultView: Joi.string().valid('month', 'week', 'day').required(),
  showWeekends: Joi.boolean().required(),
  showHolidays: Joi.boolean().required(),
  showTeamLeaves: Joi.boolean().required(),
  showPersonalEvents: Joi.boolean().required(),
  workingDays: Joi.array().items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')).min(1).required(),
  timeFormat: Joi.string().valid('12h', '24h').required(),
  timezone: Joi.string().required(),
});

export const managerSecuritySettingsSchema = Joi.object({
  twoFactorEnabled: Joi.boolean().required(),
  sessionTimeout: Joi.number().integer().min(5).max(1440).required(),
  passwordExpiry: Joi.number().integer().min(30).max(365).required(),
  loginNotifications: Joi.boolean().required(),
  deviceManagement: Joi.boolean().required(),
  auditLogs: Joi.boolean().required(),
});

// Performance Review Schemas
export const performanceReviewSchema = Joi.object({
  employeeId: Joi.string().uuid().required(),
  overall: Joi.number().min(1).max(5).required(),
  attendance: Joi.number().min(1).max(5).required(),
  productivity: Joi.number().min(1).max(5).required(),
  teamwork: Joi.number().min(1).max(5).required(),
  communication: Joi.number().min(1).max(5).required(),
  comments: Joi.string().optional().allow(''),
  goals: Joi.array().items(Joi.string()).optional(),
  improvements: Joi.array().items(Joi.string()).optional(),
  nextReviewDate: Joi.date().iso().required(),
});

export const updatePerformanceReviewSchema = Joi.object({
  overall: Joi.number().min(1).max(5).optional(),
  attendance: Joi.number().min(1).max(5).optional(),
  productivity: Joi.number().min(1).max(5).optional(),
  teamwork: Joi.number().min(1).max(5).optional(),
  communication: Joi.number().min(1).max(5).optional(),
  comments: Joi.string().optional().allow(''),
  goals: Joi.array().items(Joi.string()).optional(),
  improvements: Joi.array().items(Joi.string()).optional(),
  nextReviewDate: Joi.date().iso().optional(),
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
export const managerSchemas = {
  managerDashboardStats: managerDashboardStatsSchema,
  teamFilters: teamFiltersSchema,
  updateTeamMember: updateTeamMemberSchema,
  toggleTeamMemberStatus: toggleTeamMemberStatusSchema,
  approvalFilters: approvalFiltersSchema,
  approvalAction: approvalActionSchema,
  bulkApprovalAction: bulkApprovalActionSchema,
  updateApprovalStatus: updateApprovalStatusSchema,
  calendarFilters: calendarFiltersSchema,
  createCalendarEvent: createCalendarEventSchema,
  updateCalendarEvent: updateCalendarEventSchema,
  teamOverviewFilters: teamOverviewFiltersSchema,
  createTeamGoal: createTeamGoalSchema,
  updateTeamGoal: updateTeamGoalSchema,
  managerProfile: managerProfileSchema,
  managerNotificationSettings: managerNotificationSettingsSchema,
  approvalSettings: approvalSettingsSchema,
  teamSettings: teamSettingsSchema,
  calendarSettings: calendarSettingsSchema,
  managerSecuritySettings: managerSecuritySettingsSchema,
  performanceReview: performanceReviewSchema,
  updatePerformanceReview: updatePerformanceReviewSchema,
  idParam: idParamSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
};
