"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalService = void 0;
const prisma_1 = __importDefault(require("../../../lib/prisma"));
class ApprovalService {
    static async getLeaveApprovals(managerId, filters) {
        try {
            const { search = '', status = 'all', leaveType = '', priority = 'all', startDate, endDate, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
            const skip = (page - 1) * limit;
            const where = {
                user: { managerId: managerId }
            };
            console.log('getLeaveApprovals - managerId:', managerId);
            console.log('getLeaveApprovals - filters:', filters);
            console.log('getLeaveApprovals - where:', JSON.stringify(where));
            if (search) {
                where.OR = [
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                    { reason: { contains: search, mode: 'insensitive' } }
                ];
            }
            if (status !== 'all') {
                where.status = status;
            }
            if (leaveType && leaveType !== 'all') {
                where.leaveType = leaveType;
            }
            if (startDate) {
                where.startDate = { gte: new Date(startDate) };
            }
            if (endDate) {
                where.endDate = { lte: new Date(endDate) };
            }
            const totalCount = await prisma_1.default.leaveRequest.count({ where });
            console.log('getLeaveApprovals - totalCount:', totalCount);
            const leaveRequests = await prisma_1.default.leaveRequest.findMany({
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
            const transformedApprovals = leaveRequests.map(request => ({
                id: request.id,
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
                days: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                priority: this.determinePriority(request),
                emergencyContact: undefined,
                workHandover: undefined,
                submittedAt: request.submittedAt,
                reviewedAt: request.approvedAt || undefined,
                reviewedBy: request.approvedBy || undefined,
                reviewerName: request.approver?.name,
                comments: request.comments || undefined,
                attachments: [],
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            }));
            let filteredApprovals = transformedApprovals;
            if (priority !== 'all') {
                filteredApprovals = transformedApprovals.filter(approval => approval.priority === priority);
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
            return {
                approvals: filteredApprovals,
                pagination,
                filters,
                totalCount
            };
        }
        catch (error) {
            console.error('Error fetching leave approvals:', error);
            throw new Error('Failed to fetch leave approvals');
        }
    }
    static async getLeaveApprovalById(managerId, approvalId) {
        try {
            const request = await prisma_1.default.leaveRequest.findFirst({
                where: {
                    id: approvalId,
                    user: { managerId: managerId }
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
            if (!request) {
                return null;
            }
            return {
                id: request.id,
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
                days: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                priority: this.determinePriority(request),
                emergencyContact: undefined,
                workHandover: undefined,
                submittedAt: request.submittedAt,
                reviewedAt: request.approvedAt || undefined,
                reviewedBy: request.approvedBy || undefined,
                reviewerName: request.approver?.name,
                comments: request.comments || undefined,
                attachments: [],
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            };
        }
        catch (error) {
            console.error('Error fetching leave approval by ID:', error);
            throw new Error('Failed to fetch leave approval');
        }
    }
    static async processApprovalAction(managerId, action) {
        try {
            const { requestId, action: actionType, comments, priority } = action;
            const existingRequest = await prisma_1.default.leaveRequest.findFirst({
                where: {
                    id: requestId,
                    user: { managerId: managerId }
                }
            });
            if (!existingRequest) {
                throw new Error('Leave request not found or not under your management');
            }
            if (existingRequest.status !== 'pending') {
                throw new Error('Leave request has already been processed');
            }
            const request = await prisma_1.default.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status: actionType === 'approve' ? 'approved' : 'rejected',
                    approvedAt: new Date(),
                    approvedBy: managerId,
                    comments: comments || null
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
            if (actionType === 'approve') {
                await this.updateLeaveBalance(request.userId, request.leaveType, Number(request.totalDays));
            }
            return {
                id: request.id,
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
                days: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                priority: this.determinePriority(request),
                emergencyContact: undefined,
                workHandover: undefined,
                submittedAt: request.submittedAt,
                reviewedAt: request.approvedAt || undefined,
                reviewedBy: request.approvedBy || undefined,
                reviewerName: request.approver?.name,
                comments: request.comments || undefined,
                attachments: [],
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            };
        }
        catch (error) {
            console.error('Error processing approval action:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to process approval action');
        }
    }
    static async processBulkApprovalAction(managerId, action) {
        try {
            const { requestIds, action: actionType, comments } = action;
            let updated = 0;
            let failed = 0;
            const results = [];
            for (const requestId of requestIds) {
                try {
                    const approvalAction = {
                        requestId,
                        action: actionType,
                        comments
                    };
                    const result = await this.processApprovalAction(managerId, approvalAction);
                    results.push(result);
                    updated++;
                }
                catch (error) {
                    console.error(`Error processing approval for request ${requestId}:`, error);
                    failed++;
                }
            }
            return { updated, failed, results };
        }
        catch (error) {
            console.error('Error processing bulk approval action:', error);
            throw new Error('Failed to process bulk approval action');
        }
    }
    static async getApprovalStats(managerId, dateRange) {
        try {
            console.log('🔍 ApprovalService.getApprovalStats: Starting with managerId:', managerId);
            console.log('🔍 ApprovalService.getApprovalStats: dateRange:', dateRange);
            const where = {
                user: { managerId: managerId },
                ...(dateRange && {
                    submittedAt: {
                        gte: dateRange.startDate,
                        lte: dateRange.endDate
                    }
                })
            };
            console.log('🔍 ApprovalService.getApprovalStats: where clause:', JSON.stringify(where, null, 2));
            const [total, pending, approved, rejected] = await Promise.all([
                prisma_1.default.leaveRequest.count({ where }),
                prisma_1.default.leaveRequest.count({ where: { ...where, status: 'pending' } }),
                prisma_1.default.leaveRequest.count({ where: { ...where, status: 'approved' } }),
                prisma_1.default.leaveRequest.count({ where: { ...where, status: 'rejected' } })
            ]);
            const byLeaveType = await prisma_1.default.leaveRequest.groupBy({
                by: ['leaveType'],
                where,
                _count: {
                    _all: true
                }
            });
            const leaveTypeStats = {};
            byLeaveType.forEach(item => {
                leaveTypeStats[item.leaveType] = item._count._all;
            });
            const approvalRate = total > 0 ? (approved / total) * 100 : 0;
            const averageResponseTime = 24;
            const byPriority = {
                high: Math.floor(total * 0.2),
                medium: Math.floor(total * 0.5),
                low: Math.floor(total * 0.3)
            };
            return {
                totalRequests: total,
                pendingRequests: pending,
                approvedRequests: approved,
                rejectedRequests: rejected,
                averageProcessingTime: averageResponseTime,
                approvalRate: Math.round(approvalRate * 100) / 100,
                byLeaveType: leaveTypeStats,
                byPriority,
                byEmployee: []
            };
        }
        catch (error) {
            console.error('Error fetching approval stats:', error);
            throw new Error('Failed to fetch approval statistics');
        }
    }
    static async getPendingCount(managerId) {
        try {
            return await prisma_1.default.leaveRequest.count({
                where: {
                    user: { managerId: managerId },
                    status: 'pending'
                }
            });
        }
        catch (error) {
            console.error('Error fetching pending count:', error);
            return 0;
        }
    }
    static async getUrgentApprovals(managerId) {
        try {
            const urgentRequests = await prisma_1.default.leaveRequest.findMany({
                where: {
                    user: { managerId: managerId },
                    status: 'pending',
                    OR: [
                        { leaveType: 'emergency' },
                        { leaveType: 'sick' },
                        {
                            submittedAt: {
                                gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                            }
                        }
                    ]
                },
                take: 10,
                orderBy: { submittedAt: 'asc' },
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
            return urgentRequests.map(request => ({
                id: request.id,
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
                days: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                priority: this.determinePriority(request),
                emergencyContact: undefined,
                workHandover: undefined,
                submittedAt: request.submittedAt,
                reviewedAt: request.approvedAt || undefined,
                reviewedBy: request.approvedBy || undefined,
                reviewerName: request.approver?.name,
                comments: request.comments || undefined,
                attachments: [],
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            }));
        }
        catch (error) {
            console.error('Error fetching urgent approvals:', error);
            return [];
        }
    }
    static async updateLeaveBalance(userId, leaveType, days) {
        try {
            const currentYear = new Date().getFullYear();
            const leaveBalance = await prisma_1.default.leaveBalance.findFirst({
                where: {
                    userId: userId,
                    year: currentYear
                }
            });
            if (!leaveBalance) {
                console.warn(`No leave balance found for user ${userId} in year ${currentYear}`);
                return;
            }
            const updateData = {};
            switch (leaveType.toLowerCase()) {
                case 'annual':
                    updateData.annualUsed = leaveBalance.annualUsed + days;
                    updateData.annualRemaining = leaveBalance.annualTotal - (leaveBalance.annualUsed + days);
                    break;
                case 'sick':
                    updateData.sickUsed = leaveBalance.sickUsed + days;
                    updateData.sickRemaining = leaveBalance.sickTotal - (leaveBalance.sickUsed + days);
                    break;
                case 'casual':
                    updateData.casualUsed = leaveBalance.casualUsed + days;
                    updateData.casualRemaining = leaveBalance.casualTotal - (leaveBalance.casualUsed + days);
                    break;
                case 'emergency':
                    console.log('Emergency leave approved - no balance update needed');
                    return;
                default:
                    console.warn(`Unknown leave type: ${leaveType}`);
                    return;
            }
            await prisma_1.default.leaveBalance.update({
                where: { id: leaveBalance.id },
                data: updateData
            });
            console.log(`Updated leave balance for user ${userId}: ${leaveType} - ${days} days`);
        }
        catch (error) {
            console.error('Error updating leave balance:', error);
            throw new Error('Failed to update leave balance');
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
exports.ApprovalService = ApprovalService;
//# sourceMappingURL=approvalService.js.map