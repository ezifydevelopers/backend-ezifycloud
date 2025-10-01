import { PrismaClient } from '@prisma/client';
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

const prisma = new PrismaClient();

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
      const notifications = await this.getNotifications(employeeId, 10);

      // Get quick stats
      const quickStats = await this.getQuickStats(employeeId, startDate, endDate);

      return {
        personalInfo,
        leaveBalance,
        recentRequests,
        upcomingHolidays,
        teamInfo,
        performance,
        notifications,
        quickStats
      };
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
        skills: [], // Not in schema
        isActive: employee.isActive
      };
    } catch (error) {
      console.error('Error fetching personal info:', error);
      throw new Error('Failed to fetch personal information');
    }
  }

  /**
   * Get leave balance for employee
   */
  private static async getLeaveBalance(employeeId: string, startDate: Date, endDate: Date): Promise<LeaveBalance> {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get leave balance from database
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: employeeId,
            year: currentYear
          }
        }
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

      // Calculate pending days by leave type
      const pendingDays = {
        annual: 0,
        sick: 0,
        casual: 0,
        emergency: 0
      };

      pendingRequests.forEach(request => {
        const days = Number(request.totalDays);
        switch (request.leaveType) {
          case 'annual':
            pendingDays.annual += days;
            break;
          case 'sick':
            pendingDays.sick += days;
            break;
          case 'casual':
            pendingDays.casual += days;
            break;
          case 'emergency':
            pendingDays.emergency += days;
            break;
        }
      });

      const annual: LeaveBalanceDetail = {
        total: leaveBalance?.annualTotal || 25,
        used: leaveBalance?.annualUsed || 0,
        remaining: leaveBalance?.annualRemaining || 25,
        pending: pendingDays.annual,
        utilizationRate: leaveBalance ? (leaveBalance.annualUsed / leaveBalance.annualTotal) * 100 : 0
      };

      const sick: LeaveBalanceDetail = {
        total: leaveBalance?.sickTotal || 10,
        used: leaveBalance?.sickUsed || 0,
        remaining: leaveBalance?.sickRemaining || 10,
        pending: pendingDays.sick,
        utilizationRate: leaveBalance ? (leaveBalance.sickUsed / leaveBalance.sickTotal) * 100 : 0
      };

      const casual: LeaveBalanceDetail = {
        total: leaveBalance?.casualTotal || 8,
        used: leaveBalance?.casualUsed || 0,
        remaining: leaveBalance?.casualRemaining || 8,
        pending: pendingDays.casual,
        utilizationRate: leaveBalance ? (leaveBalance.casualUsed / leaveBalance.casualTotal) * 100 : 0
      };

      const emergency: LeaveBalanceDetail = {
        total: 3, // Default emergency leave
        used: 0,
        remaining: 3,
        pending: pendingDays.emergency,
        utilizationRate: 0
      };

      const total: LeaveBalanceSummary = {
        totalDays: annual.total + sick.total + casual.total + emergency.total,
        usedDays: annual.used + sick.used + casual.used + emergency.used,
        remainingDays: annual.remaining + sick.remaining + casual.remaining + emergency.remaining,
        pendingDays: annual.pending + sick.pending + casual.pending + emergency.pending,
        overallUtilization: 0
      };

      total.overallUtilization = total.totalDays > 0 ? (total.usedDays / total.totalDays) * 100 : 0;

      return {
        annual,
        sick,
        casual,
        emergency,
        total
      };
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
      // Mock data for holidays - in real implementation, this would come from a holidays table
      const holidays: Holiday[] = [
        {
          id: '1',
          name: 'New Year\'s Day',
          date: new Date(new Date().getFullYear() + 1, 0, 1),
          type: 'national',
          description: 'New Year celebration',
          isRecurring: true
        },
        {
          id: '2',
          name: 'Independence Day',
          date: new Date(new Date().getFullYear(), 6, 4),
          type: 'national',
          description: 'Independence Day celebration',
          isRecurring: true
        },
        {
          id: '3',
          name: 'Christmas Day',
          date: new Date(new Date().getFullYear(), 11, 25),
          type: 'national',
          description: 'Christmas celebration',
          isRecurring: true
        }
      ];

      return holidays.slice(0, limit);
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
        take: 10
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
        managerName: manager?.name || 'No Manager',
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
      // Mock performance data - in real implementation, this would come from a performance tracking system
      const overall = 4.2;
      const attendance = 4.5;
      const productivity = 4.0;
      const teamwork = 4.3;
      const communication = 4.1;

      const lastReviewDate = new Date();
      lastReviewDate.setMonth(lastReviewDate.getMonth() - 3);

      const nextReviewDate = new Date();
      nextReviewDate.setMonth(nextReviewDate.getMonth() + 3);

      // Mock goals and achievements
      const goals: PerformanceGoal[] = [
        {
          id: '1',
          title: 'Complete Project Alpha',
          description: 'Finish the main project deliverables',
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          progress: 75,
          status: 'in_progress',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Improve Team Collaboration',
          description: 'Enhance communication with team members',
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
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
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          issuer: 'HR Department',
          badge: 'https://example.com/badge.png'
        },
        {
          id: '2',
          title: 'Project Completion Certificate',
          description: 'Successfully completed major project',
          type: 'certification',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
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
  private static async getNotifications(employeeId: string, limit: number = 10): Promise<Notification[]> {
    try {
      // Mock notifications - in real implementation, this would come from a notifications table
      const notifications: Notification[] = [
        {
          id: '1',
          title: 'Leave Request Approved',
          message: 'Your annual leave request has been approved',
          type: 'success',
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
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

      // Calculate remaining days (mock data)
      const daysRemaining = 25 - daysUsedThisYear; // Assuming 25 days annual leave

      // Calculate approval rate
      const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;

      // Mock data for response time
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
