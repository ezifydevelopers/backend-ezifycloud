"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessRulesService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class BusinessRulesService {
    static async validateLeaveRequest(userId, leaveRequest) {
        try {
            const result = {
                isValid: true,
                canSubmit: true,
                requiresApproval: true,
                warnings: [],
                suggestions: []
            };
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    manager: true
                }
            });
            if (!user) {
                return {
                    isValid: false,
                    canSubmit: false,
                    requiresApproval: false,
                    message: 'User not found'
                };
            }
            const policies = await prisma.leavePolicy.findMany({
                where: { isActive: true }
            });
            const policy = policies.find(p => p.leaveType === leaveRequest.leaveType);
            if (!policy) {
                return {
                    isValid: false,
                    canSubmit: false,
                    requiresApproval: false,
                    message: `No active policy found for ${leaveRequest.leaveType} leave`
                };
            }
            const totalDays = this.calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate, leaveRequest.isHalfDay);
            const balanceResult = await this.validateLeaveBalance(userId, leaveRequest.leaveType, totalDays);
            if (!balanceResult.isValid) {
                result.isValid = false;
                result.canSubmit = false;
                result.message = balanceResult.message;
                return result;
            }
            const noticeResult = this.validateNoticePeriod(leaveRequest.startDate, leaveRequest.leaveType);
            if (!noticeResult.isValid) {
                result.warnings?.push(noticeResult.message);
                result.suggestions?.push('Consider submitting with more advance notice');
            }
            const holidayConflicts = await this.checkHolidayConflicts(leaveRequest.startDate, leaveRequest.endDate);
            if (holidayConflicts.length > 0) {
                result.conflictWithHolidays = holidayConflicts;
                result.warnings?.push(`Leave period conflicts with holidays: ${holidayConflicts.join(', ')}`);
            }
            const overlappingRequests = await this.checkOverlappingRequests(userId, leaveRequest.startDate, leaveRequest.endDate);
            if (overlappingRequests.length > 0) {
                result.conflictWithOtherRequests = overlappingRequests;
                result.warnings?.push(`Leave period overlaps with ${overlappingRequests.length} existing request(s)`);
                result.suggestions?.push('Review overlapping periods with your manager');
            }
            const maxDaysResult = this.validateMaxConsecutiveDays(totalDays, policy, leaveRequest.leaveType);
            if (!maxDaysResult.isValid) {
                result.isValid = false;
                result.canSubmit = false;
                result.message = maxDaysResult.message;
                return result;
            }
            result.requiresApproval = policy.requiresApproval;
            if (result.requiresApproval && user.manager) {
                result.estimatedApprovalTime = this.estimateApprovalTime(leaveRequest.leaveType, totalDays, user.department || undefined);
            }
            if (leaveRequest.leaveType === 'emergency') {
                const emergencyResult = this.validateEmergencyLeave(leaveRequest.reason);
                if (!emergencyResult.isValid) {
                    result.warnings?.push(emergencyResult.message);
                }
            }
            if (['maternity', 'paternity'].includes(leaveRequest.leaveType)) {
                const parentalResult = await this.validateParentalLeave(userId, leaveRequest.leaveType, leaveRequest.startDate);
                if (!parentalResult.isValid) {
                    result.warnings?.push(parentalResult.message);
                }
            }
            return result;
        }
        catch (error) {
            console.error('Error validating leave request:', error);
            return {
                isValid: false,
                canSubmit: false,
                requiresApproval: false,
                message: 'Error validating leave request'
            };
        }
    }
    static async autoAssignManager(employeeData) {
        try {
            const result = {
                isValid: true,
                warnings: [],
                suggestions: []
            };
            if (employeeData.role !== 'employee') {
                return {
                    isValid: true,
                    message: 'No manager assignment needed for non-employee roles'
                };
            }
            if (employeeData.managerId) {
                const manager = await prisma.user.findUnique({
                    where: { id: employeeData.managerId }
                });
                if (manager && manager.role === 'manager' && manager.isActive) {
                    result.assignedManagerId = employeeData.managerId;
                    result.assignmentReason = 'Pre-specified manager';
                    return result;
                }
                else {
                    result.warnings?.push('Specified manager is invalid or inactive');
                }
            }
            if (employeeData.department) {
                const departmentManager = await prisma.user.findFirst({
                    where: {
                        role: 'manager',
                        department: employeeData.department,
                        isActive: true
                    },
                    select: {
                        id: true,
                        name: true,
                        subordinates: {
                            select: { id: true }
                        }
                    }
                });
                if (departmentManager) {
                    if (departmentManager.subordinates.length < 10) {
                        result.assignedManagerId = departmentManager.id;
                        result.assignmentReason = `Department manager in ${employeeData.department}`;
                        return result;
                    }
                    else {
                        result.warnings?.push(`Department manager has reached capacity (${departmentManager.subordinates.length}/10)`);
                    }
                }
            }
            const availableManagers = await prisma.user.findMany({
                where: {
                    role: 'manager',
                    isActive: true
                },
                select: {
                    id: true,
                    name: true,
                    department: true,
                    subordinates: {
                        select: { id: true }
                    }
                },
                orderBy: {
                    subordinates: {
                        _count: 'asc'
                    }
                },
                take: 3
            });
            if (availableManagers.length > 0) {
                const bestManager = availableManagers[0];
                result.assignedManagerId = bestManager.id;
                result.assignmentReason = `Manager with least direct reports (${bestManager.subordinates.length})`;
                result.fallbackOptions = availableManagers.slice(1).map(manager => ({
                    managerId: manager.id,
                    managerName: manager.name,
                    reason: `${manager.department} department, ${manager.subordinates.length} direct reports`
                }));
                return result;
            }
            result.isValid = false;
            result.message = 'No active managers available for assignment';
            result.suggestions?.push('Create a manager account first');
            return result;
        }
        catch (error) {
            console.error('Error in auto-assign manager:', error);
            return {
                isValid: false,
                message: 'Error assigning manager'
            };
        }
    }
    static async calculateLeaveBalance(userId, year = new Date().getFullYear()) {
        try {
            const policies = await prisma.leavePolicy.findMany({
                where: { isActive: true }
            });
            const policyMap = new Map();
            policies.forEach(policy => {
                policyMap.set(policy.leaveType, policy.totalDaysPerYear);
            });
            const startDate = new Date(year, 0, 1);
            const endDate = new Date(year, 11, 31);
            const requests = await prisma.leaveRequest.findMany({
                where: {
                    userId,
                    submittedAt: { gte: startDate, lte: endDate }
                },
                select: {
                    leaveType: true,
                    totalDays: true,
                    status: true
                }
            });
            const usedDays = {};
            const pendingDays = {};
            requests.forEach(request => {
                const days = Number(request.totalDays);
                const leaveType = request.leaveType;
                if (request.status === 'approved') {
                    usedDays[leaveType] = (usedDays[leaveType] || 0) + days;
                }
                else if (request.status === 'pending') {
                    pendingDays[leaveType] = (pendingDays[leaveType] || 0) + days;
                }
            });
            const result = {};
            policyMap.forEach((totalDays, leaveType) => {
                const used = usedDays[leaveType] || 0;
                const pending = pendingDays[leaveType] || 0;
                const remaining = Math.max(0, totalDays - used - pending);
                result[leaveType] = {
                    total: totalDays,
                    used,
                    remaining,
                    pending
                };
            });
            return result;
        }
        catch (error) {
            console.error('Error calculating leave balance:', error);
            return {};
        }
    }
    static async validateLeaveBalance(userId, leaveType, requestedDays) {
        const balance = await this.calculateLeaveBalance(userId);
        const leaveBalance = balance[leaveType];
        if (!leaveBalance) {
            return {
                isValid: false,
                message: `No leave policy found for ${leaveType} leave`
            };
        }
        const newBalance = leaveBalance.remaining - requestedDays;
        if (newBalance < 0) {
            const excessDays = Math.abs(newBalance);
            return {
                isValid: true,
                message: `Leave request will result in negative balance. ${excessDays} days will be deducted from salary.`,
                warnings: [`Excess leave: ${excessDays} days`, `Salary deduction will apply for ${excessDays} days`],
                salaryDeduction: {
                    days: excessDays,
                    amount: await this.calculateSalaryDeduction(userId, excessDays)
                }
            };
        }
        return { isValid: true };
    }
    static async calculateSalaryDeduction(userId, excessDays) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                }
            });
            if (!user) {
                return 0;
            }
            const defaultDailyRate = 1000;
            const deductionAmount = excessDays * defaultDailyRate;
            return deductionAmount;
        }
        catch (error) {
            console.error('Error calculating salary deduction:', error);
            return 0;
        }
    }
    static validateNoticePeriod(startDate, leaveType) {
        const today = new Date();
        const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const noticeRequirements = {
            annual: 7,
            sick: 0,
            casual: 1,
            emergency: 0,
            maternity: 30,
            paternity: 14
        };
        const requiredNotice = noticeRequirements[leaveType] || 1;
        if (daysUntilStart < requiredNotice) {
            return {
                isValid: true,
                message: `Short notice period: ${daysUntilStart} days (recommended: ${requiredNotice} days)`,
                warnings: [`Short notice: ${daysUntilStart} days`, `Recommended: ${requiredNotice} days advance notice`],
                suggestions: ['Consider providing more advance notice when possible', 'Manager approval required for short notice requests']
            };
        }
        return { isValid: true };
    }
    static async checkHolidayConflicts(startDate, endDate) {
        const holidays = await prisma.holiday.findMany({
            where: {
                isActive: true,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                name: true,
                date: true
            }
        });
        return holidays.map(holiday => `${holiday.name} (${holiday.date.toLocaleDateString()})`);
    }
    static async checkOverlappingRequests(userId, startDate, endDate) {
        const overlappingRequests = await prisma.leaveRequest.findMany({
            where: {
                userId,
                status: { in: ['pending', 'approved'] },
                OR: [
                    {
                        startDate: { lte: endDate },
                        endDate: { gte: startDate }
                    }
                ]
            },
            select: {
                id: true,
                leaveType: true,
                startDate: true,
                endDate: true,
                status: true
            }
        });
        return overlappingRequests.map(request => `${request.leaveType} leave (${request.startDate.toLocaleDateString()} - ${request.endDate.toLocaleDateString()}) - ${request.status}`);
    }
    static validateMaxConsecutiveDays(requestedDays, policy, leaveType) {
        const recommendedConsecutiveDays = {
            annual: 15,
            sick: 30,
            casual: 3,
            emergency: 5,
            maternity: 180,
            paternity: 30
        };
        const recommendedMax = recommendedConsecutiveDays[leaveType] || 10;
        if (requestedDays > recommendedMax) {
            const excessDays = requestedDays - recommendedMax;
            return {
                isValid: true,
                message: `Extended leave period: ${requestedDays} days (${excessDays} days beyond recommended ${recommendedMax} days)`,
                warnings: [
                    `Extended ${leaveType} leave: ${requestedDays} days`,
                    `Recommended maximum: ${recommendedMax} days`,
                    `Excess: ${excessDays} days`,
                    'Manager approval required for extended leave periods'
                ],
                suggestions: [
                    'Consider breaking into smaller periods if possible',
                    'Ensure proper work handover for extended absence',
                    'Verify business impact with your manager'
                ]
            };
        }
        return { isValid: true };
    }
    static estimateApprovalTime(leaveType, days, department) {
        if (leaveType === 'emergency') {
            return '2-4 hours';
        }
        else if (leaveType === 'sick') {
            return '1-2 business days';
        }
        else if (days > 10) {
            return '3-5 business days';
        }
        else {
            return '1-3 business days';
        }
    }
    static validateEmergencyLeave(reason) {
        const emergencyKeywords = ['emergency', 'urgent', 'critical', 'immediate', 'family', 'medical'];
        const hasEmergencyKeyword = emergencyKeywords.some(keyword => reason.toLowerCase().includes(keyword));
        if (!hasEmergencyKeyword) {
            return {
                isValid: false,
                message: 'Emergency leave requires justification with emergency keywords'
            };
        }
        return { isValid: true };
    }
    static async validateParentalLeave(userId, leaveType, startDate) {
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31);
        const existingParentalLeave = await prisma.leaveRequest.findFirst({
            where: {
                userId,
                leaveType: { in: ['maternity', 'paternity'] },
                status: 'approved',
                submittedAt: { gte: startOfYear, lte: endOfYear }
            }
        });
        if (existingParentalLeave) {
            return {
                isValid: false,
                message: `Only one ${leaveType} leave allowed per year`
            };
        }
        return { isValid: true };
    }
    static calculateLeaveDays(startDate, endDate, isHalfDay) {
        if (isHalfDay) {
            return 0.5;
        }
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        return daysDiff;
    }
}
exports.BusinessRulesService = BusinessRulesService;
exports.default = BusinessRulesService;
//# sourceMappingURL=businessRulesService.js.map