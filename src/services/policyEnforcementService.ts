import { PrismaClient } from '@prisma/client';
import { LeaveRequest, LeavePolicy, User } from '@prisma/client';

const prisma = new PrismaClient();

export interface PolicyEnforcementResult {
  isCompliant: boolean;
  violations: PolicyViolation[];
  warnings: PolicyWarning[];
  suggestions: string[];
}

export interface PolicyViolation {
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  field?: string;
  value?: any;
  expectedValue?: any;
}

export interface PolicyWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export class PolicyEnforcementService {
  /**
   * Enforce leave policies on a leave request
   */
  static async enforceLeavePolicies(
    userId: string,
    leaveRequest: {
      leaveType: string;
      startDate: Date;
      endDate: Date;
      isHalfDay: boolean;
      halfDayPeriod?: string;
      reason: string;
      emergencyContact?: string;
      workHandover?: string;
    }
  ): Promise<PolicyEnforcementResult> {
    try {
      const result: PolicyEnforcementResult = {
        isCompliant: true,
        violations: [],
        warnings: [],
        suggestions: []
      };

      // Get user and policy information
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

      // Enforce various policy rules
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

      // Determine overall compliance
      result.isCompliant = result.violations.filter(v => v.type === 'CRITICAL').length === 0;

      return result;
    } catch (error) {
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

  /**
   * Enforce leave balance policy
   */
  private static async enforceLeaveBalancePolicy(
    userId: string,
    leaveRequest: any,
    policy: LeavePolicy,
    result: PolicyEnforcementResult
  ): Promise<void> {
    const totalDays = this.calculateLeaveDays(
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.isHalfDay
    );

    // Get current leave balance
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
      // Allow negative balance but add warning about salary deduction
      const excessDays = totalDays - availableDays;
      result.warnings.push({
        code: 'NEGATIVE_BALANCE_WARNING',
        message: `Leave request will result in negative balance. ${excessDays} days will be deducted from salary.`,
        suggestion: 'Salary deduction will apply for excess days'
      });
    } else if (totalDays > availableDays * 0.8) {
      result.warnings.push({
        code: 'LOW_BALANCE_WARNING',
        message: `Leave balance will be low after this request (${availableDays - totalDays} days remaining)`,
        suggestion: 'Consider shorter leave period or different leave type'
      });
    }
  }

  /**
   * Enforce notice period policy
   */
  private static async enforceNoticePeriodPolicy(
    leaveRequest: any,
    policy: LeavePolicy,
    result: PolicyEnforcementResult
  ): Promise<void> {
    const today = new Date();
    const daysUntilStart = Math.ceil(
      (leaveRequest.startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Different notice periods for different leave types
    const noticeRequirements: { [key: string]: number } = {
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

  /**
   * Enforce consecutive days policy
   */
  private static async enforceConsecutiveDaysPolicy(
    leaveRequest: any,
    policy: LeavePolicy,
    result: PolicyEnforcementResult
  ): Promise<void> {
    const totalDays = this.calculateLeaveDays(
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.isHalfDay
    );

    const maxConsecutiveDays: { [key: string]: number } = {
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

  /**
   * Enforce half-day policy
   */
  private static async enforceHalfDayPolicy(
    leaveRequest: any,
    policy: LeavePolicy,
    result: PolicyEnforcementResult
  ): Promise<void> {
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

  /**
   * Enforce documentation policy
   */
  private static async enforceDocumentationPolicy(
    leaveRequest: any,
    policy: LeavePolicy,
    result: PolicyEnforcementResult
  ): Promise<void> {
    // Check if documentation is required for certain leave types
    const documentationRequired: { [key: string]: boolean } = {
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

  /**
   * Enforce approval policy
   */
  private static async enforceApprovalPolicy(
    leaveRequest: any,
    policy: LeavePolicy,
    result: PolicyEnforcementResult
  ): Promise<void> {
    if (policy.requiresApproval) {
      result.warnings.push({
        code: 'APPROVAL_REQUIRED',
        message: 'This leave request requires manager approval',
        suggestion: 'Ensure your manager is available for approval'
      });
    }
  }

  /**
   * Enforce emergency contact policy
   */
  private static async enforceEmergencyContactPolicy(
    leaveRequest: any,
    policy: LeavePolicy,
    result: PolicyEnforcementResult
  ): Promise<void> {
    const emergencyContactRequired: { [key: string]: boolean } = {
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

  /**
   * Enforce work handover policy
   */
  private static async enforceWorkHandoverPolicy(
    leaveRequest: any,
    policy: LeavePolicy,
    result: PolicyEnforcementResult
  ): Promise<void> {
    const totalDays = this.calculateLeaveDays(
      leaveRequest.startDate,
      leaveRequest.endDate,
      leaveRequest.isHalfDay
    );

    // Require work handover for leaves longer than 3 days
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

  /**
   * Enforce holiday policy
   */
  private static async enforceHolidayPolicy(
    leaveRequest: any,
    result: PolicyEnforcementResult
  ): Promise<void> {
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

  /**
   * Enforce overlapping policy
   */
  private static async enforceOverlappingPolicy(
    userId: string,
    leaveRequest: any,
    result: PolicyEnforcementResult
  ): Promise<void> {
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

  /**
   * Enforce department policy
   */
  private static async enforceDepartmentPolicy(
    user: any,
    leaveRequest: any,
    result: PolicyEnforcementResult
  ): Promise<void> {
    // Check if department has specific leave restrictions
    const departmentRestrictions: { [key: string]: string[] } = {
      'IT': ['maternity', 'paternity'], // IT department has special parental leave policies
      'Finance': ['emergency'], // Finance department has restricted emergency leave
      'HR': ['casual'] // HR department has limited casual leave
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

  /**
   * Enforce role policy
   */
  private static async enforceRolePolicy(
    user: any,
    leaveRequest: any,
    result: PolicyEnforcementResult
  ): Promise<void> {
    // Check if role has specific leave restrictions
    const roleRestrictions: { [key: string]: string[] } = {
      'manager': ['casual'], // Managers have limited casual leave
      'admin': ['emergency'] // Admins have restricted emergency leave
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

  /**
   * Calculate leave days
   */
  private static calculateLeaveDays(
    startDate: Date,
    endDate: Date,
    isHalfDay: boolean
  ): number {
    if (isHalfDay) {
      return 0.5;
    }

    const timeDiff = endDate.getTime() - startDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    return daysDiff;
  }

  /**
   * Get policy compliance summary
   */
  static async getPolicyComplianceSummary(userId: string): Promise<{
    overallCompliance: number;
    policyViolations: number;
    policyWarnings: number;
    recommendations: string[];
  }> {
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

      // Get recent leave requests
      const recentRequests = await prisma.leaveRequest.findMany({
        where: {
          userId,
          submittedAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 90 days
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

      const recommendations: string[] = [];
      
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
    } catch (error) {
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

export default PolicyEnforcementService;
