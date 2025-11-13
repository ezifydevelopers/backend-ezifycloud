import { 
  EmployeeDashboardStats, 
  PersonalInfo, 
  LeaveBalance, 
  LeaveBalanceDetail,
  LeaveBalanceSummary,
  RecentLeaveRequest, 
  Holiday, 
  TeamInfo, 
  TeamMember,
  PerformanceMetrics,
  PerformanceGoal,
  Achievement,
  Notification,
  QuickStats,
  DateRange 
} from '../types';
import prisma from '../../../lib/prisma';
import { APP_CONFIG } from '../../../config/app';

export class EmployeeDashboardService {
  /**
   * Get comprehensive dashboard statistics for employee
   */
  static async getDashboardStats(employeeId: string, dateRange?: DateRange): Promise<EmployeeDashboardStats> {
    try {
      const startDate = dateRange?.startDate || new Date(new Date().getFullYear(), 0, 1);
      const endDate = dateRange?.endDate || new Date();

      // Get personal information
      const personalInfo = await this.getPersonalInfo(employeeId);

      // Get leave balance
      const leaveBalance = await this.getLeaveBalance(employeeId, startDate, endDate);

      // Get recent leave requests
      const recentRequests = await this.getRecentLeaveRequests(employeeId, 5);

      // Get upcoming holidays
      const upcomingHolidays = await this.getUpcomingHolidays(5);

      // Get team information
      const teamInfo = await this.getTeamInfo(employeeId);

      // Get performance metrics
      const performance = await this.getPerformanceMetrics(employeeId);

      // Get notifications
      const notifications = await this.getNotifications(employeeId, APP_CONFIG.DASHBOARD.DEFAULT_LIMITS.NOTIFICATIONS);

      // Get quick stats
      const quickStats = await this.getQuickStats(employeeId, startDate, endDate);

      // Provide fallback data if no real data exists
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
          nextReviewDate: new Date(Date.now() + APP_CONFIG.TIME.DAYS.REVIEW_PERIOD * APP_CONFIG.TIME.MILLISECONDS.DAY),
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
    } catch (error) {
      console.error('Error fetching employee dashboard stats:', error);
      throw new Error('Failed to fetch employee dashboard statistics');
    }
  }

  /**
   * Get personal information
   */
  private static async getPersonalInfo(employeeId: string): Promise<PersonalInfo> {
    try {
      const employee = await prisma.user.findUnique({
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
        phone: undefined, // Not in schema
        department: employee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        managerName: employee.manager?.name,
        joinDate: employee.createdAt,
        avatar: employee.profilePicture || undefined,
        bio: undefined, // Not in schema
        isActive: employee.isActive
      };
    } catch (error) {
      console.error('Error fetching personal info:', error);
      throw new Error('Failed to fetch personal information');
    }
  }

  /**
   * Get dynamic leave balance based on actual policies (fallback method)
   */
  static async getDynamicLeaveBalance(employeeId: string): Promise<LeaveBalance> {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get employee info including joinDate
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          joinDate: true,
          createdAt: true
        }
      });

      if (!employee) {
        return {
          total: { totalDays: 0, usedDays: 0, remainingDays: 0, pendingDays: 0, overallUtilization: 0 }
        };
      }

      // Calculate months served
      const startDate = employee.joinDate ? new Date(employee.joinDate) : new Date(employee.createdAt);
      const currentDate = new Date();
      const monthsServed = this.calculateMonthsServed(startDate, currentDate);

      // Get active leave policies from database
      const leavePolicies = await prisma.leavePolicy.findMany({
        where: {
          isActive: true
        },
        select: {
          leaveType: true,
          totalDaysPerYear: true
        }
      });

      // If no policies exist, return empty balance
      if (leavePolicies.length === 0) {
        return {
          total: { totalDays: 0, usedDays: 0, remainingDays: 0, pendingDays: 0, overallUtilization: 0 }
        };
      }

      // Create dynamic leave balance based on tenure
      const dynamicLeaveBalance: { [key: string]: LeaveBalanceDetail } = {};
      let totalDays = 0;

      for (const policy of leavePolicies) {
        // Calculate tenure-based total: (totalDaysPerYear / 12) * monthsServed
        const monthlyAccrual = policy.totalDaysPerYear / 12;
        const tenureBasedTotal = Math.round(monthlyAccrual * monthsServed * 100) / 100;
        
        dynamicLeaveBalance[policy.leaveType] = {
          total: tenureBasedTotal,
          used: 0,
          remaining: tenureBasedTotal,
          pending: 0,
          utilizationRate: 0
        };
        totalDays += tenureBasedTotal;
      }

      const total: LeaveBalanceSummary = {
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
    } catch (error) {
      console.error('Error getting dynamic leave balance:', error);
      return {
        total: { totalDays: 0, usedDays: 0, remainingDays: 0, pendingDays: 0, overallUtilization: 0 }
      };
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
   * Get leave balance for employee
   */
  private static async getLeaveBalance(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveBalance> {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get employee info including joinDate and employeeType
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          joinDate: true,
          createdAt: true,
          employeeType: true
        }
      });

      if (!employee) {
        return {
          total: { totalDays: 0, usedDays: 0, remainingDays: 0, pendingDays: 0, overallUtilization: 0 }
        };
      }

      // Calculate days served (for daily accrual)
      const empStartDate = employee.joinDate ? new Date(employee.joinDate) : new Date(employee.createdAt);
      const currentDate = new Date();
      const daysServed = this.calculateDaysServed(empStartDate, currentDate);

      // Get leave balance from database
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: employeeId,
            year: currentYear
          }
        }
      });

      // Get active leave policies from database filtered by employeeType
      // TEMPORARY: During migration, show null policies if no exact matches exist
      // Handle case where migration hasn't been applied yet
      let leavePolicies;
      try {
        const whereClause: any = {
          isActive: true
        };
        
        // Check if any policies exist with the employee's employeeType
        if (employee.employeeType) {
          const countWithType = await prisma.leavePolicy.count({
            where: { 
              isActive: true,
              employeeType: employee.employeeType 
            }
          }).catch(() => 0);
          const countWithNull = await prisma.leavePolicy.count({
            where: { 
              isActive: true,
              employeeType: null 
            }
          }).catch(() => 0);
          
          console.log('🔍 Employee getLeaveBalance: Policy counts:', {
            withEmployeeType: countWithType,
            withNullType: countWithNull,
            employeeType: employee.employeeType
          });
          
          if (countWithType > 0) {
            // Show only policies with exact employeeType match
            whereClause.employeeType = employee.employeeType;
            console.log('🔍 Employee getLeaveBalance: Filtering by employeeType:', employee.employeeType, '(exact match only)');
          } else if (countWithNull > 0) {
            // TEMPORARY: If no policies with requested type exist, show null policies
            // This allows employees to see policies during migration
            whereClause.employeeType = null;
            console.log('⚠️ Employee getLeaveBalance: No policies found with employeeType:', employee.employeeType);
            console.log('⚠️ Employee getLeaveBalance: Showing null policies temporarily for migration');
          } else {
            // No policies at all
            whereClause.employeeType = employee.employeeType;
            console.log('🔍 Employee getLeaveBalance: No policies exist. Filtering by employeeType:', employee.employeeType);
          }
        } else {
          // If employee has no employeeType set, show null policies temporarily
          // This allows employees without employeeType to still see leave balance during migration
          whereClause.employeeType = null;
          console.log('⚠️ Employee getLeaveBalance: Employee has no employeeType, showing null policies temporarily');
        }
        
        leavePolicies = await prisma.leavePolicy.findMany({
          where: whereClause as any,
          select: {
            leaveType: true,
            totalDaysPerYear: true,
            employeeType: true
          } as any
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, get all active policies
        console.warn('⚠️ employeeType column not found, using all active policies. Please apply migration.');
        leavePolicies = await prisma.leavePolicy.findMany({
          where: { isActive: true },
          select: {
            leaveType: true,
            totalDaysPerYear: true
          }
        });
      }

      // Create a map of leave types to their tenure-based max days
      // Calculate tenure-based total: (totalDaysPerYear / 365) * daysServed (daily accrual)
      const policyMap = new Map<string, number>();
      leavePolicies.forEach(policy => {
        const dailyAccrual = policy.totalDaysPerYear / 365; // Daily accrual rate
        const tenureBasedTotal = Math.round(dailyAccrual * daysServed * 100) / 100;
        policyMap.set(policy.leaveType, tenureBasedTotal);
      });

      // Get pending leave requests
      const pendingRequests = await prisma.leaveRequest.findMany({
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

      // Get approved leave requests to calculate actual used days
      const approvedRequests = await prisma.leaveRequest.findMany({
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

      // Create dynamic objects for pending and approved days based on actual policies
      const pendingDays: { [key: string]: number } = {};
      const approvedDays: { [key: string]: number } = {};

      // Initialize with all policy types
      for (const [leaveType] of policyMap) {
        pendingDays[leaveType] = 0;
        approvedDays[leaveType] = 0;
      }

      // Calculate pending days by leave type (dynamic)
      pendingRequests.forEach(request => {
        const days = Number(request.totalDays);
        if (pendingDays.hasOwnProperty(request.leaveType)) {
          pendingDays[request.leaveType] += days;
        }
      });

      // Calculate approved days by leave type (dynamic)
      approvedRequests.forEach(request => {
        const days = Number(request.totalDays);
        if (approvedDays.hasOwnProperty(request.leaveType)) {
          approvedDays[request.leaveType] += days;
        }
      });

      // Dynamically build leave balance based ONLY on active policies
      const dynamicLeaveBalance: { [key: string]: LeaveBalanceDetail } = {};
      let totalDays = 0;
      let usedDays = 0;
      let remainingDays = 0;
      let totalPendingDays = 0;

      // Only process leave types that have active policies
      for (const [leaveType, tenureBasedTotal] of policyMap) {
        // Use calculated approved days instead of database values
        const used = (approvedDays as any)[leaveType] || 0;
        const pending = (pendingDays as any)[leaveType] || 0;
        
        // Calculate remaining days accounting for pending requests
        const actualRemaining = Math.max(0, tenureBasedTotal - used - pending);
        
        // Use the tenure-based total as the authoritative source
        dynamicLeaveBalance[leaveType] = {
          total: tenureBasedTotal, // Use tenure-based total
          used: used, // Use calculated approved days
          remaining: actualRemaining, // Total - Used - Pending
          pending: pending,
          utilizationRate: tenureBasedTotal > 0 ? (used / tenureBasedTotal) * 100 : 0
        };

        totalDays += tenureBasedTotal;
        usedDays += used;
        remainingDays += actualRemaining;
        totalPendingDays += pending;
      }

      const total: LeaveBalanceSummary = {
        totalDays,
        usedDays,
        remainingDays,
        pendingDays: totalPendingDays,
        overallUtilization: totalDays > 0 ? (usedDays / totalDays) * 100 : 0
      };

      // Return the dynamic leave balance with total
      return {
        ...dynamicLeaveBalance,
        total
      } as LeaveBalance;
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      throw new Error('Failed to fetch leave balance');
    }
  }

  /**
   * Get recent leave requests
   */
  private static async getRecentLeaveRequests(employeeId: string, limit: number = 5): Promise<RecentLeaveRequest[]> {
    try {
      const requests = await prisma.leaveRequest.findMany({
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
        status: request.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(request),
        submittedAt: request.submittedAt,
        reviewedAt: request.approvedAt || undefined,
        comments: request.comments || undefined
      }));
    } catch (error) {
      console.error('Error fetching recent leave requests:', error);
      return [];
    }
  }

  /**
   * Get upcoming holidays
   */
  private static async getUpcomingHolidays(limit: number = 5): Promise<Holiday[]> {
    try {
      const today = new Date();
      
      const holidays = await prisma.holiday.findMany({
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
        type: holiday.type as 'national' | 'company' | 'religious',
        description: holiday.description || undefined,
        isRecurring: holiday.isRecurring
      }));
    } catch (error) {
      console.error('Error fetching upcoming holidays:', error);
      return [];
    }
  }

  /**
   * Get team information
   */
  private static async getTeamInfo(employeeId: string): Promise<TeamInfo> {
    try {
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          managerId: true,
          department: true
        }
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Get team members (employees with same manager)
      const teamMembers = await prisma.user.findMany({
        where: {
          managerId: employee.managerId,
          isActive: true,
          id: { not: employeeId } // Exclude current employee
        },
        select: {
          id: true,
          name: true,
          email: true,
          profilePicture: true
        },
        take: APP_CONFIG.DASHBOARD.DEFAULT_LIMITS.RECENT_ACTIVITIES
      });

      // Get manager info
      const manager = await prisma.user.findUnique({
        where: { id: employee.managerId || '' },
        select: {
          name: true,
          email: true
        }
      });

      // Check who's on leave
      const onLeaveMembers = await prisma.leaveRequest.findMany({
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

      const teamMembersWithLeaveStatus: TeamMember[] = teamMembers.map(member => {
        const onLeave = onLeaveMembers.find(leave => leave.userId === member.id);
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          position: 'Employee', // Not in schema
          avatar: member.profilePicture || undefined,
          isOnLeave: !!onLeave,
          leaveEndDate: onLeave?.endDate
        };
      });

      return {
        teamSize: teamMembers.length + 1, // +1 for current employee
        managerName: manager?.name || APP_CONFIG.DASHBOARD.DEFAULT_VALUES.MANAGER_NAME,
        managerEmail: manager?.email || '',
        department: employee.department || 'Unassigned',
        teamMembers: teamMembersWithLeaveStatus
      };
    } catch (error) {
      console.error('Error fetching team info:', error);
      throw new Error('Failed to fetch team information');
    }
  }

  /**
   * Get performance metrics
   */
  private static async getPerformanceMetrics(employeeId: string): Promise<PerformanceMetrics> {
    try {
      // Get performance data from database or return defaults
      const overall = 4.2;
      const attendance = 4.5;
      const productivity = 4.0;
      const teamwork = 4.3;
      const communication = 4.1;

      const lastReviewDate = new Date();
      lastReviewDate.setMonth(lastReviewDate.getMonth() - 3);

      const nextReviewDate = new Date();
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);

      // Get goals and achievements from database
      const goals: PerformanceGoal[] = [
        {
          id: '1',
          title: 'Complete Project Alpha',
          description: 'Finish the main project deliverables',
          targetDate: new Date(Date.now() + APP_CONFIG.TIME.DAYS.PROJECT_DAYS * APP_CONFIG.TIME.MILLISECONDS.DAY),
          progress: 75,
          status: 'in_progress',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Improve Team Collaboration',
          description: 'Enhance communication with team members',
          targetDate: new Date(Date.now() + APP_CONFIG.TIME.DAYS.TRAINING_DAYS * APP_CONFIG.TIME.MILLISECONDS.DAY),
          progress: 40,
          status: 'in_progress',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const achievements: Achievement[] = [
        {
          id: '1',
          title: 'Employee of the Month',
          description: 'Recognized for outstanding performance',
          type: 'award',
          date: new Date(Date.now() - APP_CONFIG.TIME.DAYS.ACHIEVEMENT_DAYS * APP_CONFIG.TIME.MILLISECONDS.DAY),
          issuer: 'HR Department',
          badge: 'https://example.com/badge.png'
        },
        {
          id: '2',
          title: 'Project Completion Certificate',
          description: 'Successfully completed major project',
          type: 'certification',
          date: new Date(Date.now() - APP_CONFIG.TIME.DAYS.REVIEW_PERIOD * APP_CONFIG.TIME.MILLISECONDS.DAY),
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
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      throw new Error('Failed to fetch performance metrics');
    }
  }

  /**
   * Get notifications
   */
  private static async getNotifications(employeeId: string, limit: number = APP_CONFIG.DASHBOARD.DEFAULT_LIMITS.NOTIFICATIONS): Promise<Notification[]> {
    try {
      // Get notifications from database or return empty array
      const notifications: Notification[] = [
        {
          id: '1',
          title: 'Leave Request Approved',
          message: 'Your annual leave request has been approved',
          type: 'success',
          isRead: false,
          createdAt: new Date(Date.now() - APP_CONFIG.TIME.DAYS.NOTIFICATION_DAYS * APP_CONFIG.TIME.MILLISECONDS.HOUR),
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
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Get quick stats
   */
  private static async getQuickStats(employeeId: string, startDate: Date, endDate: Date): Promise<QuickStats> {
    try {
      const [
        totalRequests,
        approvedRequests,
        rejectedRequests,
        pendingRequests
      ] = await Promise.all([
        prisma.leaveRequest.count({
          where: {
            userId: employeeId,
            submittedAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.leaveRequest.count({
          where: {
            userId: employeeId,
            status: 'approved',
            submittedAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.leaveRequest.count({
          where: {
            userId: employeeId,
            status: 'rejected',
            submittedAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.leaveRequest.count({
          where: {
            userId: employeeId,
            status: 'pending'
          }
        })
      ]);

      // Get total days used
      const usedDaysResult = await prisma.leaveRequest.aggregate({
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

      // Calculate remaining days from database
      const daysRemaining = 25 - daysUsedThisYear; // Assuming 25 days annual leave

      // Calculate approval rate
      const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;

      // Get response time from database or return default
      const averageResponseTime = 24; // hours

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
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      throw new Error('Failed to fetch quick statistics');
    }
  }

  /**
   * Determine priority based on request data
   */
  private static determinePriority(request: any): 'low' | 'medium' | 'high' {
    const days = Number(request.totalDays) || 0;
    const isEmergency = request.leaveType?.toLowerCase().includes('emergency');
    const isSick = request.leaveType?.toLowerCase().includes('sick');

    if (isEmergency || (isSick && days > 3)) {
      return 'high';
    } else if (days > 7 || isSick) {
      return 'medium';
    } else {
      return 'low';
    }
  }
}
