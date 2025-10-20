"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
class TeamService {
    static async getTeamMembers(managerId, filters) {
        try {
            const { search = '', department = '', role = '', status = 'all', performance = 'all', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
            const skip = (page - 1) * limit;
            const where = {
                managerId: managerId
            };
            console.log('🔍 TeamService: getTeamMembers called with managerId:', managerId);
            console.log('🔍 TeamService: where clause:', JSON.stringify(where));
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ];
            }
            if (department && department !== 'all') {
                where.department = department;
            }
            if (role && role !== 'all') {
                where.role = role;
            }
            if (status !== 'all') {
                where.isActive = status === 'active';
            }
            const totalCount = await prisma.user.count({ where });
            console.log('🔍 TeamService: totalCount found:', totalCount);
            const teamMembers = await prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            console.log('🔍 TeamService: teamMembers found:', teamMembers.length);
            console.log('🔍 TeamService: teamMembers data:', teamMembers.map(m => ({ id: m.id, name: m.name, managerId: m.managerId })));
            const transformedMembers = await Promise.all(teamMembers.map(async (member) => {
                console.log('🔍 TeamService: Transforming member:', member.name, member.id);
                let leaveBalance, performance, recentLeaves;
                try {
                    leaveBalance = await this.getMemberLeaveBalance(member.id);
                    console.log('🔍 TeamService: Leave balance for', member.name, ':', leaveBalance);
                }
                catch (error) {
                    console.error('🔍 TeamService: Error getting leave balance for', member.name, ':', error);
                    leaveBalance = { annual: 20, sick: 10, casual: 5, emergency: 3 };
                }
                try {
                    performance = await this.getMemberPerformance(member.id);
                    console.log('🔍 TeamService: Performance for', member.name, ':', performance);
                }
                catch (error) {
                    console.error('🔍 TeamService: Error getting performance for', member.name, ':', error);
                    performance = { overall: 4.0, attendance: 4.0, productivity: 4.0, teamwork: 4.0, communication: 4.0, lastReviewDate: new Date(), nextReviewDate: new Date() };
                }
                try {
                    recentLeaves = await this.getMemberRecentLeaves(member.id);
                    console.log('🔍 TeamService: Recent leaves for', member.name, ':', recentLeaves);
                }
                catch (error) {
                    console.error('🔍 TeamService: Error getting recent leaves for', member.name, ':', error);
                    recentLeaves = [];
                }
                let status = 'offline';
                if (member.isActive) {
                    const lastActiveDate = member.updatedAt;
                    const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
                    const today = new Date();
                    const hasActiveLeave = recentLeaves.some(leave => {
                        const startDate = new Date(leave.startDate);
                        const endDate = new Date(leave.endDate);
                        return leave.status === 'approved' && today >= startDate && today <= endDate;
                    });
                    if (hasActiveLeave) {
                        status = 'on-leave';
                    }
                    else if (hoursSinceActive < 24) {
                        status = 'active';
                    }
                    else {
                        status = 'offline';
                    }
                }
                return {
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    department: member.department || 'Unassigned',
                    position: 'Employee',
                    role: member.role,
                    managerId: member.managerId || undefined,
                    managerName: member.manager?.name,
                    isActive: member.isActive,
                    status: status,
                    joinDate: member.createdAt,
                    lastLogin: undefined,
                    leaveBalance,
                    avatar: member.profilePicture || undefined,
                    bio: undefined,
                    performance,
                    recentLeaves,
                    createdAt: member.createdAt,
                    updatedAt: member.updatedAt
                };
            }));
            console.log('🔍 TeamService: Transformed members count:', transformedMembers.length);
            console.log('🔍 TeamService: Transformed members:', transformedMembers.map(m => ({ id: m.id, name: m.name, email: m.email })));
            let filteredMembers = transformedMembers;
            if (performance !== 'all') {
                filteredMembers = transformedMembers.filter(member => {
                    const overallScore = member.performance.overall;
                    switch (performance) {
                        case 'high':
                            return overallScore >= 4;
                        case 'medium':
                            return overallScore >= 3 && overallScore < 4;
                        case 'low':
                            return overallScore < 3;
                        default:
                            return true;
                    }
                });
            }
            const totalPages = Math.ceil(totalCount / limit);
            const pagination = {
                page,
                limit,
                totalPages,
                totalItems: totalCount,
                hasNext: page < totalPages,
                hasPrev: page > 1
            };
            console.log('🔍 TeamService: Final result - teamMembers count:', filteredMembers.length);
            console.log('🔍 TeamService: Final result - teamMembers:', filteredMembers.map(m => ({ id: m.id, name: m.name, email: m.email })));
            return {
                teamMembers: filteredMembers,
                pagination,
                filters,
                totalCount
            };
        }
        catch (error) {
            console.error('Error fetching team members:', error);
            throw new Error('Failed to fetch team members');
        }
    }
    static async getTeamMemberById(managerId, memberId) {
        try {
            const member = await prisma.user.findFirst({
                where: {
                    id: memberId,
                    managerId: managerId
                },
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            if (!member) {
                return null;
            }
            const leaveBalance = await this.getMemberLeaveBalance(member.id);
            const performance = await this.getMemberPerformance(member.id);
            const recentLeaves = await this.getMemberRecentLeaves(member.id);
            let status = 'offline';
            if (member.isActive) {
                const lastActiveDate = member.updatedAt;
                const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
                const today = new Date();
                const hasActiveLeave = recentLeaves.some(leave => {
                    const startDate = new Date(leave.startDate);
                    const endDate = new Date(leave.endDate);
                    return leave.status === 'approved' && today >= startDate && today <= endDate;
                });
                if (hasActiveLeave) {
                    status = 'on-leave';
                }
                else if (hoursSinceActive < 24) {
                    status = 'active';
                }
                else {
                    status = 'offline';
                }
            }
            return {
                id: member.id,
                name: member.name,
                email: member.email,
                department: member.department || 'Unassigned',
                position: 'Employee',
                role: member.role,
                managerId: member.managerId || undefined,
                managerName: member.manager?.name,
                isActive: member.isActive,
                status: status,
                joinDate: member.createdAt,
                lastLogin: undefined,
                leaveBalance,
                avatar: member.profilePicture || undefined,
                bio: undefined,
                performance,
                recentLeaves,
                createdAt: member.createdAt,
                updatedAt: member.updatedAt
            };
        }
        catch (error) {
            console.error('Error fetching team member by ID:', error);
            throw new Error('Failed to fetch team member');
        }
    }
    static async addTeamMember(managerId, memberData) {
        try {
            console.log('🔍 TeamService: addTeamMember called');
            console.log('🔍 TeamService: managerId:', managerId);
            console.log('🔍 TeamService: memberData:', memberData);
            const existingUser = await prisma.user.findUnique({
                where: { email: memberData.email }
            });
            if (existingUser) {
                throw new Error('User with this email already exists');
            }
            const manager = await prisma.user.findUnique({
                where: { id: managerId }
            });
            if (!manager) {
                throw new Error('Manager not found');
            }
            const newUser = await prisma.user.create({
                data: {
                    name: memberData.name,
                    email: memberData.email,
                    department: memberData.department,
                    role: memberData.role,
                    isActive: memberData.isActive ?? true,
                    managerId: managerId,
                    passwordHash: 'TempPassword123!',
                },
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            console.log('✅ TeamService: Team member created successfully:', newUser.id);
            return {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                department: newUser.department || '',
                position: '',
                role: newUser.role === 'admin' ? 'employee' : newUser.role,
                managerId: newUser.managerId || undefined,
                managerName: newUser.manager?.name || undefined,
                isActive: newUser.isActive,
                status: newUser.isActive ? 'active' : 'offline',
                joinDate: newUser.createdAt,
                lastLogin: undefined,
                leaveBalance: { annual: 0, sick: 0, casual: 0, emergency: 0 },
                avatar: undefined,
                bio: undefined,
                performance: {
                    overall: 0,
                    attendance: 0,
                    productivity: 0,
                    teamwork: 0,
                    communication: 0,
                    lastReviewDate: new Date(),
                    nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                },
                recentLeaves: [],
                createdAt: newUser.createdAt,
                updatedAt: newUser.updatedAt
            };
        }
        catch (error) {
            console.error('❌ TeamService: Error adding team member:', error);
            throw error;
        }
    }
    static async updateTeamMember(managerId, memberId, updateData) {
        try {
            const existingMember = await prisma.user.findFirst({
                where: {
                    id: memberId,
                    managerId: managerId
                }
            });
            if (!existingMember) {
                throw new Error('Team member not found or not under your management');
            }
            if (updateData.email && updateData.email !== existingMember.email) {
                const emailExists = await prisma.user.findUnique({
                    where: { email: updateData.email }
                });
                if (emailExists) {
                    throw new Error('User with this email already exists');
                }
            }
            const updateFields = {};
            if (updateData.name !== undefined)
                updateFields.name = updateData.name;
            if (updateData.email !== undefined)
                updateFields.email = updateData.email;
            if (updateData.department !== undefined)
                updateFields.department = updateData.department;
            if (updateData.password) {
                const saltRounds = 12;
                updateFields.passwordHash = await bcryptjs_1.default.hash(updateData.password, saltRounds);
            }
            const member = await prisma.user.update({
                where: { id: memberId },
                data: updateFields,
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            const leaveBalance = await this.getMemberLeaveBalance(member.id);
            const performance = await this.getMemberPerformance(member.id);
            const recentLeaves = await this.getMemberRecentLeaves(member.id);
            let status = 'offline';
            if (member.isActive) {
                const lastActiveDate = member.updatedAt;
                const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
                const today = new Date();
                const hasActiveLeave = recentLeaves.some(leave => {
                    const startDate = new Date(leave.startDate);
                    const endDate = new Date(leave.endDate);
                    return leave.status === 'approved' && today >= startDate && today <= endDate;
                });
                if (hasActiveLeave) {
                    status = 'on-leave';
                }
                else if (hoursSinceActive < 24) {
                    status = 'active';
                }
                else {
                    status = 'offline';
                }
            }
            return {
                id: member.id,
                name: member.name,
                email: member.email,
                department: member.department || 'Unassigned',
                position: 'Employee',
                role: member.role,
                managerId: member.managerId || undefined,
                managerName: member.manager?.name,
                isActive: member.isActive,
                status: status,
                joinDate: member.createdAt,
                lastLogin: undefined,
                leaveBalance,
                avatar: member.profilePicture || undefined,
                bio: undefined,
                performance,
                recentLeaves,
                createdAt: member.createdAt,
                updatedAt: member.updatedAt
            };
        }
        catch (error) {
            console.error('Error updating team member:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to update team member');
        }
    }
    static async toggleTeamMemberStatus(managerId, memberId, isActive) {
        try {
            const existingMember = await prisma.user.findFirst({
                where: {
                    id: memberId,
                    managerId: managerId
                }
            });
            if (!existingMember) {
                throw new Error('Team member not found or not under your management');
            }
            const member = await prisma.user.update({
                where: { id: memberId },
                data: { isActive },
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            const leaveBalance = await this.getMemberLeaveBalance(member.id);
            const performance = await this.getMemberPerformance(member.id);
            const recentLeaves = await this.getMemberRecentLeaves(member.id);
            let status = 'offline';
            if (member.isActive) {
                const lastActiveDate = member.updatedAt;
                const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
                const today = new Date();
                const hasActiveLeave = recentLeaves.some(leave => {
                    const startDate = new Date(leave.startDate);
                    const endDate = new Date(leave.endDate);
                    return leave.status === 'approved' && today >= startDate && today <= endDate;
                });
                if (hasActiveLeave) {
                    status = 'on-leave';
                }
                else if (hoursSinceActive < 24) {
                    status = 'active';
                }
                else {
                    status = 'offline';
                }
            }
            return {
                id: member.id,
                name: member.name,
                email: member.email,
                department: member.department || 'Unassigned',
                position: 'Employee',
                role: member.role,
                managerId: member.managerId || undefined,
                managerName: member.manager?.name,
                isActive: member.isActive,
                status: status,
                joinDate: member.createdAt,
                lastLogin: undefined,
                leaveBalance,
                avatar: member.profilePicture || undefined,
                bio: undefined,
                performance,
                recentLeaves,
                createdAt: member.createdAt,
                updatedAt: member.updatedAt
            };
        }
        catch (error) {
            console.error('Error toggling team member status:', error);
            throw new Error('Failed to toggle team member status');
        }
    }
    static async getMemberPerformance(memberId) {
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
            return {
                overall,
                attendance,
                productivity,
                teamwork,
                communication,
                lastReviewDate,
                nextReviewDate
            };
        }
        catch (error) {
            console.error('Error fetching performance metrics:', error);
            return {
                overall: 0,
                attendance: 0,
                productivity: 0,
                teamwork: 0,
                communication: 0,
                lastReviewDate: new Date(),
                nextReviewDate: new Date()
            };
        }
    }
    static async getMemberRecentLeaves(memberId) {
        try {
            const recentLeaves = await prisma.leaveRequest.findMany({
                where: { userId: memberId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    leaveType: true,
                    startDate: true,
                    endDate: true,
                    totalDays: true,
                    status: true,
                    submittedAt: true
                }
            });
            return recentLeaves.map(leave => ({
                id: leave.id,
                leaveType: leave.leaveType,
                startDate: leave.startDate,
                endDate: leave.endDate,
                days: Number(leave.totalDays),
                status: leave.status,
                submittedAt: leave.submittedAt
            }));
        }
        catch (error) {
            console.error('Error fetching recent leaves:', error);
            return [];
        }
    }
    static async getTeamStats(managerId) {
        try {
            const [totalMembers, activeMembers, onLeave] = await Promise.all([
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
                        status: 'approved',
                        startDate: { lte: new Date() },
                        endDate: { gte: new Date() }
                    }
                })
            ]);
            const teamMembers = await prisma.user.findMany({
                where: { managerId: managerId },
                select: {
                    department: true,
                    role: true
                }
            });
            const byDepartment = teamMembers.reduce((acc, member) => {
                const dept = member.department || 'Unassigned';
                acc[dept] = (acc[dept] || 0) + 1;
                return acc;
            }, {});
            const byRole = teamMembers.reduce((acc, member) => {
                acc[member.role] = (acc[member.role] || 0) + 1;
                return acc;
            }, {});
            const averagePerformance = 4.2;
            const leaveUtilization = 65;
            return {
                totalMembers,
                activeMembers,
                onLeave,
                averagePerformance,
                leaveUtilization,
                byDepartment,
                byRole
            };
        }
        catch (error) {
            console.error('Error fetching team stats:', error);
            throw new Error('Failed to fetch team statistics');
        }
    }
    static async getTeamDepartments(managerId) {
        try {
            const departments = await prisma.user.groupBy({
                by: ['department'],
                where: {
                    managerId: managerId,
                    isActive: true,
                    department: { not: null }
                },
                _count: {
                    department: true
                }
            });
            return departments.map(dept => dept.department).filter(Boolean);
        }
        catch (error) {
            console.error('Error fetching team departments:', error);
            return [];
        }
    }
    static async getTeamMemberLeaveBalance(managerId, memberId) {
        try {
            const member = await prisma.user.findFirst({
                where: {
                    id: memberId,
                    managerId: managerId
                }
            });
            if (!member) {
                throw new Error('Team member not found or not under this manager');
            }
            return await this.getMemberLeaveBalance(memberId);
        }
        catch (error) {
            console.error('Error fetching team member leave balance:', error);
            return {
                annual: 14,
                sick: 5,
                casual: 5,
                emergency: 3
            };
        }
    }
    static async getMemberLeaveBalance(memberId) {
        try {
            const currentYear = new Date().getFullYear();
            console.log('🔍 TeamService: getMemberLeaveBalance called for member:', memberId, 'year:', currentYear);
            const leavePolicies = await prisma.leavePolicy.findMany({
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
            const startDate = new Date(currentYear, 0, 1);
            const endDate = new Date(currentYear, 11, 31);
            const allRequests = await prisma.leaveRequest.findMany({
                where: {
                    userId: memberId,
                    submittedAt: { gte: startDate, lte: endDate }
                },
                select: {
                    leaveType: true,
                    totalDays: true,
                    status: true
                }
            });
            const usedDays = {};
            console.log('🔍 TeamService: Processing leave requests:', allRequests.length);
            allRequests.forEach(request => {
                const days = Number(request.totalDays);
                console.log(`🔍 TeamService: Request - Type: ${request.leaveType}, Days: ${days}, Status: ${request.status}`);
                if (request.status === 'approved') {
                    usedDays[request.leaveType] = (usedDays[request.leaveType] || 0) + days;
                }
            });
            console.log('🔍 TeamService: Calculated used days:', usedDays);
            const result = {
                annual: 0,
                sick: 0,
                casual: 0,
                emergency: 0
            };
            for (const [leaveType, totalDaysPerYear] of policyMap) {
                const used = usedDays[leaveType] || 0;
                const remaining = Math.max(0, totalDaysPerYear - used);
                result[leaveType] = remaining;
            }
            console.log('🔍 TeamService: Final leave balance result:', result);
            const user = await prisma.user.findUnique({
                where: { id: memberId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true
                }
            });
            if (!user) {
                throw new Error('User not found');
            }
            const totalDays = Array.from(policyMap.values()).reduce((sum, days) => sum + days, 0);
            const totalUsedDays = Object.values(usedDays).reduce((sum, days) => sum + days, 0);
            const totalRemainingDays = totalDays - totalUsedDays;
            const comprehensiveResult = {
                userId: user.id,
                userName: user.name,
                userEmail: user.email,
                department: user.department || 'Unassigned',
                leaveBalance: {
                    annual: {
                        total: policyMap.get('annual') || 0,
                        used: usedDays.annual || 0,
                        remaining: result.annual
                    },
                    sick: {
                        total: policyMap.get('sick') || 0,
                        used: usedDays.sick || 0,
                        remaining: result.sick
                    },
                    casual: {
                        total: policyMap.get('casual') || 0,
                        used: usedDays.casual || 0,
                        remaining: result.casual
                    },
                    emergency: {
                        total: policyMap.get('emergency') || 0,
                        used: usedDays.emergency || 0,
                        remaining: result.emergency
                    }
                },
                total: {
                    totalDays,
                    usedDays: totalUsedDays,
                    remainingDays: totalRemainingDays,
                    pendingDays: 0,
                    overallUtilization: totalDays > 0 ? (totalUsedDays / totalDays) * 100 : 0
                }
            };
            console.log('🔍 TeamService: Comprehensive result:', comprehensiveResult);
            return comprehensiveResult;
        }
        catch (error) {
            console.error('Error fetching member leave balance:', error);
            return {
                userId: memberId,
                userName: 'Unknown User',
                userEmail: 'unknown@example.com',
                department: 'Unassigned',
                leaveBalance: {
                    annual: { total: 14, used: 0, remaining: 14 },
                    sick: { total: 5, used: 0, remaining: 5 },
                    casual: { total: 5, used: 0, remaining: 5 },
                    emergency: { total: 3, used: 0, remaining: 3 }
                },
                total: {
                    totalDays: 27,
                    usedDays: 0,
                    remainingDays: 27,
                    pendingDays: 0,
                    overallUtilization: 0
                }
            };
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
            const averageResponseTime = 24;
            const teamSatisfaction = 4.2;
            const productivityScore = 7.5;
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
    static async getTeamCapacityMetrics(managerId) {
        try {
            const teamMembers = await prisma.user.findMany({
                where: {
                    managerId: managerId,
                    isActive: true
                }
            });
            const totalMembers = teamMembers.length;
            const activeMembers = teamMembers.filter(member => member.isActive).length;
            const today = new Date();
            const onLeave = await prisma.leaveRequest.count({
                where: {
                    user: { managerId: managerId },
                    status: 'approved',
                    startDate: { lte: today },
                    endDate: { gte: today }
                }
            });
            console.log('🔍 TeamCapacity: Manager ID:', managerId);
            console.log('🔍 TeamCapacity: Total members:', totalMembers);
            console.log('🔍 TeamCapacity: Active members:', activeMembers);
            console.log('🔍 TeamCapacity: On leave:', onLeave);
            console.log('🔍 TeamCapacity: Available:', activeMembers - onLeave);
            const available = activeMembers - onLeave;
            const utilizationRate = totalMembers > 0 ? Math.round((available / totalMembers) * 100) : 0;
            const capacityScore = totalMembers > 0 ? Math.round((available / totalMembers) * 100) : 0;
            return {
                totalMembers,
                activeMembers,
                onLeave,
                available,
                utilizationRate,
                capacityScore
            };
        }
        catch (error) {
            console.error('Error fetching team capacity metrics:', error);
            return {
                totalMembers: 0,
                activeMembers: 0,
                onLeave: 0,
                available: 0,
                utilizationRate: 0,
                capacityScore: 0
            };
        }
    }
}
exports.TeamService = TeamService;
//# sourceMappingURL=teamService.js.map