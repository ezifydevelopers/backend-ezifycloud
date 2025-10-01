import { PrismaClient } from '@prisma/client';
import { 
  ManagerDashboardStats, 
  TeamLeaveBalance, 
  UpcomingLeave, 
  ManagerActivity, 
  TeamPerformanceMetrics,
  ManagerDepartmentStats,
  DateRange 
} from '../types';

const prisma = new PrismaClient();

export class ManagerDashboardService {
  /**
   * Get comprehensive dashboard statistics for manager
   */
  static async getDashboardStats(managerId: string, dateRange?: DateRange): Promise<ManagerDashboardStats> {
    try {
      const startDate = dateRange?.startDate || new Date(new Date().getFullYear(), 0, 1);
      const endDate = dateRange?.endDate || new Date();

      // Get manager's team members
      const teamMembers = await prisma.user.findMany({
        where: {
          managerId: managerId,
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          department: true
        }
      });

      const teamMemberIds = teamMembers.map(member => member.id);

      // Get basic counts
      const [
        teamSize,
        activeTeamMembers,
        pendingApprovals,
        approvedThisMonth,
        rejectedThisMonth
      ] = await Promise.all([
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
            status: 'pending'
          }
        }),
        prisma.leaveRequest.count({
          where: {
            user: { managerId: managerId },
            status: 'approved',
            submittedAt: { gte: startDate, lte: endDate }
          }
        }),
        prisma.leaveRequest.count({
          where: {
            user: { managerId: managerId },
            status: 'rejected',
            submittedAt: { gte: startDate, lte: endDate }
          }
        })
      ]);

      // Get team leave balance
      const teamLeaveBalance = await this.getTeamLeaveBalance(teamMemberIds, startDate, endDate);

      // Get upcoming leaves
      const upcomingLeaves = await this.getUpcomingLeaves(managerId, 5);

      // Get recent activities
      const recentActivities = await this.getRecentActivities(managerId, 10);

      // Get team performance metrics
      const teamPerformance = await this.getTeamPerformanceMetrics(managerId);

      // Get department stats
      const departmentStats = await this.getManagerDepartmentStats(managerId, startDate, endDate);

      return {
        teamSize,
        activeTeamMembers,
        pendingApprovals,
        approvedThisMonth,
        rejectedThisMonth,
        teamLeaveBalance,
        upcomingLeaves,
        recentActivities,
        teamPerformance,
        departmentStats
      };
    } catch (error) {
      console.error('Error fetching manager dashboard stats:', error);
      throw new Error('Failed to fetch manager dashboard statistics');
    }
  }

  /**
   * Get team leave balance summary
   */
  private static async getTeamLeaveBalance(teamMemberIds: string[], startDate: Date, endDate: Date): Promise<TeamLeaveBalance> {
    try {
      const currentYear = new Date().getFullYear();
      
      // Get leave balances for all team members
      const leaveBalances = await prisma.leaveBalance.findMany({
        where: {
          userId: { in: teamMemberIds },
          year: currentYear
        }
      });

      // Calculate totals
      const totalAnnual = leaveBalances.reduce((sum, balance) => sum + balance.annualTotal, 0);
      const usedAnnual = leaveBalances.reduce((sum, balance) => sum + balance.annualUsed, 0);
      const remainingAnnual = leaveBalances.reduce((sum, balance) => sum + balance.annualRemaining, 0);
      
      const totalSick = leaveBalances.reduce((sum, balance) => sum + balance.sickTotal, 0);
      const usedSick = leaveBalances.reduce((sum, balance) => sum + balance.sickUsed, 0);
      const remainingSick = leaveBalances.reduce((sum, balance) => sum + balance.sickRemaining, 0);
      
      const totalCasual = leaveBalances.reduce((sum, balance) => sum + balance.casualTotal, 0);
      const usedCasual = leaveBalances.reduce((sum, balance) => sum + balance.casualUsed, 0);
      const remainingCasual = leaveBalances.reduce((sum, balance) => sum + balance.casualRemaining, 0);

      const totalLeave = totalAnnual + totalSick + totalCasual;
      const usedLeave = usedAnnual + usedSick + usedCasual;
      const utilizationRate = totalLeave > 0 ? (usedLeave / totalLeave) * 100 : 0;

      return {
        totalAnnual,
        usedAnnual,
        remainingAnnual,
        totalSick,
        usedSick,
        remainingSick,
        totalCasual,
        usedCasual,
        remainingCasual,
        utilizationRate: Math.round(utilizationRate * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching team leave balance:', error);
      return {
        totalAnnual: 0,
        usedAnnual: 0,
        remainingAnnual: 0,
        totalSick: 0,
        usedSick: 0,
        remainingSick: 0,
        totalCasual: 0,
        usedCasual: 0,
        remainingCasual: 0,
        utilizationRate: 0
      };
    }
  }

  /**
   * Get upcoming leaves for team members
   */
  private static async getUpcomingLeaves(managerId: string, limit: number = 5): Promise<UpcomingLeave[]> {
    try {
      const upcomingLeaves = await prisma.leaveRequest.findMany({
        where: {
          user: { managerId: managerId },
          status: { in: ['pending', 'approved'] },
          startDate: { gte: new Date() }
        },
        take: limit,
        orderBy: { startDate: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true
            }
          }
        }
      });

      return upcomingLeaves.map(leave => ({
        id: leave.id,
        employeeId: leave.userId,
        employeeName: leave.user.name,
        employeeEmail: leave.user.email,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: Number(leave.totalDays),
        reason: leave.reason,
        status: leave.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(leave),
        submittedAt: leave.submittedAt,
        avatar: leave.user.profilePicture || undefined
      }));
    } catch (error) {
      console.error('Error fetching upcoming leaves:', error);
      return [];
    }
  }

  /**
   * Get recent activities for manager
   */
  private static async getRecentActivities(managerId: string, limit: number = 10): Promise<ManagerActivity[]> {
    try {
      const activities: ManagerActivity[] = [];

      // Get recent leave requests from team members
      const recentLeaveRequests = await prisma.leaveRequest.findMany({
        where: {
          user: { managerId: managerId }
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Get recent approvals/rejections by this manager
      const recentApprovals = await prisma.leaveRequest.findMany({
        where: {
          approvedBy: managerId
        },
        take: limit,
        orderBy: { approvedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Add leave request activities
      recentLeaveRequests.forEach(request => {
        activities.push({
          id: `leave_request_${request.id}`,
          type: 'leave_request',
          title: 'New Leave Request',
          description: `${request.user.name} requested ${Number(request.totalDays)} days of ${request.leaveType} leave`,
          employeeId: request.userId,
          employeeName: request.user.name,
          employeeEmail: request.user.email,
          timestamp: request.createdAt,
          metadata: {
            leaveType: request.leaveType,
            days: Number(request.totalDays),
            status: request.status
          }
        });
      });

      // Add approval activities
      recentApprovals.forEach(request => {
        activities.push({
          id: `leave_approval_${request.id}`,
          type: request.status === 'approved' ? 'leave_approval' : 'leave_rejection',
          title: request.status === 'approved' ? 'Leave Approved' : 'Leave Rejected',
          description: `${request.user.name}'s ${request.leaveType} leave request was ${request.status}`,
          employeeId: request.userId,
          employeeName: request.user.name,
          employeeEmail: request.user.email,
          timestamp: request.approvedAt || request.createdAt,
          metadata: {
            leaveType: request.leaveType,
            days: Number(request.totalDays),
            status: request.status
          }
        });
      });

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

    } catch (error) {
      console.error('Error fetching recent activities:', error);
      return [];
    }
  }

  /**
   * Get team performance metrics
   */
  private static async getTeamPerformanceMetrics(managerId: string): Promise<TeamPerformanceMetrics> {
    try {
      // Get team members
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

      // Get approval statistics
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

      // Calculate metrics
      const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;
      const rejectionRate = totalRequests > 0 ? (rejectedRequests / totalRequests) * 100 : 0;

      // Mock data for now - in real implementation, these would come from performance tracking
      const averageResponseTime = 24; // hours
      const teamSatisfaction = 4.2; // 1-5 scale
      const productivityScore = 7.5; // 1-10 scale
      const leaveUtilization = 65; // percentage

      return {
        averageResponseTime,
        approvalRate: Math.round(approvalRate * 100) / 100,
        teamSatisfaction,
        productivityScore,
        leaveUtilization
      };
    } catch (error) {
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

  /**
   * Get department statistics for manager
   */
  private static async getManagerDepartmentStats(managerId: string, startDate: Date, endDate: Date): Promise<ManagerDepartmentStats[]> {
    try {
      // Get manager's department
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { department: true }
      });

      if (!manager?.department) {
        return [];
      }

      const department = manager.department;

      // Get department statistics
      const [
        totalMembers,
        activeMembers,
        onLeave,
        leaveRequests
      ] = await Promise.all([
        prisma.user.count({
          where: { department }
        }),
        prisma.user.count({
          where: { 
            department,
            isActive: true 
          }
        }),
        prisma.leaveRequest.count({
          where: {
            user: { department },
            status: 'approved',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        }),
        prisma.leaveRequest.count({
          where: {
            user: { department },
            submittedAt: { gte: startDate, lte: endDate }
          }
        })
      ]);

      // Calculate approval rate for this department
      const approvedRequests = await prisma.leaveRequest.count({
        where: {
          user: { department },
          status: 'approved',
          submittedAt: { gte: startDate, lte: endDate }
        }
      });

      const approvalRate = leaveRequests > 0 ? (approvedRequests / leaveRequests) * 100 : 0;

      return [{
        department,
        totalMembers,
        activeMembers,
        onLeave,
        leaveRequests,
        averageResponseTime: 24, // Mock data
        approvalRate: Math.round(approvalRate * 100) / 100
      }];
    } catch (error) {
      console.error('Error fetching manager department stats:', error);
      return [];
    }
  }

  /**
   * Determine priority based on leave request data
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

  /**
   * Get quick stats for manager dashboard
   */
  static async getQuickStats(managerId: string): Promise<{
    teamSize: number;
    pendingApprovals: number;
    approvedThisWeek: number;
    rejectedThisWeek: number;
  }> {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const [
        teamSize,
        pendingApprovals,
        approvedThisWeek,
        rejectedThisWeek
      ] = await Promise.all([
        prisma.user.count({
          where: { 
            managerId: managerId,
            isActive: true 
          }
        }),
        prisma.leaveRequest.count({
          where: { 
            user: { managerId: managerId },
            status: 'pending'
          }
        }),
        prisma.leaveRequest.count({
          where: {
            user: { managerId: managerId },
            status: 'approved',
            submittedAt: { gte: weekStart }
          }
        }),
        prisma.leaveRequest.count({
          where: {
            user: { managerId: managerId },
            status: 'rejected',
            submittedAt: { gte: weekStart }
          }
        })
      ]);

      return {
        teamSize,
        pendingApprovals,
        approvedThisWeek,
        rejectedThisWeek
      };
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      throw new Error('Failed to fetch quick statistics');
    }
  }
}
