"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestService = void 0;
const prisma_1 = __importDefault(require("../../../lib/prisma"));
const businessRulesService_1 = __importDefault(require("../../../services/businessRulesService"));
const policyEnforcementService_1 = __importDefault(require("../../../services/policyEnforcementService"));
class LeaveRequestService {
    static async createLeaveRequest(employeeId, formData) {
        try {
            console.log('🔍 LeaveRequestService: Creating leave request:', {
                employeeId,
                formData,
                startDate: formData.startDate,
                endDate: formData.endDate
            });
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);
            console.log('🔍 LeaveRequestService: Parsed dates:', {
                startDate,
                endDate,
                startDateISO: startDate.toISOString(),
                endDateISO: endDate.toISOString()
            });
            if (startDate > endDate) {
                throw new Error('End date cannot be before start date');
            }
            const timeDiff = endDate.getTime() - startDate.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
            const totalDays = formData.isHalfDay ? 0.5 : daysDiff;
            console.log('🔍 LeaveRequestService: Validating business rules...');
            const businessRulesResult = await businessRulesService_1.default.validateLeaveRequest(employeeId, {
                leaveType: formData.leaveType,
                startDate,
                endDate,
                isHalfDay: formData.isHalfDay || false,
                halfDayPeriod: formData.halfDayPeriod,
                reason: formData.reason
            });
            console.log('🔍 LeaveRequestService: Business rules result:', businessRulesResult);
            if (!businessRulesResult.isValid) {
                console.log('❌ LeaveRequestService: Business rules validation failed:', businessRulesResult.message);
                throw new Error(businessRulesResult.message || 'Business rules validation failed');
            }
            if (businessRulesResult.salaryDeduction) {
                console.log('💰 LeaveRequestService: Salary deduction required:', businessRulesResult.salaryDeduction);
                await this.createSalaryDeductionRecord(employeeId, {
                    leaveType: formData.leaveType,
                    startDate,
                    endDate,
                    excessDays: businessRulesResult.salaryDeduction.days,
                    deductionAmount: businessRulesResult.salaryDeduction.amount,
                    reason: `Excess leave days beyond policy limit`
                });
            }
            console.log('🔍 LeaveRequestService: Enforcing policies...');
            const policyResult = await policyEnforcementService_1.default.enforceLeavePolicies(employeeId, {
                leaveType: formData.leaveType,
                startDate,
                endDate,
                isHalfDay: formData.isHalfDay || false,
                halfDayPeriod: formData.halfDayPeriod,
                reason: formData.reason,
                emergencyContact: formData.emergencyContact,
                workHandover: formData.workHandover
            });
            console.log('🔍 LeaveRequestService: Policy enforcement result:', policyResult);
            if (!policyResult.isCompliant) {
                const criticalViolations = policyResult.violations.filter(v => v.type === 'CRITICAL');
                if (criticalViolations.length > 0) {
                    console.log('❌ LeaveRequestService: Critical policy violation:', criticalViolations[0]);
                    throw new Error(`Policy violation: ${criticalViolations[0].message}`);
                }
            }
            const overlappingRequest = await prisma_1.default.leaveRequest.findFirst({
                where: {
                    userId: employeeId,
                    status: { in: ['pending', 'approved'] },
                    OR: [
                        {
                            startDate: { lte: endDate },
                            endDate: { gte: startDate }
                        }
                    ]
                }
            });
            if (overlappingRequest) {
                throw new Error('You already have a leave request for this period');
            }
            const leaveRequest = await prisma_1.default.leaveRequest.create({
                data: {
                    userId: employeeId,
                    leaveType: formData.leaveType,
                    startDate,
                    endDate,
                    totalDays: totalDays.toString(),
                    reason: formData.reason,
                    isHalfDay: formData.isHalfDay || false,
                    halfDayPeriod: formData.halfDayPeriod || null,
                    status: 'pending',
                    submittedAt: new Date()
                }
            });
            const employee = await prisma_1.default.user.findUnique({
                where: { id: employeeId },
                select: {
                    name: true,
                    email: true,
                    department: true,
                    profilePicture: true
                }
            });
            return {
                id: leaveRequest.id,
                leaveType: leaveRequest.leaveType,
                startDate: leaveRequest.startDate,
                endDate: leaveRequest.endDate,
                days: Number(leaveRequest.totalDays),
                reason: leaveRequest.reason,
                status: leaveRequest.status,
                priority: this.determinePriority(leaveRequest),
                emergencyContact: formData.emergencyContact || undefined,
                workHandover: formData.workHandover || undefined,
                isHalfDay: leaveRequest.isHalfDay,
                halfDayPeriod: leaveRequest.halfDayPeriod,
                submittedAt: leaveRequest.submittedAt,
                reviewedAt: leaveRequest.approvedAt || undefined,
                reviewedBy: leaveRequest.approvedBy || undefined,
                reviewerName: undefined,
                comments: leaveRequest.comments || undefined,
                attachments: [],
                createdAt: leaveRequest.createdAt,
                updatedAt: leaveRequest.updatedAt
            };
        }
        catch (error) {
            console.error('Error creating leave request:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to create leave request');
        }
    }
    static async getLeaveRequests(employeeId, filters) {
        try {
            const { status = 'all', leaveType = '', startDate, endDate, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
            const skip = (page - 1) * limit;
            const where = {
                userId: employeeId
            };
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
            const leaveRequests = await prisma_1.default.leaveRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder }
            });
            const transformedRequests = leaveRequests.map((request) => ({
                id: request.id,
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                days: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                priority: this.determinePriority(request),
                emergencyContact: undefined,
                workHandover: undefined,
                isHalfDay: request.isHalfDay,
                halfDayPeriod: request.halfDayPeriod,
                submittedAt: request.submittedAt,
                reviewedAt: request.approvedAt || undefined,
                reviewedBy: request.approvedBy || undefined,
                reviewerName: undefined,
                comments: request.comments || undefined,
                attachments: [],
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            }));
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
    static async getLeaveRequestById(employeeId, requestId) {
        try {
            const request = await prisma_1.default.leaveRequest.findFirst({
                where: {
                    id: requestId,
                    userId: employeeId
                }
            });
            if (!request) {
                return null;
            }
            return {
                id: request.id,
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                days: Number(request.totalDays),
                reason: request.reason,
                status: request.status,
                priority: this.determinePriority(request),
                emergencyContact: undefined,
                workHandover: undefined,
                isHalfDay: request.isHalfDay,
                halfDayPeriod: request.halfDayPeriod,
                submittedAt: request.submittedAt,
                reviewedAt: request.approvedAt || undefined,
                reviewedBy: request.approvedBy || undefined,
                reviewerName: undefined,
                comments: request.comments || undefined,
                attachments: [],
                createdAt: request.createdAt,
                updatedAt: request.updatedAt
            };
        }
        catch (error) {
            console.error('Error fetching leave request by ID:', error);
            throw new Error('Failed to fetch leave request');
        }
    }
    static async updateLeaveRequest(employeeId, requestId, updateData) {
        try {
            const existingRequest = await prisma_1.default.leaveRequest.findFirst({
                where: {
                    id: requestId,
                    userId: employeeId
                }
            });
            if (!existingRequest) {
                throw new Error('Leave request not found');
            }
            if (existingRequest.status !== 'pending') {
                throw new Error('Cannot update leave request that has been processed');
            }
            const updateFields = {};
            if (updateData.leaveType) {
                updateFields.leaveType = updateData.leaveType;
            }
            if (updateData.startDate) {
                updateFields.startDate = new Date(updateData.startDate);
            }
            if (updateData.endDate) {
                updateFields.endDate = new Date(updateData.endDate);
            }
            if (updateData.reason) {
                updateFields.reason = updateData.reason;
            }
            if (updateData.isHalfDay !== undefined) {
                updateFields.isHalfDay = updateData.isHalfDay;
            }
            if (updateData.halfDayPeriod !== undefined) {
                updateFields.halfDayPeriod = updateData.halfDayPeriod || null;
            }
            if (updateData.startDate || updateData.endDate) {
                const startDate = updateFields.startDate || existingRequest.startDate;
                const endDate = updateFields.endDate || existingRequest.endDate;
                if (startDate >= endDate) {
                    throw new Error('End date must be after start date');
                }
                const timeDiff = endDate.getTime() - startDate.getTime();
                const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                const totalDays = updateFields.isHalfDay ? 0.5 : daysDiff;
                updateFields.totalDays = totalDays;
            }
            const updatedRequest = await prisma_1.default.leaveRequest.update({
                where: { id: requestId },
                data: updateFields
            });
            return {
                id: updatedRequest.id,
                leaveType: updatedRequest.leaveType,
                startDate: updatedRequest.startDate,
                endDate: updatedRequest.endDate,
                days: Number(updatedRequest.totalDays),
                reason: updatedRequest.reason,
                status: updatedRequest.status,
                priority: this.determinePriority(updatedRequest),
                emergencyContact: undefined,
                workHandover: undefined,
                isHalfDay: updatedRequest.isHalfDay,
                halfDayPeriod: updatedRequest.halfDayPeriod,
                submittedAt: updatedRequest.submittedAt,
                reviewedAt: updatedRequest.approvedAt || undefined,
                reviewedBy: updatedRequest.approvedBy || undefined,
                reviewerName: undefined,
                comments: updatedRequest.comments || undefined,
                attachments: [],
                createdAt: updatedRequest.createdAt,
                updatedAt: updatedRequest.updatedAt
            };
        }
        catch (error) {
            console.error('Error updating leave request:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to update leave request');
        }
    }
    static async cancelLeaveRequest(employeeId, requestId) {
        try {
            const request = await prisma_1.default.leaveRequest.findFirst({
                where: {
                    id: requestId,
                    userId: employeeId
                }
            });
            if (!request) {
                throw new Error('Leave request not found');
            }
            if (request.status !== 'pending') {
                throw new Error('Cannot cancel leave request that has been processed');
            }
            await prisma_1.default.leaveRequest.delete({
                where: { id: requestId }
            });
            return true;
        }
        catch (error) {
            console.error('Error canceling leave request:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to cancel leave request');
        }
    }
    static async getLeaveHistory(employeeId, filters) {
        try {
            const { year, leaveType = '', status = 'all', startDate, endDate, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
            const skip = (page - 1) * limit;
            const where = {
                userId: employeeId
            };
            if (year) {
                where.submittedAt = {
                    gte: new Date(year, 0, 1),
                    lte: new Date(year, 11, 31)
                };
            }
            if (leaveType && leaveType !== 'all') {
                where.leaveType = leaveType;
            }
            if (status !== 'all') {
                where.status = status;
            }
            if (startDate) {
                where.startDate = { gte: new Date(startDate) };
            }
            if (endDate) {
                where.endDate = { lte: new Date(endDate) };
            }
            const totalCount = await prisma_1.default.leaveRequest.count({ where });
            const leaveRequests = await prisma_1.default.leaveRequest.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder }
            });
            const leaveHistory = leaveRequests.map((request) => ({
                id: request.id,
                leaveType: request.leaveType,
                startDate: request.startDate,
                endDate: request.endDate,
                days: Number(request.totalDays),
                status: request.status,
                reason: request.reason,
                submittedAt: request.submittedAt,
                reviewedAt: request.approvedAt || undefined,
                reviewedBy: request.approvedBy || undefined,
                reviewerName: undefined,
                comments: request.comments || undefined,
                attachments: []
            }));
            const summary = await this.getLeaveHistorySummary(employeeId, where, year || new Date().getFullYear());
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
                leaveHistory,
                pagination,
                filters,
                totalCount,
                summary
            };
        }
        catch (error) {
            console.error('Error fetching leave history:', error);
            throw new Error('Failed to fetch leave history');
        }
    }
    static async getLeaveHistorySummary(employeeId, whereClause, year) {
        try {
            const [totalRequests, approvedRequests, rejectedRequests, pendingRequests, totalDaysResult, approvedDaysResult, rejectedDaysResult, pendingDaysResult] = await Promise.all([
                prisma_1.default.leaveRequest.count({ where: whereClause }),
                prisma_1.default.leaveRequest.count({ where: { ...whereClause, status: 'approved' } }),
                prisma_1.default.leaveRequest.count({ where: { ...whereClause, status: 'rejected' } }),
                prisma_1.default.leaveRequest.count({ where: { ...whereClause, status: 'pending' } }),
                prisma_1.default.leaveRequest.aggregate({ where: whereClause, _sum: { totalDays: true } }),
                prisma_1.default.leaveRequest.aggregate({ where: { ...whereClause, status: 'approved' }, _sum: { totalDays: true } }),
                prisma_1.default.leaveRequest.aggregate({ where: { ...whereClause, status: 'rejected' }, _sum: { totalDays: true } }),
                prisma_1.default.leaveRequest.aggregate({ where: { ...whereClause, status: 'pending' }, _sum: { totalDays: true } })
            ]);
            const totalDays = Number(totalDaysResult._sum.totalDays) || 0;
            const approvedDays = Number(approvedDaysResult._sum.totalDays) || 0;
            const rejectedDays = Number(rejectedDaysResult._sum.totalDays) || 0;
            const pendingDays = Number(pendingDaysResult._sum.totalDays) || 0;
            const byLeaveType = await prisma_1.default.leaveRequest.groupBy({
                by: ['leaveType'],
                where: whereClause,
                _count: { leaveType: true }
            });
            const leaveTypeStats = {};
            byLeaveType.forEach((item) => {
                leaveTypeStats[item.leaveType] = item._count.leaveType;
            });
            const byMonth = {};
            for (let i = 0; i < 12; i++) {
                const monthStart = new Date(year, i, 1);
                const monthEnd = new Date(year, i + 1, 0);
                const monthRequests = await prisma_1.default.leaveRequest.count({
                    where: {
                        userId: employeeId,
                        startDate: { gte: monthStart },
                        endDate: { lte: monthEnd }
                    }
                });
                byMonth[`${i + 1}`] = monthRequests;
            }
            const averageDaysPerRequest = totalRequests > 0 ? totalDays / totalRequests : 0;
            const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;
            return {
                totalRequests,
                approvedRequests,
                rejectedRequests,
                pendingRequests,
                totalDays,
                approvedDays,
                rejectedDays,
                pendingDays,
                byLeaveType: leaveTypeStats,
                byMonth,
                averageDaysPerRequest: Math.round(averageDaysPerRequest * 100) / 100,
                approvalRate: Math.round(approvalRate * 100) / 100
            };
        }
        catch (error) {
            console.error('Error fetching leave history summary:', error);
            return {
                totalRequests: 0,
                approvedRequests: 0,
                rejectedRequests: 0,
                pendingRequests: 0,
                totalDays: 0,
                approvedDays: 0,
                rejectedDays: 0,
                pendingDays: 0,
                byLeaveType: {},
                byMonth: {},
                averageDaysPerRequest: 0,
                approvalRate: 0
            };
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
    static async createSalaryDeductionRecord(employeeId, deductionData) {
        try {
            console.log('💰 Creating salary deduction record:', deductionData);
            console.log('💰 Salary Deduction Details:', {
                employeeId,
                leaveType: deductionData.leaveType,
                period: `${deductionData.startDate.toISOString().split('T')[0]} to ${deductionData.endDate.toISOString().split('T')[0]}`,
                excessDays: deductionData.excessDays,
                deductionAmount: deductionData.deductionAmount,
                reason: deductionData.reason,
                createdAt: new Date().toISOString()
            });
        }
        catch (error) {
            console.error('Error creating salary deduction record:', error);
        }
    }
}
exports.LeaveRequestService = LeaveRequestService;
//# sourceMappingURL=leaveRequestService.js.map