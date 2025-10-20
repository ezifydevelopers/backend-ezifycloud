"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeSchemas = exports.leavePolicyFiltersSchema = exports.dateRangeSchema = exports.paginationSchema = exports.idParamSchema = exports.markAllNotificationsReadSchema = exports.markNotificationReadSchema = exports.verifyTwoFactorSchema = exports.twoFactorSetupSchema = exports.updateSecurityQuestionSchema = exports.securityQuestionSchema = exports.achievementSchema = exports.updatePerformanceGoalSchema = exports.performanceGoalSchema = exports.userPreferencesSchema = exports.privacySettingsSchema = exports.calendarPreferencesSchema = exports.notificationPreferencesSchema = exports.updatePasswordSchema = exports.updateAvatarSchema = exports.updateProfileSchema = exports.updateCalendarEventSchema = exports.createCalendarEventSchema = exports.calendarFiltersSchema = exports.leaveHistoryFiltersSchema = exports.leaveRequestFiltersSchema = exports.leaveRequestFormSchema = exports.employeeDashboardStatsSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.employeeDashboardStatsSchema = joi_1.default.object({
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso().optional(),
        endDate: joi_1.default.date().iso().optional(),
    }).optional(),
});
exports.leaveRequestFormSchema = joi_1.default.object({
    leaveType: joi_1.default.string().valid('annual', 'sick', 'casual', 'maternity', 'paternity', 'emergency').required(),
    startDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().min(joi_1.default.ref('startDate')).required(),
    reason: joi_1.default.string().min(10).max(500).required(),
    emergencyContact: joi_1.default.string().optional().allow(''),
    workHandover: joi_1.default.string().optional().allow(''),
    isHalfDay: joi_1.default.boolean().default(false),
    halfDayPeriod: joi_1.default.string().valid('morning', 'afternoon').when('isHalfDay', {
        is: true,
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional()
    }),
    attachments: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
});
exports.leaveRequestFiltersSchema = joi_1.default.object({
    status: joi_1.default.string().valid('pending', 'approved', 'rejected', 'all').optional(),
    leaveType: joi_1.default.string().optional().allow(''),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
});
exports.leaveHistoryFiltersSchema = joi_1.default.object({
    year: joi_1.default.number().integer().min(2020).max(2030).optional(),
    leaveType: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().valid('pending', 'approved', 'rejected', 'all').optional(),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
});
exports.calendarFiltersSchema = joi_1.default.object({
    startDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().required(),
    eventType: joi_1.default.string().valid('leave', 'holiday', 'meeting', 'event', 'all').optional(),
    leaveType: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().optional().allow(''),
});
exports.createCalendarEventSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).required(),
    type: joi_1.default.string().valid('leave', 'holiday', 'meeting', 'event').required(),
    startDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().required(),
    allDay: joi_1.default.boolean().default(false),
    leaveType: joi_1.default.string().optional(),
    status: joi_1.default.string().valid('pending', 'approved', 'rejected').optional(),
    color: joi_1.default.string().optional(),
    description: joi_1.default.string().optional().allow(''),
    location: joi_1.default.string().optional().allow(''),
});
exports.updateCalendarEventSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).optional(),
    type: joi_1.default.string().valid('leave', 'holiday', 'meeting', 'event').optional(),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    allDay: joi_1.default.boolean().optional(),
    leaveType: joi_1.default.string().optional(),
    status: joi_1.default.string().valid('pending', 'approved', 'rejected').optional(),
    color: joi_1.default.string().optional(),
    description: joi_1.default.string().optional().allow(''),
    location: joi_1.default.string().optional().allow(''),
});
exports.updateProfileSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).optional().allow(''),
    phone: joi_1.default.string().optional().allow(''),
    bio: joi_1.default.string().max(500).optional().allow(''),
    address: joi_1.default.string().optional().allow(''),
    emergencyContact: joi_1.default.string().optional().allow(''),
}).min(1);
exports.updateAvatarSchema = joi_1.default.object({
    avatar: joi_1.default.string().uri().required(),
});
exports.updatePasswordSchema = joi_1.default.object({
    currentPassword: joi_1.default.string().required(),
    newPassword: joi_1.default.string().min(6).required(),
    confirmPassword: joi_1.default.string().valid(joi_1.default.ref('newPassword')).required(),
});
exports.notificationPreferencesSchema = joi_1.default.object({
    email: joi_1.default.boolean().required(),
    push: joi_1.default.boolean().required(),
    sms: joi_1.default.boolean().required(),
    leaveUpdates: joi_1.default.boolean().required(),
    holidayReminders: joi_1.default.boolean().required(),
    performanceReviews: joi_1.default.boolean().required(),
    teamUpdates: joi_1.default.boolean().required(),
    systemUpdates: joi_1.default.boolean().required(),
});
exports.calendarPreferencesSchema = joi_1.default.object({
    defaultView: joi_1.default.string().valid('month', 'week', 'day').required(),
    showWeekends: joi_1.default.boolean().required(),
    showHolidays: joi_1.default.boolean().required(),
    workingDays: joi_1.default.array().items(joi_1.default.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')).min(1).required(),
    startTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
    endTime: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
});
exports.privacySettingsSchema = joi_1.default.object({
    showLeaveDetails: joi_1.default.boolean().required(),
    showContactInfo: joi_1.default.boolean().required(),
    showPerformance: joi_1.default.boolean().required(),
    allowDirectMessages: joi_1.default.boolean().required(),
});
exports.userPreferencesSchema = joi_1.default.object({
    timezone: joi_1.default.string().required(),
    language: joi_1.default.string().required(),
    dateFormat: joi_1.default.string().required(),
    timeFormat: joi_1.default.string().valid('12h', '24h').required(),
    notifications: exports.notificationPreferencesSchema.required(),
    calendar: exports.calendarPreferencesSchema.required(),
    privacy: exports.privacySettingsSchema.required(),
});
exports.performanceGoalSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).required(),
    description: joi_1.default.string().optional().allow(''),
    targetDate: joi_1.default.date().iso().required(),
    progress: joi_1.default.number().min(0).max(100).default(0),
    status: joi_1.default.string().valid('not_started', 'in_progress', 'completed', 'overdue').default('not_started'),
});
exports.updatePerformanceGoalSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).optional(),
    description: joi_1.default.string().optional().allow(''),
    targetDate: joi_1.default.date().iso().optional(),
    progress: joi_1.default.number().min(0).max(100).optional(),
    status: joi_1.default.string().valid('not_started', 'in_progress', 'completed', 'overdue').optional(),
});
exports.achievementSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).required(),
    description: joi_1.default.string().optional().allow(''),
    type: joi_1.default.string().valid('award', 'milestone', 'certification', 'recognition').required(),
    date: joi_1.default.date().iso().required(),
    issuer: joi_1.default.string().required(),
    badge: joi_1.default.string().uri().optional(),
});
exports.securityQuestionSchema = joi_1.default.object({
    question: joi_1.default.string().min(10).max(200).required(),
    answer: joi_1.default.string().min(3).max(100).required(),
});
exports.updateSecurityQuestionSchema = joi_1.default.object({
    questionId: joi_1.default.string().uuid().required(),
    question: joi_1.default.string().min(10).max(200).optional(),
    answer: joi_1.default.string().min(3).max(100).optional(),
});
exports.twoFactorSetupSchema = joi_1.default.object({
    method: joi_1.default.string().valid('email', 'sms', 'app').required(),
    phoneNumber: joi_1.default.string().when('method', {
        is: 'sms',
        then: joi_1.default.required(),
        otherwise: joi_1.default.optional()
    }),
});
exports.verifyTwoFactorSchema = joi_1.default.object({
    code: joi_1.default.string().length(6).required(),
});
exports.markNotificationReadSchema = joi_1.default.object({
    notificationId: joi_1.default.string().uuid().required(),
});
exports.markAllNotificationsReadSchema = joi_1.default.object({
    type: joi_1.default.string().valid('all', 'info', 'success', 'warning', 'error').optional(),
});
exports.idParamSchema = joi_1.default.object({
    id: joi_1.default.string().uuid().required(),
});
exports.paginationSchema = joi_1.default.object({
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
});
exports.dateRangeSchema = joi_1.default.object({
    startDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().required(),
});
exports.leavePolicyFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().optional().allow(''),
    leaveType: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().valid('active', 'inactive', 'all').optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
});
exports.employeeSchemas = {
    employeeDashboardStats: exports.employeeDashboardStatsSchema,
    leaveRequestForm: exports.leaveRequestFormSchema,
    leaveRequestFilters: exports.leaveRequestFiltersSchema,
    leaveHistoryFilters: exports.leaveHistoryFiltersSchema,
    calendarFilters: exports.calendarFiltersSchema,
    createCalendarEvent: exports.createCalendarEventSchema,
    updateCalendarEvent: exports.updateCalendarEventSchema,
    updateProfile: exports.updateProfileSchema,
    updateAvatar: exports.updateAvatarSchema,
    updatePassword: exports.updatePasswordSchema,
    notificationPreferences: exports.notificationPreferencesSchema,
    calendarPreferences: exports.calendarPreferencesSchema,
    privacySettings: exports.privacySettingsSchema,
    userPreferences: exports.userPreferencesSchema,
    performanceGoal: exports.performanceGoalSchema,
    updatePerformanceGoal: exports.updatePerformanceGoalSchema,
    achievement: exports.achievementSchema,
    securityQuestion: exports.securityQuestionSchema,
    updateSecurityQuestion: exports.updateSecurityQuestionSchema,
    twoFactorSetup: exports.twoFactorSetupSchema,
    verifyTwoFactor: exports.verifyTwoFactorSchema,
    markNotificationRead: exports.markNotificationReadSchema,
    markAllNotificationsRead: exports.markAllNotificationsReadSchema,
    idParam: exports.idParamSchema,
    pagination: exports.paginationSchema,
    dateRange: exports.dateRangeSchema,
    leavePolicyFilters: exports.leavePolicyFiltersSchema,
};
//# sourceMappingURL=index.js.map