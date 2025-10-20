"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyEnforcementService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PolicyEnforcementService {
    static async enforceLeavePolicies(userId, leaveRequest) {
        try {
            const result = {
                isCompliant: true,
                violations: [],
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
                result.violations.push({
                    type: 'CRITICAL',
                    code: 'USER_NOT_FOUND',
                    message: 'User not found'
                });
                result.isCompliant = false;
                return result;
            }
            const policy = await prisma.leavePolicy.findFirst({
                where: {
                    leaveType: leaveRequest.leaveType,
                    isActive: true
                }
            });
            if (!policy) {
                result.violations.push({
                    type: 'CRITICAL',
                    code: 'POLICY_NOT_FOUND',
                    message: `No active policy found for ${leaveRequest.leaveType} leave`
                });
                result.isCompliant = false;
                return result;
            }
            await this.enforceLeaveBalancePolicy(userId, leaveRequest, policy, result);
            await this.enforceNoticePeriodPolicy(leaveRequest, policy, result);
            await this.enforceConsecutiveDaysPolicy(leaveRequest, policy, result);
            await this.enforceHalfDayPolicy(leaveRequest, policy, result);
            await this.enforceDocumentationPolicy(leaveRequest, policy, result);
            await this.enforceApprovalPolicy(leaveRequest, policy, result);
            await this.enforceEmergencyContactPolicy(leaveRequest, policy, result);
            await this.enforceWorkHandoverPolicy(leaveRequest, policy, result);
            await this.enforceHolidayPolicy(leaveRequest, result);
            await this.enforceOverlappingPolicy(userId, leaveRequest, result);
            await this.enforceDepartmentPolicy(user, leaveRequest, result);
            await this.enforceRolePolicy(user, leaveRequest, result);
            result.isCompliant = result.violations.filter(v => v.type === 'CRITICAL').length === 0;
            return result;
        }
        catch (error) {
            console.error('Error enforcing leave policies:', error);
            return {
                isCompliant: false,
                violations: [{
                        type: 'CRITICAL',
                        code: 'ENFORCEMENT_ERROR',
                        message: 'Error enforcing policies'
                    }],
                warnings: [],
                suggestions: []
            };
        }
    }
    static async enforceLeaveBalancePolicy(userId, leaveRequest, policy, result) {
        const totalDays = this.calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate, leaveRequest.isHalfDay);
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, 0, 1);
        const endDate = new Date(currentYear, 11, 31);
        const usedRequests = await prisma.leaveRequest.findMany({
            where: {
                userId,
                leaveType: leaveRequest.leaveType,
                status: { in: ['approved', 'pending'] },
                submittedAt: { gte: startDate, lte: endDate }
            },
            select: {
                totalDays: true,
                status: true
            }
        });
        const usedDays = usedRequests
            .filter(req => req.status === 'approved')
            .reduce((sum, req) => sum + Number(req.totalDays), 0);
        const pendingDays = usedRequests
            .filter(req => req.status === 'pending')
            .reduce((sum, req) => sum + Number(req.totalDays), 0);
        const availableDays = policy.totalDaysPerYear - usedDays - pendingDays;
        if (totalDays > availableDays) {
            const excessDays = totalDays - availableDays;
            result.warnings.push({
                code: 'NEGATIVE_BALANCE_WARNING',
                message: `Leave request will result in negative balance. ${excessDays} days will be deducted from salary.`,
                suggestion: 'Salary deduction will apply for excess days'
            });
        }
        else if (totalDays > availableDays * 0.8) {
            result.warnings.push({
                code: 'LOW_BALANCE_WARNING',
                message: `Leave balance will be low after this request (${availableDays - totalDays} days remaining)`,
                suggestion: 'Consider shorter leave period or different leave type'
            });
        }
    }
    static async enforceNoticePeriodPolicy(leaveRequest, policy, result) {
        const today = new Date();
        const daysUntilStart = Math.ceil((leaveRequest.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const noticeRequirements = {
            annual: 7,
            sick: 0,
            casual: 1,
            emergency: 0,
            maternity: 30,
            paternity: 14
        };
        const requiredNotice = noticeRequirements[leaveRequest.leaveType] || 1;
        if (daysUntilStart < requiredNotice) {
            result.violations.push({
                type: 'WARNING',
                code: 'INSUFFICIENT_NOTICE',
                message: `Insufficient notice period. Required: ${requiredNotice} days, Given: ${daysUntilStart} days`,
                field: 'startDate',
                value: leaveRequest.startDate,
                expectedValue: new Date(today.getTime() + requiredNotice * 24 * 60 * 60 * 1000)
            });
            result.suggestions.push('Consider adjusting start date to meet notice requirements');
        }
    }
    static async enforceConsecutiveDaysPolicy(leaveRequest, policy, result) {
        const totalDays = this.calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate, leaveRequest.isHalfDay);
        const maxConsecutiveDays = {
            annual: 15,
            sick: 30,
            casual: 3,
            emergency: 5,
            maternity: 180,
            paternity: 30
        };
        const maxAllowed = maxConsecutiveDays[leaveRequest.leaveType] || 10;
        if (totalDays > maxAllowed) {
            result.warnings.push({
                code: 'EXCEEDS_MAX_CONSECUTIVE',
                message: `Extended leave period: ${totalDays} days (beyond recommended ${maxAllowed} days)`,
                suggestion: 'Manager approval required for extended leave periods'
            });
        }
    }
    static async enforceHalfDayPolicy(leaveRequest, policy, result) {
        if (leaveRequest.isHalfDay && !policy.allowHalfDay) {
            result.violations.push({
                type: 'CRITICAL',
                code: 'HALF_DAY_NOT_ALLOWED',
                message: `Half-day leave not allowed for ${leaveRequest.leaveType} leave`,
                field: 'isHalfDay',
                value: leaveRequest.isHalfDay,
                expectedValue: false
            });
        }
        if (leaveRequest.isHalfDay && !leaveRequest.halfDayPeriod) {
            result.violations.push({
                type: 'CRITICAL',
                code: 'HALF_DAY_PERIOD_REQUIRED',
                message: 'Half-day period is required when half-day is selected',
                field: 'halfDayPeriod',
                value: leaveRequest.halfDayPeriod,
                expectedValue: 'morning or afternoon'
            });
        }
    }
    static async enforceDocumentationPolicy(leaveRequest, policy, result) {
        const documentationRequired = {
            sick: true,
            maternity: true,
            paternity: true,
            emergency: false,
            annual: false,
            casual: false
        };
        const requiresDoc = documentationRequired[leaveRequest.leaveType] || false;
        if (requiresDoc && (!leaveRequest.reason || leaveRequest.reason.length < 20)) {
            result.violations.push({
                type: 'WARNING',
                code: 'INSUFFICIENT_DOCUMENTATION',
                message: `Detailed reason required for ${leaveRequest.leaveType} leave (minimum 20 characters)`,
                field: 'reason',
                value: leaveRequest.reason?.length || 0,
                expectedValue: 20
            });
        }
    }
    static async enforceApprovalPolicy(leaveRequest, policy, result) {
        if (policy.requiresApproval) {
            result.warnings.push({
                code: 'APPROVAL_REQUIRED',
                message: 'This leave request requires manager approval',
                suggestion: 'Ensure your manager is available for approval'
            });
        }
    }
    static async enforceEmergencyContactPolicy(leaveRequest, policy, result) {
        const emergencyContactRequired = {
            annual: true,
            sick: false,
            casual: false,
            emergency: true,
            maternity: true,
            paternity: true
        };
        const requiresContact = emergencyContactRequired[leaveRequest.leaveType] || false;
        if (requiresContact && !leaveRequest.emergencyContact) {
            result.violations.push({
                type: 'WARNING',
                code: 'EMERGENCY_CONTACT_REQUIRED',
                message: `Emergency contact information is required for ${leaveRequest.leaveType} leave`,
                field: 'emergencyContact',
                value: leaveRequest.emergencyContact,
                expectedValue: 'Valid contact information'
            });
        }
    }
    static async enforceWorkHandoverPolicy(leaveRequest, policy, result) {
        const totalDays = this.calculateLeaveDays(leaveRequest.startDate, leaveRequest.endDate, leaveRequest.isHalfDay);
        if (totalDays > 3 && !leaveRequest.workHandover) {
            result.violations.push({
                type: 'WARNING',
                code: 'WORK_HANDOVER_REQUIRED',
                message: 'Work handover notes are required for leaves longer than 3 days',
                field: 'workHandover',
                value: leaveRequest.workHandover,
                expectedValue: 'Work handover details'
            });
        }
    }
    static async enforceHolidayPolicy(leaveRequest, result) {
        const holidays = await prisma.holiday.findMany({
            where: {
                isActive: true,
                date: {
                    gte: leaveRequest.startDate,
                    lte: leaveRequest.endDate
                }
            },
            select: {
                name: true,
                date: true,
                type: true
            }
        });
        if (holidays.length > 0) {
            const holidayNames = holidays.map(h => h.name).join(', ');
            result.warnings.push({
                code: 'HOLIDAY_CONFLICT',
                message: `Leave period conflicts with holidays: ${holidayNames}`,
                suggestion: 'Consider adjusting leave dates to avoid holiday conflicts'
            });
        }
    }
    static async enforceOverlappingPolicy(userId, leaveRequest, result) {
        const overlappingRequests = await prisma.leaveRequest.findMany({
            where: {
                userId,
                status: { in: ['pending', 'approved'] },
                OR: [
                    {
                        startDate: { lte: leaveRequest.endDate },
                        endDate: { gte: leaveRequest.startDate }
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
        if (overlappingRequests.length > 0) {
            result.warnings.push({
                code: 'OVERLAPPING_REQUESTS',
                message: `Leave period overlaps with ${overlappingRequests.length} existing request(s)`,
                suggestion: 'Review overlapping periods with your manager'
            });
        }
    }
    static async enforceDepartmentPolicy(user, leaveRequest, result) {
        const departmentRestrictions = {
            'IT': ['maternity', 'paternity'],
            'Finance': ['emergency'],
            'HR': ['casual']
        };
        const restrictions = departmentRestrictions[user.department || ''] || [];
        if (restrictions.includes(leaveRequest.leaveType)) {
            result.warnings.push({
                code: 'DEPARTMENT_RESTRICTION',
                message: `${leaveRequest.leaveType} leave has special restrictions in ${user.department} department`,
                suggestion: 'Contact HR for department-specific leave policies'
            });
        }
    }
    static async enforceRolePolicy(user, leaveRequest, result) {
        const roleRestrictions = {
            'manager': ['casual'],
            'admin': ['emergency']
        };
        const restrictions = roleRestrictions[user.role] || [];
        if (restrictions.includes(leaveRequest.leaveType)) {
            result.warnings.push({
                code: 'ROLE_RESTRICTION',
                message: `${leaveRequest.leaveType} leave has restrictions for ${user.role} role`,
                suggestion: 'Contact HR for role-specific leave policies'
            });
        }
    }
    static calculateLeaveDays(startDate, endDate, isHalfDay) {
        if (isHalfDay) {
            return 0.5;
        }
        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        return daysDiff;
    }
    static async getPolicyComplianceSummary(userId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                return {
                    overallCompliance: 0,
                    policyViolations: 0,
                    policyWarnings: 0,
                    recommendations: ['User not found']
                };
            }
            const recentRequests = await prisma.leaveRequest.findMany({
                where: {
                    userId,
                    submittedAt: {
                        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
                    }
                },
                select: {
                    status: true,
                    leaveType: true,
                    totalDays: true
                }
            });
            const totalRequests = recentRequests.length;
            const approvedRequests = recentRequests.filter(req => req.status === 'approved').length;
            const rejectedRequests = recentRequests.filter(req => req.status === 'rejected').length;
            const overallCompliance = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 100;
            const recommendations = [];
            if (rejectedRequests > 0) {
                recommendations.push('Review rejected leave requests to understand policy violations');
            }
            if (overallCompliance < 80) {
                recommendations.push('Consider reviewing leave policies and submission guidelines');
            }
            return {
                overallCompliance: Math.round(overallCompliance),
                policyViolations: rejectedRequests,
                policyWarnings: totalRequests - approvedRequests - rejectedRequests,
                recommendations
            };
        }
        catch (error) {
            console.error('Error getting policy compliance summary:', error);
            return {
                overallCompliance: 0,
                policyViolations: 0,
                policyWarnings: 0,
                recommendations: ['Error calculating compliance']
            };
        }
    }
}
exports.PolicyEnforcementService = PolicyEnforcementService;
exports.default = PolicyEnforcementService;
//# sourceMappingURL=policyEnforcementService.js.map