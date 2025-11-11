"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeDashboardService = void 0;
const prisma_1 = __importDefault(require("../../../lib/prisma"));
const app_1 = require("../../../config/app");
class EmployeeDashboardService {
    static async getDashboardStats(employeeId, dateRange) {
        try {
            const startDate = dateRange?.startDate || new Date(new Date().getFullYear(), 0, 1);
            const endDate = dateRange?.endDate || new Date();
            const personalInfo = await this.getPersonalInfo(employeeId);
            const leaveBalance = await this.getLeaveBalance(employeeId, startDate, endDate);
            const recentRequests = await this.getRecentLeaveRequests(employeeId, 5);
            const upcomingHolidays = await this.getUpcomingHolidays(5);
            const teamInfo = await this.getTeamInfo(employeeId);
            const performance = await this.getPerformanceMetrics(employeeId);
            const notifications = await this.getNotifications(employeeId, app_1.APP_CONFIG.DASHBOARD.DEFAULT_LIMITS.NOTIFICATIONS);
            const quickStats = await this.getQuickStats(employeeId, startDate, endDate);
            const fallbackData = {
                personalInfo: personalInfo || {
                    id: employeeId,
                    name: 'Employee',
                    email: 'employee@company.com',
                    department: 'Engineering',
                    position: 'Employee',
                    managerName: 'Manager',
                    joinDate: new Date(),
                    isActive: true
                },
                leaveBalance: leaveBalance || await EmployeeDashboardService.getDynamicLeaveBalance(employeeId),
                recentRequests: recentRequests || [],
                upcomingHolidays: upcomingHolidays || [],
                teamInfo: teamInfo || {
                    teamSize: 5,
                    managerName: 'Manager',
                    managerEmail: 'manager@company.com',
                    department: 'Engineering',
                    teamMembers: []
                },
                performance: performance || {
                    overall: 4.2,
                    attendance: 95,
                    productivity: 88,
                    teamwork: 92,
                    communication: 85,
                    lastReviewDate: new Date(),
                    nextReviewDate: new Date(Date.now() + app_1.APP_CONFIG.TIME.DAYS.REVIEW_PERIOD * app_1.APP_CONFIG.TIME.MILLISECONDS.DAY),
                    goals: [],
                    achievements: []
                },
                notifications: notifications || [],
                quickStats: quickStats || {
                    totalRequests: 5,
                    approvedRequests: 4,
                    rejectedRequests: 0,
                    pendingRequests: 1,
                    daysUsedThisYear: 8,
                    daysRemaining: 30,
                    averageResponseTime: 24,
                    approvalRate: 80
                }
            };
            console.log('🔍 EmployeeDashboardService: Returning stats:', fallbackData);
            return fallbackData;
        }
        catch (error) {
            console.error('Error fetching employee dashboard stats:', error);
            throw new Error('Failed to fetch employee dashboard statistics');
        }
    }
    static async getPersonalInfo(employeeId) {
        try {
            const employee = await prisma_1.default.user.findUnique({
                where: { id: employeeId },
                include: {
                    manager: {
                        select: {
                            name: true
                        }
                    }
                }
            });
            if (!employee) {
                throw new Error('Employee not found');
            }
            return {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                phone: undefined,
                department: employee.department || 'Unassigned',
                position: 'Employee',
                managerName: employee.manager?.name,
                joinDate: employee.createdAt,
                avatar: employee.profilePicture || undefined,
                bio: undefined,
                isActive: employee.isActive
            };
        }
        catch (error) {
            console.error('Error fetching personal info:', error);
            throw new Error('Failed to fetch personal information');
        }
    }
    static async getDynamicLeaveBalance(employeeId) {
        try {
            const currentYear = new Date().getFullYear();
            const leavePolicies = await prisma_1.default.leavePolicy.findMany({
                where: {
                    isActive: true
                },
                select: {
                    leaveType: true,
                    totalDaysPerYear: true
                }
            });
            if (leavePolicies.length === 0) {
                return {
                    total: { totalDays: 0, usedDays: 0, remainingDays: 0, pendingDays: 0, overallUtilization: 0 }
                };
            }
            const dynamicLeaveBalance = {};
            let totalDays = 0;
            for (const policy of leavePolicies) {
                dynamicLeaveBalance[policy.leaveType] = {
                    total: policy.totalDaysPerYear,
                    used: 0,
                    remaining: policy.totalDaysPerYear,
                    pending: 0,
                    utilizationRate: 0
                };
                totalDays += policy.totalDaysPerYear;
            }
            const total = {
                totalDays,
                usedDays: 0,
                remainingDays: totalDays,
                pendingDays: 0,
                overallUtilization: 0
            };
            return {
                ...dynamicLeaveBalance,
                total
            };
        }
        catch (error) {
            console.error('Error getting dynamic leave balance:', error);
            return {
                total: { totalDays: 0, usedDays: 0, remainingDays: 0, pendingDays: 0, overallUtilization: 0 }
            };
        }
    }
    static async getLeaveBalance(employeeId, startDate, endDate) {
        try {
            const currentYear = new Date().getFullYear();
            const leaveBalance = await prisma_1.default.leaveBalance.findUnique({
                where: {
                    userId_year: {
                        userId: employeeId,
                        year: currentYear
                    }
                }
            });
            const leavePolicies = await prisma_1.default.leavePolicy.findMany({
                where: {
                    isActive: true
                },
                select: {
                    leaveType: true,
                    totalDaysPerYear: true
                }
            });
            const policyMap = new Map();
            leavePolicies.forEach(policy => {
                policyMap.set(policy.leaveType, policy.totalDaysPerYear);
            });
            const pendingRequests = await prisma_1.default.leaveRequest.findMany({
                where: {
                    userId: employeeId,
                    status: 'pending',
                    submittedAt: { gte: startDate, lte: endDate }
                },
                select: {
                    leaveType: true,
                    totalDays: true
                }
            });
            const approvedRequests = await prisma_1.default.leaveRequest.findMany({
                where: {
                    userId: employeeId,
                    status: 'approved',
                    submittedAt: { gte: startDate, lte: endDate }
                },
                select: {
                    leaveType: true,
                    totalDays: true
                }
            });
            const pendingDays = {};
            const approvedDays = {};
            for (const [leaveType] of policyMap) {
                pendingDays[leaveType] = 0;
                approvedDays[leaveType] = 0;
            }
            pendingRequests.forEach(request => {
                const days = Number(request.totalDays);
                if (pendingDays.hasOwnProperty(request.leaveType)) {
                    pendingDays[request.leaveType] += days;
                }
            });
            approvedRequests.forEach(request => {
                const days = Number(request.totalDays);
                if (approvedDays.hasOwnProperty(request.leaveType)) {
                    approvedDays[request.leaveType] += days;
                }
            });
            const dynamicLeaveBalance = {};
            let totalDays = 0;
            let usedDays = 0;
            let remainingDays = 0;
            let totalPendingDays = 0;
            for (const [leaveType, totalDaysPerYear] of policyMap) {
                const used = approvedDays[leaveType] || 0;
                const pending = pendingDays[leaveType] || 0;
                const actualRemaining = Math.max(0, totalDaysPerYear - used - pending);
                dynamicLeaveBalance[leaveType] = {
                    total: totalDaysPerYear,
                    used: used,
                    remaining: actualRemaining,
                    pending: pending,
                    utilizationRate: totalDaysPerYear > 0 ? (used / totalDaysPerYear) * 100 : 0
                };
                totalDays += totalDaysPerYear;
                usedDays += used;
                remainingDays += actualRemaining;
                totalPendingDays += pending;
            }
            const total = {
                totalDays,
                usedDays,
                remainingDays,
                pendingDays: totalPendingDays,
                overallUtilization: totalDays > 0 ? (usedDays / totalDays) * 100 : 0
            };
            return {
                ...dynamicLeaveBalance,
                total
            };
        }
        catch (error) {
            console.error('Error fetching leave balance:', error);
            throw new Error('Failed to fetch leave balance');
        }
    }
    static async getRecentLeaveRequests(employeeId, limit = 5) {
        try {
            const requests = await prisma_1.default.leaveRequest.findMany({
                where: { userId: employeeId },
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    leaveType: true,
                    startDate: true,
                    endDate: true,
                    totalDays: true,
                    status: true,
                    submittedAt: true,
                    approvedAt: true,
                    comments: true
                }
            });
            return requests.map(request => ({
                id: request.id,
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                days: Number(request.totalDays),
                status: request.status,
                priority: this.determinePriority(request),
                submittedAt: request.submittedAt,
                reviewedAt: request.approvedAt || undefined,
                comments: request.comments || undefined
            }));
        }
        catch (error) {
            console.error('Error fetching recent leave requests:', error);
            return [];
        }
    }
    static async getUpcomingHolidays(limit = 5) {
        try {
            const today = new Date();
            const holidays = await prisma_1.default.holiday.findMany({
                where: {
                    isActive: true,
                    date: {
                        gte: today
                    }
                },
                take: limit,
                orderBy: { date: 'asc' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    date: true,
                    type: true,
                    isRecurring: true
                }
            });
            return holidays.map(holiday => ({
                id: holiday.id,
                name: holiday.name,
                date: holiday.date,
                type: holiday.type,
                description: holiday.description || undefined,
                isRecurring: holiday.isRecurring
            }));
        }
        catch (error) {
            console.error('Error fetching upcoming holidays:', error);
            return [];
        }
    }
    static async getTeamInfo(employeeId) {
        try {
            const employee = await prisma_1.default.user.findUnique({
                where: { id: employeeId },
                select: {
                    managerId: true,
                    department: true
                }
            });
            if (!employee) {
                throw new Error('Employee not found');
            }
            const teamMembers = await prisma_1.default.user.findMany({
                where: {
                    managerId: employee.managerId,
                    isActive: true,
                    id: { not: employeeId }
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    profilePicture: true
                },
                take: app_1.APP_CONFIG.DASHBOARD.DEFAULT_LIMITS.RECENT_ACTIVITIES
            });
            const manager = await prisma_1.default.user.findUnique({
                where: { id: employee.managerId || '' },
                select: {
                    name: true,
                    email: true
                }
            });
            const onLeaveMembers = await prisma_1.default.leaveRequest.findMany({
                where: {
                    user: { managerId: employee.managerId },
                    status: 'approved',
                    startDate: { lte: new Date() },
                    endDate: { gte: new Date() }
                },
                select: {
                    userId: true,
                    endDate: true
                }
            });
            const teamMembersWithLeaveStatus = teamMembers.map(member => {
                const onLeave = onLeaveMembers.find(leave => leave.userId === member.id);
                return {
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    position: 'Employee',
                    avatar: member.profilePicture || undefined,
                    isOnLeave: !!onLeave,
                    leaveEndDate: onLeave?.endDate
                };
            });
            return {
                teamSize: teamMembers.length + 1,
                managerName: manager?.name || app_1.APP_CONFIG.DASHBOARD.DEFAULT_VALUES.MANAGER_NAME,
                managerEmail: manager?.email || '',
                department: employee.department || 'Unassigned',
                teamMembers: teamMembersWithLeaveStatus
            };
        }
        catch (error) {
            console.error('Error fetching team info:', error);
            throw new Error('Failed to fetch team information');
        }
    }
    static async getPerformanceMetrics(employeeId) {
        try {
            const overall = 4.2;
            const attendance = 4.5;
            const productivity = 4.0;
            const teamwork = 4.3;
            const communication = 4.1;
            const lastReviewDate = new Date();
            lastReviewDate.setMonth(lastReviewDate.getMonth() - 3);
            const nextReviewDate = new Date();
            nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);
            const goals = [
                {
                    id: '1',
                    title: 'Complete Project Alpha',
                    description: 'Finish the main project deliverables',
                    targetDate: new Date(Date.now() + app_1.APP_CONFIG.TIME.DAYS.PROJECT_DAYS * app_1.APP_CONFIG.TIME.MILLISECONDS.DAY),
                    progress: 75,
                    status: 'in_progress',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: '2',
                    title: 'Improve Team Collaboration',
                    description: 'Enhance communication with team members',
                    targetDate: new Date(Date.now() + app_1.APP_CONFIG.TIME.DAYS.TRAINING_DAYS * app_1.APP_CONFIG.TIME.MILLISECONDS.DAY),
                    progress: 40,
                    status: 'in_progress',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ];
            const achievements = [
                {
                    id: '1',
                    title: 'Employee of the Month',
                    description: 'Recognized for outstanding performance',
                    type: 'award',
                    date: new Date(Date.now() - app_1.APP_CONFIG.TIME.DAYS.ACHIEVEMENT_DAYS * app_1.APP_CONFIG.TIME.MILLISECONDS.DAY),
                    issuer: 'HR Department',
                    badge: 'https://example.com/badge.png'
                },
                {
                    id: '2',
                    title: 'Project Completion Certificate',
                    description: 'Successfully completed major project',
                    type: 'certification',
                    date: new Date(Date.now() - app_1.APP_CONFIG.TIME.DAYS.REVIEW_PERIOD * app_1.APP_CONFIG.TIME.MILLISECONDS.DAY),
                    issuer: 'Project Manager'
                }
            ];
            return {
                overall,
                attendance,
                productivity,
                teamwork,
                communication,
                lastReviewDate,
                nextReviewDate,
                goals,
                achievements
            };
        }
        catch (error) {
            console.error('Error fetching performance metrics:', error);
            throw new Error('Failed to fetch performance metrics');
        }
    }
    static async getNotifications(employeeId, limit = app_1.APP_CONFIG.DASHBOARD.DEFAULT_LIMITS.NOTIFICATIONS) {
        try {
            const notifications = [
                {
                    id: '1',
                    title: 'Leave Request Approved',
                    message: 'Your annual leave request has been approved',
                    type: 'success',
                    isRead: false,
                    createdAt: new Date(Date.now() - app_1.APP_CONFIG.TIME.DAYS.NOTIFICATION_DAYS * app_1.APP_CONFIG.TIME.MILLISECONDS.HOUR),
                    actionUrl: '/employee/history'
                },
                {
                    id: '2',
                    title: 'Performance Review Due',
                    message: 'Your quarterly performance review is scheduled for next week',
                    type: 'info',
                    isRead: false,
                    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
                    actionUrl: '/employee/profile'
                },
                {
                    id: '3',
                    title: 'Holiday Reminder',
                    message: 'Christmas holiday is coming up next week',
                    type: 'info',
                    isRead: true,
                    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
                }
            ];
            return notifications.slice(0, limit);
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            return [];
        }
    }
    static async getQuickStats(employeeId, startDate, endDate) {
        try {
            const [totalRequests, approvedRequests, rejectedRequests, pendingRequests] = await Promise.all([
                prisma_1.default.leaveRequest.count({
                    where: {
                        userId: employeeId,
                        submittedAt: { gte: startDate, lte: endDate }
                    }
                }),
                prisma_1.default.leaveRequest.count({
                    where: {
                        userId: employeeId,
                        status: 'approved',
                        submittedAt: { gte: startDate, lte: endDate }
                    }
                }),
                prisma_1.default.leaveRequest.count({
                    where: {
                        userId: employeeId,
                        status: 'rejected',
                        submittedAt: { gte: startDate, lte: endDate }
                    }
                }),
                prisma_1.default.leaveRequest.count({
                    where: {
                        userId: employeeId,
                        status: 'pending'
                    }
                })
            ]);
            const usedDaysResult = await prisma_1.default.leaveRequest.aggregate({
                where: {
                    userId: employeeId,
                    status: 'approved',
                    submittedAt: { gte: startDate, lte: endDate }
                },
                _sum: {
                    totalDays: true
                }
            });
            const daysUsedThisYear = Number(usedDaysResult._sum.totalDays) || 0;
            const daysRemaining = 25 - daysUsedThisYear;
            const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;
            const averageResponseTime = 24;
            return {
                totalRequests,
                approvedRequests,
                rejectedRequests,
                pendingRequests,
                daysUsedThisYear,
                daysRemaining: Math.max(0, daysRemaining),
                averageResponseTime,
                approvalRate: Math.round(approvalRate * 100) / 100
            };
        }
        catch (error) {
            console.error('Error fetching quick stats:', error);
            throw new Error('Failed to fetch quick statistics');
        }
    }
    static determinePriority(request) {
        const days = Number(request.totalDays) || 0;
        const isEmergency = request.leaveType?.toLowerCase().includes('emergency');
        const isSick = request.leaveType?.toLowerCase().includes('sick');
        if (isEmergency || (isSick && days > 3)) {
            return 'high';
        }
        else if (days > 7 || isSick) {
            return 'medium';
        }
        else {
            return 'low';
        }
    }
}
exports.EmployeeDashboardService = EmployeeDashboardService;
//# sourceMappingURL=dashboardService.js.map