import Joi from 'joi';

// Employee Dashboard Schemas
export const employeeDashboardStatsSchema = Joi.object({
  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }).optional(),
});

// Leave Request Schemas
export const leaveRequestFormSchema = Joi.object({
  leaveType: Joi.string().min(1).required().messages({
    'string.empty': 'Leave type is required',
    'any.required': 'Leave type is required'
  }),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  reason: Joi.string().min(10).max(500).required(),
  emergencyContact: Joi.string().optional().allow(''),
  workHandover: Joi.string().optional().allow(''),
  isHalfDay: Joi.boolean().default(false),
  halfDayPeriod: Joi.string().valid('morning', 'afternoon').when('isHalfDay', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  attachments: Joi.array().items(Joi.string().uri()).optional(),
});

export const leaveRequestFiltersSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected', 'all').optional(),
  leaveType: Joi.string().optional().allow(''),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Leave History Schemas
export const leaveHistoryFiltersSchema = Joi.object({
  year: Joi.number().integer().min(2020).max(2030).optional(),
  leaveType: Joi.string().optional().allow(''),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'all').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Calendar Schemas
export const calendarFiltersSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  eventType: Joi.string().valid('leave', 'holiday', 'meeting', 'event', 'all').optional(),
  leaveType: Joi.string().optional().allow(''),
  status: Joi.string().optional().allow(''),
});

export const createCalendarEventSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid('leave', 'holiday', 'meeting', 'event').required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  allDay: Joi.boolean().default(false),
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
  leaveType: Joi.string().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
  color: Joi.string().optional(),
  description: Joi.string().optional().allow(''),
  location: Joi.string().optional().allow(''),
});

// Profile Management Schemas
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional().allow(''),
  phone: Joi.string().optional().allow(''),
  bio: Joi.string().max(500).optional().allow(''),
  address: Joi.string().optional().allow(''),
  emergencyContact: Joi.string().optional().allow(''),
}).min(1); // At least one field must be provided

export const updateAvatarSchema = Joi.object({
  avatar: Joi.string().uri().required(),
});

export const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required(),
});

// Settings Schemas
export const notificationPreferencesSchema = Joi.object({
  email: Joi.boolean().required(),
  push: Joi.boolean().required(),
  sms: Joi.boolean().required(),
  leaveUpdates: Joi.boolean().required(),
  holidayReminders: Joi.boolean().required(),
  performanceReviews: Joi.boolean().required(),
  teamUpdates: Joi.boolean().required(),
  systemUpdates: Joi.boolean().required(),
});

export const calendarPreferencesSchema = Joi.object({
  defaultView: Joi.string().valid('month', 'week', 'day').required(),
  showWeekends: Joi.boolean().required(),
  showHolidays: Joi.boolean().required(),
  workingDays: Joi.array().items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')).min(1).required(),
  startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
  endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
});

export const privacySettingsSchema = Joi.object({
  showLeaveDetails: Joi.boolean().required(),
  showContactInfo: Joi.boolean().required(),
  showPerformance: Joi.boolean().required(),
  allowDirectMessages: Joi.boolean().required(),
});

export const userPreferencesSchema = Joi.object({
  timezone: Joi.string().required(),
  language: Joi.string().required(),
  dateFormat: Joi.string().required(),
  timeFormat: Joi.string().valid('12h', '24h').required(),
  notifications: notificationPreferencesSchema.required(),
  calendar: calendarPreferencesSchema.required(),
  privacy: privacySettingsSchema.required(),
});

// Performance Schemas
export const performanceGoalSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional().allow(''),
  targetDate: Joi.date().iso().required(),
  progress: Joi.number().min(0).max(100).default(0),
  status: Joi.string().valid('not_started', 'in_progress', 'completed', 'overdue').default('not_started'),
});

export const updatePerformanceGoalSchema = Joi.object({
  title: Joi.string().min(1).max(200).optional(),
  description: Joi.string().optional().allow(''),
  targetDate: Joi.date().iso().optional(),
  progress: Joi.number().min(0).max(100).optional(),
  status: Joi.string().valid('not_started', 'in_progress', 'completed', 'overdue').optional(),
});

export const achievementSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().optional().allow(''),
  type: Joi.string().valid('award', 'milestone', 'certification', 'recognition').required(),
  date: Joi.date().iso().required(),
  issuer: Joi.string().required(),
  badge: Joi.string().uri().optional(),
});

// Security Schemas
export const securityQuestionSchema = Joi.object({
  question: Joi.string().min(10).max(200).required(),
  answer: Joi.string().min(3).max(100).required(),
});

export const updateSecurityQuestionSchema = Joi.object({
  questionId: Joi.string().uuid().required(),
  question: Joi.string().min(10).max(200).optional(),
  answer: Joi.string().min(3).max(100).optional(),
});

export const twoFactorSetupSchema = Joi.object({
  method: Joi.string().valid('email', 'sms', 'app').required(),
  phoneNumber: Joi.string().when('method', {
    is: 'sms',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
});

export const verifyTwoFactorSchema = Joi.object({
  code: Joi.string().length(6).required(),
});

// Notification Schemas
export const markNotificationReadSchema = Joi.object({
  notificationId: Joi.string().uuid().required(),
});

export const markAllNotificationsReadSchema = Joi.object({
  type: Joi.string().valid('all', 'info', 'success', 'warning', 'error').optional(),
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

// Leave Policy Schemas (Read-only access for employees)
export const leavePolicyFiltersSchema = Joi.object({
  search: Joi.string().optional().allow(''),
  leaveType: Joi.string().optional().allow(''),
  status: Joi.string().valid('active', 'inactive', 'all').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Export all schemas for easy access
export const employeeSchemas = {
  employeeDashboardStats: employeeDashboardStatsSchema,
  leaveRequestForm: leaveRequestFormSchema,
  leaveRequestFilters: leaveRequestFiltersSchema,
  leaveHistoryFilters: leaveHistoryFiltersSchema,
  calendarFilters: calendarFiltersSchema,
  createCalendarEvent: createCalendarEventSchema,
  updateCalendarEvent: updateCalendarEventSchema,
  updateProfile: updateProfileSchema,
  updateAvatar: updateAvatarSchema,
  updatePassword: updatePasswordSchema,
  notificationPreferences: notificationPreferencesSchema,
  calendarPreferences: calendarPreferencesSchema,
  privacySettings: privacySettingsSchema,
  userPreferences: userPreferencesSchema,
  performanceGoal: performanceGoalSchema,
  updatePerformanceGoal: updatePerformanceGoalSchema,
  achievement: achievementSchema,
  securityQuestion: securityQuestionSchema,
  updateSecurityQuestion: updateSecurityQuestionSchema,
  twoFactorSetup: twoFactorSetupSchema,
  verifyTwoFactor: verifyTwoFactorSchema,
  markNotificationRead: markNotificationReadSchema,
  markAllNotificationsRead: markAllNotificationsReadSchema,
  idParam: idParamSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
  leavePolicyFilters: leavePolicyFiltersSchema,
};
