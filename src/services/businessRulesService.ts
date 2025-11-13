import { PrismaClient } from '@prisma/client';
import { LeaveRequest, LeavePolicy, User } from '@prisma/client';

const prisma = new PrismaClient();

export interface BusinessRuleResult {
  isValid: boolean;
  message?: string;
  warnings?: string[];
  suggestions?: string[];
  salaryDeduction?: {
    days: number;
    amount: number;
  };
}

export interface LeaveRequestValidationResult extends BusinessRuleResult {
  canSubmit: boolean;
  requiresApproval: boolean;
  estimatedApprovalTime?: string;
  conflictWithHolidays?: string[];
  conflictWithOtherRequests?: string[];
  salaryDeduction?: {
    days: number;
    amount: number;
  };
}

export interface ManagerAssignmentResult extends BusinessRuleResult {
  assignedManagerId?: string;
  assignmentReason?: string;
  fallbackOptions?: Array<{
    managerId: string;
    managerName: string;
    reason: string;
  }>;
}

export class BusinessRulesService {
  /**
   * Validate leave request against business rules
   */
  static async validateLeaveRequest(
    userId: string,
    leaveRequest: {
      leaveType: string;
      startDate: Date;
      endDate: Date;
      isHalfDay: boolean;
      halfDayPeriod?: string;
      reason: string;
    }
  ): Promise<LeaveRequestValidationResult> {
    try {
      const result: LeaveRequestValidationResult = {
        isValid: true,
        canSubmit: true,
        requiresApproval: true,
        warnings: [],
        suggestions: []
      };

      // Get user information including probation status
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          managerId: true,
          manager: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          probationStatus: true,
          probationStartDate: true,
          probationEndDate: true,
          probationCompletedAt: true
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

      // Check if employee is in probation period
      const isInProbation = user.probationStatus === 'active' || user.probationStatus === 'extended';
      
      // Rule: Employees in probation cannot use leave balance at all
      // They can only take unpaid leave
      // This check is done in validateLeaveBalance, but we add it here for early rejection with better messaging

      // Get active leave policies
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

      // Calculate total days using automated working days calculation
      const totalDays = await this.calculateLeaveDays(
        leaveRequest.startDate,
        leaveRequest.endDate,
        leaveRequest.isHalfDay
      );

      // Rule 1: Check leave balance - allow negative balance with salary deduction
      // Employees can exceed their limit, but excess days will be deducted from salary
      const balanceResult = await this.validateLeaveBalance(
        userId,
        leaveRequest.leaveType,
        totalDays,
        false // Allow negative balance with salary deduction
      );
      
      // If balance check fails for reasons other than negative balance, reject
      if (!balanceResult.isValid && !balanceResult.salaryDeduction) {
        result.isValid = false;
        result.canSubmit = false;
        result.message = balanceResult.message;
        return result;
      }
      
      // If there's a negative balance, add warning but allow submission
      if (balanceResult.salaryDeduction) {
        // Initialize warnings array if undefined
        if (!result.warnings) {
          result.warnings = [];
        }
        // Add warning message as string
        const warningMessage = balanceResult.message || 'Leave request exceeds available balance';
        result.warnings.push(warningMessage);
        // Add additional warning details if available
        if (balanceResult.warnings && balanceResult.warnings.length > 0) {
          result.warnings.push(...balanceResult.warnings);
        }
        // Store salary deduction info for later processing
        result.salaryDeduction = balanceResult.salaryDeduction;
      }

      // Rule 2: Check minimum notice period
      const noticeResult = this.validateNoticePeriod(
        leaveRequest.startDate,
        leaveRequest.leaveType
      );
      if (!noticeResult.isValid) {
        result.warnings?.push(noticeResult.message!);
        result.suggestions?.push('Consider submitting with more advance notice');
      }

      // Rule 3: Check for holiday conflicts
      const holidayConflicts = await this.checkHolidayConflicts(
        leaveRequest.startDate,
        leaveRequest.endDate
      );
      if (holidayConflicts.length > 0) {
        result.conflictWithHolidays = holidayConflicts;
        result.warnings?.push(`Leave period conflicts with holidays: ${holidayConflicts.join(', ')}`);
      }

      // Rule 4: Check for overlapping requests
      const overlappingRequests = await this.checkOverlappingRequests(
        userId,
        leaveRequest.startDate,
        leaveRequest.endDate
      );
      if (overlappingRequests.length > 0) {
        result.conflictWithOtherRequests = overlappingRequests;
        result.warnings?.push(`Leave period overlaps with ${overlappingRequests.length} existing request(s)`);
        result.suggestions?.push('Review overlapping periods with your manager');
        // Don't block the request, just add warnings
      }

      // Rule 5: Check maximum consecutive days
      const maxDaysResult = this.validateMaxConsecutiveDays(
        totalDays,
        policy,
        leaveRequest.leaveType
      );
      if (!maxDaysResult.isValid) {
        result.isValid = false;
        result.canSubmit = false;
        result.message = maxDaysResult.message;
        return result;
      }

      // Rule 6: Determine approval requirements
      result.requiresApproval = policy.requiresApproval;
      if (result.requiresApproval && user.manager) {
        result.estimatedApprovalTime = this.estimateApprovalTime(
          leaveRequest.leaveType,
          totalDays,
          user.department || undefined
        );
      }

      // Rule 7: Check for emergency leave special rules
      if (leaveRequest.leaveType === 'emergency') {
        const emergencyResult = this.validateEmergencyLeave(leaveRequest.reason);
        if (!emergencyResult.isValid) {
          result.warnings?.push(emergencyResult.message!);
        }
      }

      // Rule 8: Check for maternity/paternity leave special rules
      if (['maternity', 'paternity'].includes(leaveRequest.leaveType)) {
        const parentalResult = await this.validateParentalLeave(
          userId,
          leaveRequest.leaveType,
          leaveRequest.startDate
        );
        if (!parentalResult.isValid) {
          result.warnings?.push(parentalResult.message!);
        }
      }

      return result;
    } catch (error) {
      console.error('Error validating leave request:', error);
      return {
        isValid: false,
        canSubmit: false,
        requiresApproval: false,
        message: 'Error validating leave request'
      };
    }
  }

  /**
   * Auto-assign manager based on business rules
   */
  static async autoAssignManager(
    employeeData: {
      role: string;
      department?: string;
      managerId?: string;
    }
  ): Promise<ManagerAssignmentResult> {
    try {
      const result: ManagerAssignmentResult = {
        isValid: true,
        warnings: [],
        suggestions: []
      };

      // Rule 1: If role is not employee, no manager assignment needed
      if (employeeData.role !== 'employee') {
        return {
          isValid: true,
          message: 'No manager assignment needed for non-employee roles'
        };
      }

      // Rule 2: If manager is already specified, validate it
      if (employeeData.managerId) {
        const manager = await prisma.user.findUnique({
          where: { id: employeeData.managerId }
        });

        if (manager && manager.role === 'manager' && manager.isActive) {
          result.assignedManagerId = employeeData.managerId;
          result.assignmentReason = 'Pre-specified manager';
          return result;
        } else {
          result.warnings?.push('Specified manager is invalid or inactive');
        }
      }

      // Rule 3: Find manager in same department
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
          // Check if manager has capacity (max 10 direct reports)
          if (departmentManager.subordinates.length < 10) {
            result.assignedManagerId = departmentManager.id;
            result.assignmentReason = `Department manager in ${employeeData.department}`;
            return result;
          } else {
            result.warnings?.push(`Department manager has reached capacity (${departmentManager.subordinates.length}/10)`);
          }
        }
      }

      // Rule 4: Find manager with least direct reports
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
        
        // Provide fallback options
        result.fallbackOptions = availableManagers.slice(1).map(manager => ({
          managerId: manager.id,
          managerName: manager.name,
          reason: `${manager.department} department, ${manager.subordinates.length} direct reports`
        }));

        return result;
      }

      // Rule 5: No managers available
      result.isValid = false;
      result.message = 'No active managers available for assignment';
      result.suggestions?.push('Create a manager account first');

      return result;
    } catch (error) {
      console.error('Error in auto-assign manager:', error);
      return {
        isValid: false,
        message: 'Error assigning manager'
      };
    }
  }

  /**
   * Calculate real-time leave balance based on employee tenure
   * Leave balance = (totalDaysPerYear / 365) * daysServed (daily accrual)
   * Leaves accrue day by day from the join date
   */
  static async calculateLeaveBalance(
    userId: string,
    year: number = new Date().getFullYear()
  ): Promise<{ [leaveType: string]: { total: number; used: number; remaining: number; pending: number } }> {
    try {
      // Get employee info including joinDate, employeeType, and probation info
      const employee = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          joinDate: true,
          createdAt: true,
          employeeType: true,
          probationStatus: true,
          probationStartDate: true,
          probationEndDate: true,
          probationCompletedAt: true
        }
      });

      if (!employee) {
        console.error('Employee not found:', userId);
        return {};
      }

      // Calculate days served (for daily accrual)
      const startDate = employee.joinDate ? new Date(employee.joinDate) : new Date(employee.createdAt);
      const currentDate = new Date();
      const daysServed = this.calculateDaysServed(startDate, currentDate);

      // Calculate probation period
      const isInProbation = employee.probationStatus === 'active' || employee.probationStatus === 'extended';
      const probationCompleted = employee.probationStatus === 'completed' && employee.probationCompletedAt;
      
      // Calculate days served during probation vs after probation
      let daysServedDuringProbation = 0;
      let daysServedAfterProbation = 0;
      
      if (employee.probationStartDate && employee.probationEndDate) {
        const probationStart = new Date(employee.probationStartDate);
        const probationEnd = new Date(employee.probationEndDate);
        const probationCompletedDate = probationCompleted && employee.probationCompletedAt 
          ? new Date(employee.probationCompletedAt) 
          : null;
        
        // Days served during probation (from start to end or completion, whichever is earlier)
        const probationEndDate = probationCompletedDate || probationEnd;
        const probationDays = this.calculateDaysServed(
          probationStart < startDate ? startDate : probationStart,
          probationEndDate < currentDate ? probationEndDate : currentDate
        );
        daysServedDuringProbation = Math.max(0, probationDays);
        
        // Days served after probation (only if probation is completed)
        if (probationCompleted && probationCompletedDate) {
          daysServedAfterProbation = this.calculateDaysServed(
            probationCompletedDate,
            currentDate
          );
        }
      } else {
        // If no probation dates, all days are considered "after probation" (for employees without probation)
        daysServedAfterProbation = daysServed;
      }

      // Get active leave policies filtered by employeeType
      // IMPORTANT: Onshore and Offshore policies are completely separate
      // Only policies matching the employee's employeeType are used - no fallback to null policies
      // Handle case where migration hasn't been applied yet
      let policies: any[] = [];
      try {
        if (employee.employeeType) {
          // Strictly filter by exact employeeType match - no fallback to null
          policies = await prisma.leavePolicy.findMany({
            where: {
              isActive: true,
              employeeType: employee.employeeType as any
            } as any
          });
        } else {
          // If employee has no employeeType, return empty (they need to be assigned an employeeType)
          policies = [];
        }
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, get all active policies
        console.warn('⚠️ employeeType column not found, using all active policies. Please apply migration.');
        policies = await prisma.leavePolicy.findMany({
          where: { isActive: true }
        });
      }

      const policyMap = new Map<string, { total: number; probationEarned: number; available: number }>();
      policies.forEach(policy => {
        // Calculate tenure-based total: (totalDaysPerYear / 365) * daysServed (daily accrual)
        const dailyAccrual = policy.totalDaysPerYear / 365; // Daily accrual rate
        
        // Total leaves earned (during probation + after probation)
        const totalEarned = Math.round(dailyAccrual * daysServed * 100) / 100;
        
        // Leaves earned during probation (locked until probation completion)
        const probationEarned = Math.round(dailyAccrual * daysServedDuringProbation * 100) / 100;
        
        // Available leaves (only after probation completion)
        // If in probation, available = 0 (all leaves are locked)
        // If probation completed, available = total (probation-earned + post-probation leaves all become available)
        // If no probation, available = total
        let available = 0;
        if (isInProbation) {
          // In probation: no leaves available (all locked, including probation-earned leaves)
          available = 0;
        } else if (probationCompleted) {
          // Probation completed: all leaves become available (probation-earned + post-probation)
          available = totalEarned;
        } else {
          // No probation: all leaves are available
          available = totalEarned;
        }
        
        policyMap.set(policy.leaveType, {
          total: totalEarned,
          probationEarned,
          available: Math.max(0, available)
        });
      });

      // Get leave requests for the year
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31);

      const requests = await prisma.leaveRequest.findMany({
        where: {
          userId,
          submittedAt: { gte: startOfYear, lte: endOfYear }
        },
        select: {
          leaveType: true,
          totalDays: true,
          status: true
        }
      });

      // Calculate used and pending days
      const usedDays: { [key: string]: number } = {};
      const pendingDays: { [key: string]: number } = {};

      requests.forEach(request => {
        const days = Number(request.totalDays);
        const leaveType = request.leaveType;

        if (request.status === 'approved') {
          usedDays[leaveType] = (usedDays[leaveType] || 0) + days;
        } else if (request.status === 'pending') {
          pendingDays[leaveType] = (pendingDays[leaveType] || 0) + days;
        }
      });

      // Build result
      const result: { [leaveType: string]: { total: number; used: number; remaining: number; pending: number; probationEarned?: number; available?: number } } = {};

      policyMap.forEach((balanceInfo, leaveType) => {
        const used = usedDays[leaveType] || 0;
        const pending = pendingDays[leaveType] || 0;
        
        // Remaining = available balance minus used and pending
        // If in probation, remaining = 0 (all leaves are locked)
        const remaining = isInProbation 
          ? 0 
          : Math.max(0, balanceInfo.available - used - pending);

        result[leaveType] = {
          total: balanceInfo.total,
          used,
          remaining,
          pending,
          probationEarned: balanceInfo.probationEarned,
          available: balanceInfo.available
        };
      });

      return result;
    } catch (error) {
      console.error('Error calculating leave balance:', error);
      return {};
    }
  }

  /**
   * Calculate days served based on join date (for daily accrual)
   */
  private static calculateDaysServed(startDate: Date, currentDate: Date): number {
    const start = new Date(startDate);
    const current = new Date(currentDate);
    
    // Set time to midnight to calculate full days
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    
    // Calculate difference in milliseconds
    const diffTime = current.getTime() - start.getTime();
    
    // Convert to days (including partial days)
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    // Return the actual days served (can be 0 on first day, 1 on second day, etc.)
    return Math.max(0, Math.round(diffDays * 100) / 100);
  }

  /**
   * Calculate months served based on join date (deprecated - kept for backward compatibility)
   * @deprecated Use calculateDaysServed for daily accrual instead
   */
  private static calculateMonthsServed(startDate: Date, currentDate: Date): number {
    const daysServed = this.calculateDaysServed(startDate, currentDate);
    // Convert days to months for backward compatibility
    return daysServed / 30.44; // Average days per month
  }

  /**
   * Validate leave balance - Enhanced to allow negative balance with salary deduction
   * Now with strict limit enforcement option
   * Also checks probation status - employees in probation cannot use leave balance
   */
  private static async validateLeaveBalance(
    userId: string,
    leaveType: string,
    requestedDays: number,
    enforceStrictLimit: boolean = false
  ): Promise<BusinessRuleResult> {
    // Get employee probation status
    const employee = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        probationStatus: true,
        probationStartDate: true,
        probationEndDate: true,
        probationCompletedAt: true
      }
    });

    const isInProbation = employee?.probationStatus === 'active' || employee?.probationStatus === 'extended';
    
    // If employee is in probation, they cannot use leave balance
    if (isInProbation) {
      return {
        isValid: false,
        message: `You cannot use leave balance during your probation period. Leaves earned during probation are locked until you complete your probation. You can only take unpaid leave during probation.`
      };
    }

    const balance = await this.calculateLeaveBalance(userId);
    const leaveBalance = balance[leaveType];

    if (!leaveBalance) {
      return {
        isValid: false,
        message: `No leave policy found for ${leaveType} leave`
      };
    }

    // Calculate if this will result in negative balance
    const newBalance = leaveBalance.remaining - requestedDays;
    
    if (newBalance < 0) {
      const excessDays = Math.abs(newBalance);
      
      // If strict limit enforcement is enabled, reject the request
      if (enforceStrictLimit) {
        return {
          isValid: false,
          message: `Leave limit reached. You have ${leaveBalance.remaining} day${leaveBalance.remaining !== 1 ? 's' : ''} remaining, but requested ${requestedDays} day${requestedDays !== 1 ? 's' : ''}. Please contact your manager or admin to request additional leave days. They can add leave days from the Team Overview (for managers) or Employee Management page (for admins).`,
          warnings: [
            `Leave limit exceeded by ${excessDays} day${excessDays !== 1 ? 's' : ''}`, 
            `Contact your manager/admin to manually add additional leave days`,
            `Managers: Go to Team Overview → Select Team Member → View Leave Balance → Adjust Leave`,
            `Admins: Go to Employees → Select Employee → View Balance → Adjust Leave`
          ]
        };
      }
      
      // Allow negative balance but add warning about salary deduction
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

  /**
   * Calculate salary deduction for excess leave days
   */
  private static async calculateSalaryDeduction(userId: string, excessDays: number): Promise<number> {
    try {
      // Get user's salary information
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          name: true,
          // Add salary field if it exists in the schema
        }
      });

      if (!user) {
        return 0;
      }

      // For now, use a default daily rate calculation
      // In a real system, this would come from the user's salary record
      const defaultDailyRate = 1000; // This should come from user's salary data
      const deductionAmount = excessDays * defaultDailyRate;

      return deductionAmount;
    } catch (error) {
      console.error('Error calculating salary deduction:', error);
      return 0;
    }
  }

  /**
   * Validate notice period
   */
  private static validateNoticePeriod(
    startDate: Date,
    leaveType: string
  ): BusinessRuleResult {
    const today = new Date();
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Different notice periods for different leave types
    const noticeRequirements: { [key: string]: number } = {
      annual: 7,      // 7 days for annual leave
      sick: 0,        // No notice for sick leave
      casual: 1,      // 1 day for casual leave
      emergency: 0,   // No notice for emergency leave
      maternity: 30,  // 30 days for maternity leave
      paternity: 14   // 14 days for paternity leave
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

  /**
   * Check for holiday conflicts
   */
  private static async checkHolidayConflicts(
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
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

    return holidays.map(holiday => 
      `${holiday.name} (${holiday.date.toLocaleDateString()})`
    );
  }

  /**
   * Check for overlapping requests
   */
  private static async checkOverlappingRequests(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string[]> {
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

    return overlappingRequests.map(request => 
      `${request.leaveType} leave (${request.startDate.toLocaleDateString()} - ${request.endDate.toLocaleDateString()}) - ${request.status}`
    );
  }

  /**
   * Validate maximum consecutive days
   */
  private static validateMaxConsecutiveDays(
    requestedDays: number,
    policy: LeavePolicy,
    leaveType: string 
  ): BusinessRuleResult {
    // Recommended consecutive days limits (not hard limits)
    const recommendedConsecutiveDays: { [key: string]: number } = {
      annual: 15,     // Recommended max 15 consecutive days for annual leave
      sick: 30,       // Recommended max 30 consecutive days for sick leave
      casual: 3,      // Recommended max 3 consecutive days for casual leave
      emergency: 5,   // Recommended max 5 consecutive days for emergency leave
      maternity: 180, // Recommended max 180 consecutive days for maternity leave
      paternity: 30   // Recommended max 30 consecutive days for paternity leave
    };

    const recommendedMax = recommendedConsecutiveDays[leaveType] || 10;

    if (requestedDays > recommendedMax) {
      // Allow longer periods but add warning
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

  /**
   * Estimate approval time
   */
  private static estimateApprovalTime(
    leaveType: string,
    days: number,
    department?: string
  ): string {
    // Different approval times based on leave type and duration
    if (leaveType === 'emergency') {
      return '2-4 hours';
    } else if (leaveType === 'sick') {
      return '1-2 business days';
    } else if (days > 10) {
      return '3-5 business days';
    } else {
      return '1-3 business days';
    }
  }

  /**
   * Validate emergency leave
   */
  private static validateEmergencyLeave(reason: string): BusinessRuleResult {
    const emergencyKeywords = ['emergency', 'urgent', 'critical', 'immediate', 'family', 'medical'];
    const hasEmergencyKeyword = emergencyKeywords.some(keyword => 
      reason.toLowerCase().includes(keyword)
    );

    if (!hasEmergencyKeyword) {
      return {
        isValid: false,
        message: 'Emergency leave requires justification with emergency keywords'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate parental leave
   */
  private static async validateParentalLeave(
    userId: string,
    leaveType: string,
    startDate: Date
  ): Promise<BusinessRuleResult> {
    // Check if user has already taken parental leave this year
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

  /**
   * Calculate leave days (using automated working days calculation)
   */
  private static async calculateLeaveDays(
    startDate: Date,
    endDate: Date,
    isHalfDay: boolean
  ): Promise<number> {
    if (isHalfDay) {
      return 0.5;
    }

    // Use automated working days calculation (excludes weekends and holidays)
    const { WorkingDaysService } = await import('./workingDaysService');
    return await WorkingDaysService.calculateWorkingDaysBetween(startDate, endDate);
  }
}

export default BusinessRulesService;
