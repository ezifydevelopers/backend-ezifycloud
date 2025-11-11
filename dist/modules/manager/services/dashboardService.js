"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerDashboardService = void 0;
const client_1 = require("@prisma/client");
const app_1 = require("../../../config/app");
const prisma = new client_1.PrismaClient();
class ManagerDashboardService {
    static async getDashboardStats(managerId, dateRange) {
        try {
            const startDate = dateRange?.startDate || new Date(new Date().getFullYear(), 0, 1);
            const endDate = dateRange?.endDate || new Date();
            const teamMembers = await prisma.user.findMany({
                where: {
                    managerId: managerId,
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true
                }
            });
            const teamMemberIds = teamMembers.map(member => member.id);
            const [teamSize, activeTeamMembers, pendingApprovals, approvedThisMonth, rejectedThisMonth] = await Promise.all([
                prisma.user.count({
                    where: { managerId: managerId }
                }),
                prisma.user.count({
                    where: {
                        managerId: managerId,
                        isActive: true
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId },
                        status: 'pending'
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId },
                        status: 'approved',
                        submittedAt: { gte: startDate, lte: endDate }
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId },
                        status: 'rejected',
                        submittedAt: { gte: startDate, lte: endDate }
                    }
                })
            ]);
            const teamLeaveBalance = await this.getTeamLeaveBalance(teamMemberIds, startDate, endDate);
            const upcomingLeaves = await this.getUpcomingLeaves(managerId, 5);
            const pendingRequests = await this.getPendingRequests(managerId, 5);
            const recentActivities = await this.getRecentActivities(managerId, app_1.APP_CONFIG.DASHBOARD.DEFAULT_LIMITS.RECENT_ACTIVITIES);
            const teamPerformance = await this.getTeamPerformanceMetrics(managerId);
            const departmentStats = await this.getManagerDepartmentStats(managerId, startDate, endDate);
            const actualData = {
                teamSize: teamSize,
                activeTeamMembers: activeTeamMembers,
                pendingApprovals: pendingApprovals,
                approvedThisMonth: approvedThisMonth,
                rejectedThisMonth: rejectedThisMonth,
                teamLeaveBalance: teamLeaveBalance,
                upcomingLeaves: upcomingLeaves,
                pendingRequests: pendingRequests,
                recentActivities: recentActivities,
                teamPerformance: teamPerformance,
                departmentStats: departmentStats
            };
            console.log('🔍 ManagerDashboardService: Returning actual stats:', actualData);
            return actualData;
        }
        catch (error) {
            console.error('Error fetching manager dashboard stats:', error);
            throw new Error('Failed to fetch manager dashboard statistics');
        }
    }
    static async getTeamLeaveBalance(teamMemberIds, startDate, endDate) {
        try {
            const currentYear = new Date().getFullYear();
            const leavePolicies = await prisma.leavePolicy.findMany({
                where: {
                    isActive: true
                },
                select: {
                    leaveType: true,
                    totalDaysPerYear: true
                }
            });
            const dynamicTeamLeaveBalance = {};
            let totalTeamDays = 0;
            let totalUsedDays = 0;
            for (const policy of leavePolicies) {
                const leaveType = policy.leaveType;
                const teamTotal = teamMemberIds.length * policy.totalDaysPerYear;
                const usedDays = await this.calculateTeamUsedDays(teamMemberIds, leaveType, currentYear);
                const remainingDays = Math.max(0, teamTotal - usedDays);
                dynamicTeamLeaveBalance[leaveType] = {
                    total: teamTotal,
                    used: usedDays,
                    remaining: remainingDays
                };
                totalTeamDays += teamTotal;
                totalUsedDays += usedDays;
            }
            const utilizationRate = totalTeamDays > 0 ? (totalUsedDays / totalTeamDays) * 100 : 0;
            return {
                ...dynamicTeamLeaveBalance,
                utilizationRate: Math.round(utilizationRate * 100) / 100
            };
        }
        catch (error) {
            console.error('Error fetching team leave balance:', error);
            return {
                utilizationRate: 0
            };
        }
    }
    static async calculateTeamUsedDays(teamMemberIds, leaveType, year) {
        try {
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            const approvedRequests = await prisma.leaveRequest.findMany({
                where: {
                    userId: { in: teamMemberIds },
                    leaveType: leaveType,
                    status: 'approved',
                    submittedAt: { gte: startDate, lte: endDate }
                },
                select: {
                    totalDays: true
                }
            });
            return approvedRequests.reduce((sum, request) => sum + Number(request.totalDays), 0);
        }
        catch (error) {
            console.error('Error calculating team used days:', error);
            return 0;
        }
    }
    static async getPendingRequests(managerId, limit = 5) {
        try {
            const pendingRequests = await prisma.leaveRequest.findMany({
                where: {
                    user: { managerId: managerId },
                    status: 'pending'
                },
                take: limit,
                orderBy: { submittedAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profilePicture: true
                        }
                    }
                }
            });
            return pendingRequests.map(request => ({
                id: request.id,
                employeeId: request.userId,
                employeeName: request.user.name,
                employeeEmail: request.user.email,
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                days: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                priority: this.determinePriority(request),
                submittedAt: request.submittedAt,
                avatar: request.user.profilePicture || undefined
            }));
        }
        catch (error) {
            console.error('Error fetching pending requests:', error);
            return [];
        }
    }
    static async getUpcomingLeaves(managerId, limit = 5) {
        try {
            const upcomingLeaves = await prisma.leaveRequest.findMany({
                where: {
                    user: { managerId: managerId },
                    status: { in: ['pending', 'approved'] },
                    startDate: { gte: new Date() }
                },
                take: limit,
                orderBy: { startDate: 'asc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profilePicture: true
                        }
                    }
                }
            });
            return upcomingLeaves.map(leave => ({
                id: leave.id,
                employeeId: leave.userId,
                employeeName: leave.user.name,
                employeeEmail: leave.user.email,
                leaveType: leave.leaveType,
                startDate: leave.startDate,
                endDate: leave.endDate,
                days: Number(leave.totalDays),
                reason: leave.reason,
                status: leave.status,
                priority: this.determinePriority(leave),
                submittedAt: leave.submittedAt,
                avatar: leave.user.profilePicture || undefined
            }));
        }
        catch (error) {
            console.error('Error fetching upcoming leaves:', error);
            return [];
        }
    }
    static async getRecentActivities(managerId, limit = app_1.APP_CONFIG.DASHBOARD.DEFAULT_LIMITS.RECENT_ACTIVITIES) {
        try {
            const activities = [];
            const recentLeaveRequests = await prisma.leaveRequest.findMany({
                where: {
                    user: { managerId: managerId }
                },
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            const recentApprovals = await prisma.leaveRequest.findMany({
                where: {
                    approvedBy: managerId
                },
                take: limit,
                orderBy: { approvedAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            recentLeaveRequests.forEach(request => {
                activities.push({
                    id: `leave_request_${request.id}`,
                    type: 'leave_request',
                    title: 'New Leave Request',
                    description: `${request.user.name} requested ${Number(request.totalDays)} days of ${request.leaveType} leave`,
                    employeeId: request.userId,
                    employeeName: request.user.name,
                    employeeEmail: request.user.email,
                    timestamp: request.createdAt,
                    metadata: {
                        leaveType: request.leaveType,
                        days: Number(request.totalDays),
                        status: request.status
                    }
                });
            });
            recentApprovals.forEach(request => {
                activities.push({
                    id: `leave_approval_${request.id}`,
                    type: request.status === 'approved' ? 'leave_approval' : 'leave_rejection',
                    title: request.status === 'approved' ? 'Leave Approved' : 'Leave Rejected',
                    description: `${request.user.name}'s ${request.leaveType} leave request was ${request.status}`,
                    employeeId: request.userId,
                    employeeName: request.user.name,
                    employeeEmail: request.user.email,
                    timestamp: request.approvedAt || request.createdAt,
                    metadata: {
                        leaveType: request.leaveType,
                        days: Number(request.totalDays),
                        status: request.status
                    }
                });
            });
            return activities
                .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                .slice(0, limit);
        }
        catch (error) {
            console.error('Error fetching recent activities:', error);
            return [];
        }
    }
    static async getTeamPerformanceMetrics(managerId) {
        try {
            const teamMembers = await prisma.user.findMany({
                where: {
                    managerId: managerId,
                    isActive: true
                }
            });
            if (teamMembers.length === 0) {
                return {
                    averageResponseTime: 0,
                    approvalRate: 0,
                    teamSatisfaction: 0,
                    productivityScore: 0,
                    leaveUtilization: 0
                };
            }
            const [totalRequests, approvedRequests, rejectedRequests] = await Promise.all([
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId }
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId },
                        status: 'approved'
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId },
                        status: 'rejected'
                    }
                })
            ]);
            const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;
            const rejectionRate = totalRequests > 0 ? (rejectedRequests / totalRequests) * 100 : 0;
            const averageResponseTime = 24;
            const teamSatisfaction = 4.2;
            const productivityScore = app_1.APP_CONFIG.DASHBOARD.PERFORMANCE.SCALE.DEFAULT;
            const leaveUtilization = 65;
            return {
                averageResponseTime,
                approvalRate: Math.round(approvalRate * 100) / 100,
                teamSatisfaction,
                productivityScore,
                leaveUtilization
            };
        }
        catch (error) {
            console.error('Error fetching team performance metrics:', error);
            return {
                averageResponseTime: 0,
                approvalRate: 0,
                teamSatisfaction: 0,
                productivityScore: 0,
                leaveUtilization: 0
            };
        }
    }
    static async getManagerDepartmentStats(managerId, startDate, endDate) {
        try {
            const manager = await prisma.user.findUnique({
                where: { id: managerId },
                select: { department: true }
            });
            if (!manager?.department) {
                return [];
            }
            const department = manager.department;
            const [totalMembers, activeMembers, onLeave, leaveRequests] = await Promise.all([
                prisma.user.count({
                    where: { department }
                }),
                prisma.user.count({
                    where: {
                        department,
                        isActive: true
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { department },
                        status: 'approved',
                        startDate: { lte: new Date() },
                        endDate: { gte: new Date() }
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { department },
                        submittedAt: { gte: startDate, lte: endDate }
                    }
                })
            ]);
            const approvedRequests = await prisma.leaveRequest.count({
                where: {
                    user: { department },
                    status: 'approved',
                    submittedAt: { gte: startDate, lte: endDate }
                }
            });
            const approvalRate = leaveRequests > 0 ? (approvedRequests / leaveRequests) * 100 : 0;
            return [{
                    department,
                    totalMembers,
                    activeMembers,
                    onLeave,
                    leaveRequests,
                    averageResponseTime: 24,
                    approvalRate: Math.round(approvalRate * 100) / 100
                }];
        }
        catch (error) {
            console.error('Error fetching manager department stats:', error);
            return [];
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
    static async getQuickStats(managerId) {
        try {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - 7);
            const [teamSize, pendingApprovals, approvedThisWeek, rejectedThisWeek] = await Promise.all([
                prisma.user.count({
                    where: {
                        managerId: managerId,
                        isActive: true
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId },
                        status: 'pending'
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId },
                        status: 'approved',
                        submittedAt: { gte: weekStart }
                    }
                }),
                prisma.leaveRequest.count({
                    where: {
                        user: { managerId: managerId },
                        status: 'rejected',
                        submittedAt: { gte: weekStart }
                    }
                })
            ]);
            return {
                teamSize,
                pendingApprovals,
                approvedThisWeek,
                rejectedThisWeek
            };
        }
        catch (error) {
            console.error('Error fetching quick stats:', error);
            throw new Error('Failed to fetch quick statistics');
        }
    }
    static async getProfile(managerId) {
        try {
            const profile = await prisma.user.findUnique({
                where: { id: managerId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true,
                    phone: true,
                    bio: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });
            if (!profile) {
                throw new Error('Manager profile not found');
            }
            return profile;
        }
        catch (error) {
            console.error('Error fetching manager profile:', error);
            throw new Error('Failed to fetch manager profile');
        }
    }
    static async updateProfile(managerId, profileData) {
        try {
            const updatedProfile = await prisma.user.update({
                where: { id: managerId },
                data: {
                    name: profileData.name,
                    department: profileData.department,
                    phone: profileData.phone,
                    bio: profileData.bio,
                    updatedAt: new Date(),
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true,
                    phone: true,
                    bio: true,
                    createdAt: true,
                    updatedAt: true,
                }
            });
            return updatedProfile;
        }
        catch (error) {
            console.error('Error updating manager profile:', error);
            throw new Error('Failed to update manager profile');
        }
    }
}
exports.ManagerDashboardService = ManagerDashboardService;
//# sourceMappingURL=dashboardService.js.map