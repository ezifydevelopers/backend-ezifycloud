"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.managerSchemas = exports.updateLeaveRequestSchema = exports.leaveHistoryFiltersSchema = exports.leaveRequestFiltersSchema = exports.leaveRequestFormSchema = exports.leavePolicyFiltersSchema = exports.dateRangeSchema = exports.paginationSchema = exports.idParamSchema = exports.updatePerformanceReviewSchema = exports.performanceReviewSchema = exports.managerSecuritySettingsSchema = exports.calendarSettingsSchema = exports.teamSettingsSchema = exports.approvalSettingsSchema = exports.managerNotificationSettingsSchema = exports.updateProfileSchema = exports.managerProfileSchema = exports.updateTeamGoalSchema = exports.createTeamGoalSchema = exports.teamOverviewFiltersSchema = exports.updateCalendarEventSchema = exports.createCalendarEventSchema = exports.calendarFiltersSchema = exports.updateApprovalStatusSchema = exports.bulkApprovalActionSchema = exports.approvalActionSchema = exports.approvalStatsSchema = exports.approvalFiltersSchema = exports.toggleTeamMemberStatusSchema = exports.updateTeamMemberSchema = exports.addTeamMemberSchema = exports.teamFiltersSchema = exports.managerDashboardStatsSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.managerDashboardStatsSchema = joi_1.default.object({
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso().optional(),
        endDate: joi_1.default.date().iso().optional(),
    }).optional(),
    department: joi_1.default.string().optional().allow(''),
});
exports.teamFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().optional().allow(''),
    department: joi_1.default.string().optional().allow(''),
    role: joi_1.default.string().valid('manager', 'employee').optional(),
    status: joi_1.default.string().valid('active', 'inactive', 'all').optional(),
    performance: joi_1.default.string().valid('high', 'medium', 'low', 'all').optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('asc'),
});
exports.addTeamMemberSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required(),
    email: joi_1.default.string().email().required(),
    phone: joi_1.default.string().min(10).optional().allow(''),
    department: joi_1.default.string().required(),
    role: joi_1.default.string().valid('employee', 'senior_employee', 'lead', 'specialist').required(),
    position: joi_1.default.string().min(1).optional().allow(''),
    salary: joi_1.default.number().min(0).optional().allow(0),
    startDate: joi_1.default.date().iso().optional(),
    address: joi_1.default.string().min(10).optional().allow(''),
    emergencyContact: joi_1.default.string().min(2).optional().allow(''),
    emergencyPhone: joi_1.default.string().min(10).optional().allow(''),
    notes: joi_1.default.string().optional().allow(''),
    isActive: joi_1.default.boolean().optional().default(true),
});
exports.updateTeamMemberSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).optional(),
    email: joi_1.default.string().email().optional(),
    password: joi_1.default.string().min(6).optional(),
    phone: joi_1.default.string().optional().allow(''),
    department: joi_1.default.string().optional(),
    position: joi_1.default.string().optional(),
    bio: joi_1.default.string().optional().allow(''),
    performance: joi_1.default.object({
        overall: joi_1.default.number().min(1).max(5).optional(),
        attendance: joi_1.default.number().min(1).max(5).optional(),
        productivity: joi_1.default.number().min(1).max(5).optional(),
        teamwork: joi_1.default.number().min(1).max(5).optional(),
        communication: joi_1.default.number().min(1).max(5).optional(),
    }).optional(),
});
exports.toggleTeamMemberStatusSchema = joi_1.default.object({
    isActive: joi_1.default.boolean().required(),
});
exports.approvalFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().valid('pending', 'approved', 'rejected', 'all').optional(),
    leaveType: joi_1.default.string().optional().allow(''),
    priority: joi_1.default.string().valid('low', 'medium', 'high', 'all').optional(),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
});
exports.approvalStatsSchema = joi_1.default.object({
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    department: joi_1.default.string().optional().allow(''),
    period: joi_1.default.string().valid('week', 'month', 'quarter', 'year').optional(),
});
exports.approvalActionSchema = joi_1.default.object({
    requestId: joi_1.default.string().uuid().required(),
    action: joi_1.default.string().valid('approve', 'reject').required(),
    comments: joi_1.default.string().optional().allow(''),
    priority: joi_1.default.string().valid('low', 'medium', 'high').optional(),
});
exports.bulkApprovalActionSchema = joi_1.default.object({
    requestIds: joi_1.default.array().items(joi_1.default.string().uuid()).min(1).required(),
    action: joi_1.default.string().valid('approve', 'reject').required(),
    comments: joi_1.default.string().optional().allow(''),
});
exports.updateApprovalStatusSchema = joi_1.default.object({
    status: joi_1.default.string().valid('approved', 'rejected').required(),
    comments: joi_1.default.string().optional().allow(''),
    priority: joi_1.default.string().valid('low', 'medium', 'high').optional(),
});
exports.calendarFiltersSchema = joi_1.default.object({
    startDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().required(),
    employeeId: joi_1.default.string().uuid().optional().allow(''),
    leaveType: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().optional().allow(''),
    eventType: joi_1.default.string().valid('leave', 'holiday', 'meeting', 'event', 'all').optional(),
});
exports.createCalendarEventSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).required(),
    type: joi_1.default.string().valid('leave', 'holiday', 'meeting', 'event').required(),
    startDate: joi_1.default.date().iso().required(),
    endDate: joi_1.default.date().iso().required(),
    allDay: joi_1.default.boolean().default(false),
    employeeId: joi_1.default.string().uuid().optional(),
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
    employeeId: joi_1.default.string().uuid().optional(),
    leaveType: joi_1.default.string().optional(),
    status: joi_1.default.string().valid('pending', 'approved', 'rejected').optional(),
    color: joi_1.default.string().optional(),
    description: joi_1.default.string().optional().allow(''),
    location: joi_1.default.string().optional().allow(''),
});
exports.teamOverviewFiltersSchema = joi_1.default.object({
    department: joi_1.default.string().optional().allow(''),
    performance: joi_1.default.string().valid('high', 'medium', 'low', 'all').optional(),
    status: joi_1.default.string().valid('active', 'inactive', 'all').optional(),
    dateRange: joi_1.default.object({
        startDate: joi_1.default.date().iso().optional(),
        endDate: joi_1.default.date().iso().optional(),
    }).optional(),
});
exports.createTeamGoalSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).required(),
    description: joi_1.default.string().optional().allow(''),
    targetDate: joi_1.default.date().iso().required(),
    assignedTo: joi_1.default.array().items(joi_1.default.string().uuid()).min(1).required(),
});
exports.updateTeamGoalSchema = joi_1.default.object({
    title: joi_1.default.string().min(1).max(200).optional(),
    description: joi_1.default.string().optional().allow(''),
    targetDate: joi_1.default.date().iso().optional(),
    progress: joi_1.default.number().min(0).max(100).optional(),
    status: joi_1.default.string().valid('not_started', 'in_progress', 'completed', 'overdue').optional(),
    assignedTo: joi_1.default.array().items(joi_1.default.string().uuid()).optional(),
});
exports.managerProfileSchema = joi_1.default.object({
    name: joi_1.default.string().min(2).max(100).required(),
    email: joi_1.default.string().email().required(),
    phone: joi_1.default.string().optional().allow(''),
    department: joi_1.default.string().required(),
    position: joi_1.default.string().required(),
    bio: joi_1.default.string().optional().allow(''),
    avatar: joi_1.default.string().uri().optional().allow(''),
    timezone: joi_1.default.string().required(),
    workingHours: joi_1.default.object({
        start: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        end: joi_1.default.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        days: joi_1.default.array().items(joi_1.default.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')).min(1).required(),
    }).required(),
});
exports.updateProfileSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(100).optional().allow(''),
    phone: joi_1.default.string().optional().allow(''),
    department: joi_1.default.string().optional().allow(''),
    bio: joi_1.default.string().optional().allow(''),
}).min(1);
exports.managerNotificationSettingsSchema = joi_1.default.object({
    emailNotifications: joi_1.default.boolean().required(),
    pushNotifications: joi_1.default.boolean().required(),
    smsNotifications: joi_1.default.boolean().required(),
    notifyOnNewRequest: joi_1.default.boolean().required(),
    notifyOnUrgentRequest: joi_1.default.boolean().required(),
    notifyOnTeamUpdate: joi_1.default.boolean().required(),
    notifyOnSystemUpdate: joi_1.default.boolean().required(),
    notifyOnHoliday: joi_1.default.boolean().required(),
    notifyOnReview: joi_1.default.boolean().required(),
    digestFrequency: joi_1.default.string().valid('immediate', 'hourly', 'daily', 'weekly').required(),
});
exports.approvalSettingsSchema = joi_1.default.object({
    autoApprove: joi_1.default.boolean().required(),
    autoApproveTypes: joi_1.default.array().items(joi_1.default.string()).required(),
    autoApproveMaxDays: joi_1.default.number().integer().min(1).max(30).required(),
    requireComments: joi_1.default.boolean().required(),
    requireWorkHandover: joi_1.default.boolean().required(),
    escalationDays: joi_1.default.number().integer().min(1).max(30).required(),
    escalationManagerId: joi_1.default.string().uuid().optional().allow(null),
    approvalWorkflow: joi_1.default.string().valid('sequential', 'parallel').required(),
    delegationEnabled: joi_1.default.boolean().required(),
    delegationManagerId: joi_1.default.string().uuid().optional().allow(null),
});
exports.teamSettingsSchema = joi_1.default.object({
    allowSelfApproval: joi_1.default.boolean().required(),
    allowOverlappingLeaves: joi_1.default.boolean().required(),
    maxConcurrentLeaves: joi_1.default.number().integer().min(1).max(10).required(),
    requireAdvanceNotice: joi_1.default.boolean().required(),
    advanceNoticeDays: joi_1.default.number().integer().min(0).max(30).required(),
    allowHalfDayLeaves: joi_1.default.boolean().required(),
    allowEmergencyLeaves: joi_1.default.boolean().required(),
    teamGoalsEnabled: joi_1.default.boolean().required(),
    performanceTracking: joi_1.default.boolean().required(),
});
exports.calendarSettingsSchema = joi_1.default.object({
    defaultView: joi_1.default.string().valid('month', 'week', 'day').required(),
    showWeekends: joi_1.default.boolean().required(),
    showHolidays: joi_1.default.boolean().required(),
    showTeamLeaves: joi_1.default.boolean().required(),
    showPersonalEvents: joi_1.default.boolean().required(),
    workingDays: joi_1.default.array().items(joi_1.default.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')).min(1).required(),
    timeFormat: joi_1.default.string().valid('12h', '24h').required(),
    timezone: joi_1.default.string().required(),
});
exports.managerSecuritySettingsSchema = joi_1.default.object({
    twoFactorEnabled: joi_1.default.boolean().required(),
    sessionTimeout: joi_1.default.number().integer().min(5).max(1440).required(),
    passwordExpiry: joi_1.default.number().integer().min(30).max(365).required(),
    loginNotifications: joi_1.default.boolean().required(),
    deviceManagement: joi_1.default.boolean().required(),
    auditLogs: joi_1.default.boolean().required(),
});
exports.performanceReviewSchema = joi_1.default.object({
    employeeId: joi_1.default.string().uuid().required(),
    overall: joi_1.default.number().min(1).max(5).required(),
    attendance: joi_1.default.number().min(1).max(5).required(),
    productivity: joi_1.default.number().min(1).max(5).required(),
    teamwork: joi_1.default.number().min(1).max(5).required(),
    communication: joi_1.default.number().min(1).max(5).required(),
    comments: joi_1.default.string().optional().allow(''),
    goals: joi_1.default.array().items(joi_1.default.string()).optional(),
    improvements: joi_1.default.array().items(joi_1.default.string()).optional(),
    nextReviewDate: joi_1.default.date().iso().required(),
});
exports.updatePerformanceReviewSchema = joi_1.default.object({
    overall: joi_1.default.number().min(1).max(5).optional(),
    attendance: joi_1.default.number().min(1).max(5).optional(),
    productivity: joi_1.default.number().min(1).max(5).optional(),
    teamwork: joi_1.default.number().min(1).max(5).optional(),
    communication: joi_1.default.number().min(1).max(5).optional(),
    comments: joi_1.default.string().optional().allow(''),
    goals: joi_1.default.array().items(joi_1.default.string()).optional(),
    improvements: joi_1.default.array().items(joi_1.default.string()).optional(),
    nextReviewDate: joi_1.default.date().iso().optional(),
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
exports.leavePolicyFiltersSchema = joi_1.default.object({
    search: joi_1.default.string().optional().allow(''),
    leaveType: joi_1.default.string().optional().allow(''),
    status: joi_1.default.string().valid('active', 'inactive', 'all').optional(),
    page: joi_1.default.number().integer().min(1).default(1),
    limit: joi_1.default.number().integer().min(1).max(100).default(10),
    sortBy: joi_1.default.string().optional(),
    sortOrder: joi_1.default.string().valid('asc', 'desc').default('desc'),
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
exports.updateLeaveRequestSchema = joi_1.default.object({
    leaveType: joi_1.default.string().valid('annual', 'sick', 'casual', 'maternity', 'paternity', 'emergency').optional(),
    startDate: joi_1.default.date().iso().optional(),
    endDate: joi_1.default.date().iso().optional(),
    reason: joi_1.default.string().min(10).max(500).optional(),
    emergencyContact: joi_1.default.string().optional().allow(''),
    workHandover: joi_1.default.string().optional().allow(''),
    isHalfDay: joi_1.default.boolean().optional(),
    halfDayPeriod: joi_1.default.string().valid('morning', 'afternoon').optional(),
    attachments: joi_1.default.array().items(joi_1.default.string().uri()).optional(),
});
exports.managerSchemas = {
    managerDashboardStats: exports.managerDashboardStatsSchema,
    teamFilters: exports.teamFiltersSchema,
    addTeamMember: exports.addTeamMemberSchema,
    updateTeamMember: exports.updateTeamMemberSchema,
    toggleTeamMemberStatus: exports.toggleTeamMemberStatusSchema,
    approvalFilters: exports.approvalFiltersSchema,
    approvalStats: exports.approvalStatsSchema,
    approvalAction: exports.approvalActionSchema,
    bulkApprovalAction: exports.bulkApprovalActionSchema,
    updateApprovalStatus: exports.updateApprovalStatusSchema,
    calendarFilters: exports.calendarFiltersSchema,
    createCalendarEvent: exports.createCalendarEventSchema,
    updateCalendarEvent: exports.updateCalendarEventSchema,
    teamOverviewFilters: exports.teamOverviewFiltersSchema,
    createTeamGoal: exports.createTeamGoalSchema,
    updateTeamGoal: exports.updateTeamGoalSchema,
    managerProfile: exports.managerProfileSchema,
    updateProfile: exports.updateProfileSchema,
    managerNotificationSettings: exports.managerNotificationSettingsSchema,
    approvalSettings: exports.approvalSettingsSchema,
    teamSettings: exports.teamSettingsSchema,
    calendarSettings: exports.calendarSettingsSchema,
    managerSecuritySettings: exports.managerSecuritySettingsSchema,
    performanceReview: exports.performanceReviewSchema,
    updatePerformanceReview: exports.updatePerformanceReviewSchema,
    idParam: exports.idParamSchema,
    pagination: exports.paginationSchema,
    dateRange: exports.dateRangeSchema,
    leavePolicyFilters: exports.leavePolicyFiltersSchema,
    leaveRequestForm: exports.leaveRequestFormSchema,
    leaveRequestFilters: exports.leaveRequestFiltersSchema,
    leaveHistoryFilters: exports.leaveHistoryFiltersSchema,
    updateLeaveRequest: exports.updateLeaveRequestSchema,
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
};
//# sourceMappingURL=index.js.map