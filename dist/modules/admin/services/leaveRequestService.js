"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class LeaveRequestService {
    static async getLeaveRequests(filters) {
        try {
            const { search = '', status = 'all', leaveType = '', department = '', startDate, endDate, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
            const skip = (page - 1) * limit;
            const where = {};
            if (search) {
                where.OR = [
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                    { leaveType: { contains: search, mode: 'insensitive' } }
                ];
            }
            if (status !== 'all') {
                where.status = status;
            }
            if (leaveType && leaveType !== 'all') {
                where.leaveType = leaveType;
            }
            if (department && department !== 'all') {
                where.user = { department };
            }
            if (startDate) {
                where.startDate = { gte: new Date(startDate) };
            }
            if (endDate) {
                where.endDate = { lte: new Date(endDate) };
            }
            const totalCount = await prisma.leaveRequest.count({ where });
            const leaveRequests = await prisma.leaveRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true,
                            profilePicture: true
                        }
                    },
                    approver: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            const transformedRequests = leaveRequests.map(request => ({
                id: request.id,
                userId: request.userId,
                userName: request.user.name,
                userEmail: request.user.email,
                department: request.user.department || 'Unassigned',
                employeeId: request.userId,
                employee: {
                    id: request.user.id,
                    name: request.user.name,
                    email: request.user.email,
                    department: request.user.department || 'Unassigned',
                    position: 'Employee',
                    avatar: request.user.profilePicture || undefined
                },
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                totalDays: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                isHalfDay: request.isHalfDay || false,
                halfDayPeriod: request.halfDayPeriod || undefined,
                emergencyContact: undefined,
                workHandover: undefined,
                submittedAt: request.submittedAt,
                approvedAt: request.approvedAt || undefined,
                approvedBy: request.approvedBy || undefined,
                comments: request.comments || undefined,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            }));
            const totalPages = Math.ceil(totalCount / limit);
            const pagination = {
                page,
                limit,
                totalPages,
                totalItems: totalCount,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                hasNext: page < totalPages,
                hasPrev: page > 1
            };
            return {
                leaveRequests: transformedRequests,
                pagination,
                filters,
                totalCount
            };
        }
        catch (error) {
            console.error('Error fetching leave requests:', error);
            throw new Error('Failed to fetch leave requests');
        }
    }
    static async getLeaveRequestById(id) {
        try {
            const request = await prisma.leaveRequest.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true,
                            profilePicture: true
                        }
                    },
                    approver: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            if (!request) {
                return null;
            }
            return {
                id: request.id,
                userId: request.userId,
                userName: request.user.name,
                userEmail: request.user.email,
                department: request.user.department || 'Unassigned',
                employeeId: request.userId,
                employee: {
                    id: request.user.id,
                    name: request.user.name,
                    email: request.user.email,
                    department: request.user.department || 'Unassigned',
                    position: 'Employee',
                    avatar: request.user.profilePicture || undefined
                },
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                totalDays: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                isHalfDay: request.isHalfDay || false,
                halfDayPeriod: request.halfDayPeriod || undefined,
                emergencyContact: undefined,
                workHandover: undefined,
                submittedAt: request.submittedAt,
                approvedAt: request.approvedAt || undefined,
                approvedBy: request.approvedBy || undefined,
                comments: request.comments || undefined,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            };
        }
        catch (error) {
            console.error('Error fetching leave request by ID:', error);
            throw new Error('Failed to fetch leave request');
        }
    }
    static async updateLeaveRequestStatus(id, status, reviewerId, comments) {
        try {
            const request = await prisma.leaveRequest.update({
                where: { id },
                data: {
                    status,
                    approvedAt: new Date(),
                    approvedBy: reviewerId,
                    comments
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true,
                            profilePicture: true
                        }
                    },
                    approver: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            return {
                id: request.id,
                userId: request.userId,
                userName: request.user.name,
                userEmail: request.user.email,
                department: request.user.department || 'Unassigned',
                employeeId: request.userId,
                employee: {
                    id: request.user.id,
                    name: request.user.name,
                    email: request.user.email,
                    department: request.user.department || 'Unassigned',
                    position: 'Employee',
                    avatar: request.user.profilePicture || undefined
                },
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                totalDays: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                isHalfDay: request.isHalfDay || false,
                halfDayPeriod: request.halfDayPeriod || undefined,
                emergencyContact: undefined,
                workHandover: undefined,
                submittedAt: request.submittedAt,
                approvedAt: request.approvedAt || undefined,
                approvedBy: request.approvedBy || undefined,
                comments: request.comments || undefined,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            };
        }
        catch (error) {
            console.error('Error updating leave request status:', error);
            throw new Error('Failed to update leave request status');
        }
    }
    static async bulkUpdateLeaveRequests(requestIds, status, reviewerId, comments) {
        try {
            let updated = 0;
            let failed = 0;
            for (const id of requestIds) {
                try {
                    await prisma.leaveRequest.update({
                        where: { id },
                        data: {
                            status,
                            approvedAt: new Date(),
                            approvedBy: reviewerId,
                            comments
                        }
                    });
                    updated++;
                }
                catch (error) {
                    console.error(`Error updating leave request ${id}:`, error);
                    failed++;
                }
            }
            return { updated, failed };
        }
        catch (error) {
            console.error('Error bulk updating leave requests:', error);
            throw new Error('Failed to bulk update leave requests');
        }
    }
    static async getLeaveRequestStats(dateRange) {
        try {
            const where = dateRange ? {
                createdAt: {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate
                }
            } : {};
            const [total, pending, approved, rejected] = await Promise.all([
                prisma.leaveRequest.count({ where }),
                prisma.leaveRequest.count({ where: { ...where, status: 'pending' } }),
                prisma.leaveRequest.count({ where: { ...where, status: 'approved' } }),
                prisma.leaveRequest.count({ where: { ...where, status: 'rejected' } })
            ]);
            const byLeaveType = await prisma.leaveRequest.groupBy({
                by: ['leaveType'],
                where,
                _count: {
                    leaveType: true
                }
            });
            const byDepartment = await prisma.leaveRequest.groupBy({
                by: ['userId'],
                where,
                _count: {
                    id: true
                }
            });
            const departmentStats = {};
            for (const item of byDepartment) {
                const user = await prisma.user.findUnique({
                    where: { id: item.userId },
                    select: { department: true }
                });
                const department = user?.department || 'Unassigned';
                departmentStats[department] = (departmentStats[department] || 0) + item._count.id;
            }
            const leaveTypeStats = {};
            byLeaveType.forEach(item => {
                leaveTypeStats[item.leaveType] = item._count.leaveType;
            });
            return {
                total,
                pending,
                approved,
                rejected,
                byLeaveType: leaveTypeStats,
                byDepartment: departmentStats
            };
        }
        catch (error) {
            console.error('Error fetching leave request stats:', error);
            throw new Error('Failed to fetch leave request statistics');
        }
    }
    static async getLeaveTypes() {
        try {
            const leaveTypes = await prisma.leaveRequest.groupBy({
                by: ['leaveType'],
                _count: {
                    leaveType: true
                }
            });
            return leaveTypes.map(item => item.leaveType);
        }
        catch (error) {
            console.error('Error fetching leave types:', error);
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
    static async getRecentLeaveRequests(limit = 5) {
        try {
            const requests = await prisma.leaveRequest.findMany({
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true,
                            profilePicture: true
                        }
                    },
                    approver: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            return requests.map(request => ({
                id: request.id,
                userId: request.userId,
                userName: request.user.name,
                userEmail: request.user.email,
                department: request.user.department || 'Unassigned',
                employeeId: request.userId,
                employee: {
                    id: request.user.id,
                    name: request.user.name,
                    email: request.user.email,
                    department: request.user.department || 'Unassigned',
                    position: 'Employee',
                    avatar: request.user.profilePicture || undefined
                },
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                totalDays: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                isHalfDay: request.isHalfDay || false,
                halfDayPeriod: request.halfDayPeriod || undefined,
                emergencyContact: undefined,
                workHandover: undefined,
                submittedAt: request.submittedAt,
                approvedAt: request.approvedAt || undefined,
                approvedBy: request.approvedBy || undefined,
                comments: request.comments || undefined,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            }));
        }
        catch (error) {
            console.error('Error fetching recent leave requests:', error);
            return [];
        }
    }
}
exports.LeaveRequestService = LeaveRequestService;
//# sourceMappingURL=leaveRequestService.js.map