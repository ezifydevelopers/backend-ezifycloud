import { PrismaClient } from '@prisma/client';
import { 
  AdminDashboardStats, 
  DepartmentStats, 
  RecentActivity, 
  MonthlyLeaveTrend,
  DateRange 
} from '../types';

const prisma = new PrismaClient();

export class DashboardService {
  /**
   * Get comprehensive dashboard statistics for admin
   */
  static async getDashboardStats(dateRange?: DateRange): Promise<AdminDashboardStats> {
    try {
      const startDate = dateRange?.startDate || new Date(new Date().getFullYear(), 0, 1);
      const endDate = dateRange?.endDate || new Date();

      // Get basic counts
      const [
        totalEmployees,
        activeEmployees,
        pendingLeaveRequests,
        approvedLeaveRequests,
        rejectedLeaveRequests,
        totalLeaveDays,
        usedLeaveDays,
        upcomingHolidays
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.leaveRequest.count({ where: { status: 'pending' } }),
        prisma.leaveRequest.count({ 
          where: { 
            status: 'approved',
            submittedAt: { gte: startDate, lte: endDate }
          } 
        }),
        prisma.leaveRequest.count({ 
          where: { 
            status: 'rejected',
            submittedAt: { gte: startDate, lte: endDate }
          } 
        }),
        this.calculateTotalLeaveDays(),
        this.calculateUsedLeaveDays(startDate, endDate),
        this.getUpcomingHolidaysCount()
      ]);

      // Get department statistics
      const departmentStats = await this.getDepartmentStats(startDate, endDate);

      // Get recent activities
      const recentActivities = await this.getRecentActivities(10);

      // Get monthly leave trend
      const monthlyLeaveTrend = await this.getMonthlyLeaveTrend(startDate, endDate);

      // Return actual data from database
      const actualData = {
        totalEmployees,
        activeEmployees,
        pendingLeaveRequests,
        approvedLeaveRequests,
        rejectedLeaveRequests,
        totalLeaveDays,
        usedLeaveDays,
        upcomingHolidays,
        departmentStats: departmentStats || [],
        recentActivities: recentActivities || [],
        monthlyLeaveTrend: monthlyLeaveTrend || []
      };

      console.log('🔍 AdminDashboardService: Returning stats:', actualData);
      return actualData;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw new Error('Failed to fetch dashboard statistics');
    }
  }

  /**
   * Get department-wise statistics
   */
  private static async getDepartmentStats(startDate: Date, endDate: Date): Promise<DepartmentStats[]> {
    try {
      const departments = await prisma.user.groupBy({
        by: ['department'],
        _count: {
          id: true
        },
        where: {
          isActive: true
        }
      });

      const departmentStats: DepartmentStats[] = [];

      for (const dept of departments) {
        const department = dept.department;
        const totalEmployees = dept._count.id;

        const [activeEmployees, onLeave, leaveRequests, leaveDaysUsed] = await Promise.all([
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
          }),
          prisma.leaveRequest.aggregate({
            where: {
              user: { department },
              status: 'approved',
              submittedAt: { gte: startDate, lte: endDate }
            },
            _sum: {
              totalDays: true
            }
          })
        ]);

        const leaveDaysUsedCount = Number(leaveDaysUsed._sum.totalDays) || 0;
        const leaveDaysRemaining = (totalEmployees * 21) - leaveDaysUsedCount; // Assuming 21 days annual leave

        departmentStats.push({
          department: department || 'Unassigned',
          totalEmployees,
          activeEmployees,
          onLeave,
          leaveRequests,
          averageResponseTime: 0, // TODO: Calculate actual response time
          totalLeaveDays: totalEmployees * 21, // Assuming 21 days annual leave
          leaveDaysUsed: leaveDaysUsedCount,
          leaveDaysRemaining: Math.max(0, leaveDaysRemaining)
        });
      }

      return departmentStats;
    } catch (error) {
      console.error('Error fetching department stats:', error);
      return [];
    }
  }

  /**
   * Get recent activities across the system
   */
  private static async getRecentActivities(limit: number = 10): Promise<RecentActivity[]> {
    try {
      // Get recent leave requests
      const recentLeaveRequests = await prisma.leaveRequest.findMany({
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

      // Get recent user activities
      const recentUsers = await prisma.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      });

      const activities: RecentActivity[] = [];

      // Add leave request activities
      recentLeaveRequests.forEach(request => {
        activities.push({
          id: `leave_${request.id}`,
          type: 'leave_request',
          title: 'New Leave Request',
          description: `${request.user.name} requested ${Number(request.totalDays)} days of ${request.leaveType} leave`,
          userId: request.userId,
          userName: request.user.name,
          userEmail: request.user.email,
          timestamp: request.createdAt,
          metadata: {
            leaveType: request.leaveType,
            days: Number(request.totalDays),
            status: request.status
          }
        });
      });

      // Add user creation activities
      recentUsers.forEach(user => {
        activities.push({
          id: `user_${user.id}`,
          type: 'employee_created',
          title: 'New Employee Added',
          description: `${user.name} joined the organization`,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          timestamp: user.createdAt
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
   * Get monthly leave trend data
   */
  private static async getMonthlyLeaveTrend(startDate: Date, endDate: Date): Promise<MonthlyLeaveTrend[]> {
    try {
      const trends: MonthlyLeaveTrend[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const [totalRequests, approvedRequests, rejectedRequests, totalDays] = await Promise.all([
          prisma.leaveRequest.count({
            where: {
              submittedAt: { gte: monthStart, lte: monthEnd }
            }
          }),
          prisma.leaveRequest.count({
            where: {
              status: 'approved',
              submittedAt: { gte: monthStart, lte: monthEnd }
            }
          }),
          prisma.leaveRequest.count({
            where: {
              status: 'rejected',
              submittedAt: { gte: monthStart, lte: monthEnd }
            }
          }),
          prisma.leaveRequest.aggregate({
            where: {
              submittedAt: { gte: monthStart, lte: monthEnd }
            },
            _sum: {
              totalDays: true
            }
          })
        ]);

        const totalDaysCount = Number(totalDays._sum.totalDays) || 0;
        const averageDaysPerRequest = totalRequests > 0 ? totalDaysCount / totalRequests : 0;

        trends.push({
          month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
          year: monthStart.getFullYear(),
          totalRequests,
          approved: approvedRequests,
          rejected: rejectedRequests,
          pending: totalRequests - approvedRequests - rejectedRequests,
          approvedRequests,
          rejectedRequests,
          totalDays: totalDaysCount,
          averageDaysPerRequest: Math.round(averageDaysPerRequest * 100) / 100
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      return trends;
    } catch (error) {
      console.error('Error fetching monthly leave trend:', error);
      return [];
    }
  }

  /**
   * Calculate total leave days allocated
   */
  private static async calculateTotalLeaveDays(): Promise<number> {
    try {
      const activeEmployees = await prisma.user.count({
        where: { isActive: true }
      });
      // Assuming 21 days annual leave per employee
      return activeEmployees * 21;
    } catch (error) {
      console.error('Error calculating total leave days:', error);
      return 0;
    }
  }

  /**
   * Calculate used leave days in date range
   */
  private static async calculateUsedLeaveDays(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await prisma.leaveRequest.aggregate({
        where: {
          status: 'approved',
          submittedAt: { gte: startDate, lte: endDate }
        },
        _sum: {
          totalDays: true
        }
      });

      return Number(result._sum.totalDays) || 0;
    } catch (error) {
      console.error('Error calculating used leave days:', error);
      return 0;
    }
  }

  /**
   * Get count of upcoming holidays
   */
  private static async getUpcomingHolidaysCount(): Promise<number> {
    try {
      // This would typically come from a holidays table
      // For now, return 0 as holidays table is not implemented
      return 0;
    } catch (error) {
      console.error('Error fetching upcoming holidays:', error);
      return 0;
    }
  }

  /**
   * Get quick stats for dashboard cards
   */
  static async getQuickStats(): Promise<{
    totalEmployees: number;
    pendingRequests: number;
    approvedRequests: number;
    rejectedRequests: number;
  }> {
    try {
      const [
        totalEmployees,
        pendingRequests,
        approvedRequests,
        rejectedRequests
      ] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.leaveRequest.count({ where: { status: 'pending' } }),
        prisma.leaveRequest.count({ where: { status: 'approved' } }),
        prisma.leaveRequest.count({ where: { status: 'rejected' } })
      ]);

      return {
        totalEmployees,
        pendingRequests,
        approvedRequests,
        rejectedRequests
      };
    } catch (error) {
      console.error('Error fetching quick stats:', error);
      throw new Error('Failed to fetch quick statistics');
    }
  }
}
