import { PrismaClient } from '@prisma/client';
import { 
  TeamMember, 
  TeamFilters, 
  TeamListResponse, 
  PaginationInfo,
  LeaveBalance,
  PerformanceMetrics,
  RecentLeave
} from '../types';

const prisma = new PrismaClient();

export class TeamService {
  /**
   * Get all team members with filtering, sorting, and pagination
   */
  static async getTeamMembers(managerId: string, filters: TeamFilters): Promise<TeamListResponse> {
    try {
      const {
        search = '',
        department = '',
        role = '',
        status = 'all',
        performance = 'all',
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        managerId: managerId
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (department && department !== 'all') {
        where.department = department;
      }

      if (role && role !== 'all') {
        where.role = role;
      }

      if (status !== 'all') {
        where.isActive = status === 'active';
      }

      // Get total count
      const totalCount = await prisma.user.count({ where });

      // Get team members with pagination
      const teamMembers = await prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Transform team members to include additional data
      const transformedMembers: TeamMember[] = await Promise.all(
        teamMembers.map(async (member) => {
          const leaveBalance = await this.getMemberLeaveBalance(member.id);
          const performance = await this.getMemberPerformance(member.id);
          const recentLeaves = await this.getMemberRecentLeaves(member.id);
          
          return {
            id: member.id,
            name: member.name,
            email: member.email,
            department: member.department || 'Unassigned',
            position: 'Employee', // Not in schema
            role: member.role as 'manager' | 'employee',
            managerId: member.managerId || undefined,
            managerName: member.manager?.name,
            isActive: member.isActive,
            joinDate: member.createdAt,
            lastLogin: undefined, // Not in schema
            leaveBalance,
            avatar: member.profilePicture || undefined,
            bio: undefined, // Not in schema
            skills: [], // Not in schema
            performance,
            recentLeaves,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt
          };
        })
      );

      // Filter by performance if specified
      let filteredMembers = transformedMembers;
      if (performance !== 'all') {
        filteredMembers = transformedMembers.filter(member => {
          const overallScore = member.performance.overall;
          switch (performance) {
            case 'high':
              return overallScore >= 4;
            case 'medium':
              return overallScore >= 3 && overallScore < 4;
            case 'low':
              return overallScore < 3;
            default:
              return true;
          }
        });
      }

      const totalPages = Math.ceil(totalCount / limit);

      const pagination: PaginationInfo = {
        page,
        limit,
        totalPages,
        totalItems: totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      };

      return {
        teamMembers: filteredMembers,
        pagination,
        filters,
        totalCount
      };
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw new Error('Failed to fetch team members');
    }
  }

  /**
   * Get team member by ID
   */
  static async getTeamMemberById(managerId: string, memberId: string): Promise<TeamMember | null> {
    try {
      const member = await prisma.user.findFirst({
        where: { 
          id: memberId,
          managerId: managerId 
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!member) {
        return null;
      }

      const leaveBalance = await this.getMemberLeaveBalance(member.id);
      const performance = await this.getMemberPerformance(member.id);
      const recentLeaves = await this.getMemberRecentLeaves(member.id);

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        department: member.department || 'Unassigned',
        position: 'Employee', // Not in schema
        role: member.role as 'manager' | 'employee',
        managerId: member.managerId || undefined,
        managerName: member.manager?.name,
        isActive: member.isActive,
        joinDate: member.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: member.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        performance,
        recentLeaves,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt
      };
    } catch (error) {
      console.error('Error fetching team member by ID:', error);
      throw new Error('Failed to fetch team member');
    }
  }

  /**
   * Update team member
   */
  static async updateTeamMember(managerId: string, memberId: string, updateData: {
    name?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    bio?: string;
    skills?: string[];
    performance?: {
      overall?: number;
      attendance?: number;
      productivity?: number;
      teamwork?: number;
      communication?: number;
    };
  }): Promise<TeamMember> {
    try {
      // Check if member belongs to this manager
      const existingMember = await prisma.user.findFirst({
        where: { 
          id: memberId,
          managerId: managerId 
        }
      });

      if (!existingMember) {
        throw new Error('Team member not found or not under your management');
      }

      // Check if email is being changed and if it already exists
      if (updateData.email && updateData.email !== existingMember.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email }
        });

        if (emailExists) {
          throw new Error('User with this email already exists');
        }
      }

      // Update member
      const member = await prisma.user.update({
        where: { id: memberId },
        data: {
          name: updateData.name,
          email: updateData.email,
          department: updateData.department
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      const leaveBalance = await this.getMemberLeaveBalance(member.id);
      const performance = await this.getMemberPerformance(member.id);
      const recentLeaves = await this.getMemberRecentLeaves(member.id);

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        department: member.department || 'Unassigned',
        position: 'Employee', // Not in schema
        role: member.role as 'manager' | 'employee',
        managerId: member.managerId || undefined,
        managerName: member.manager?.name,
        isActive: member.isActive,
        joinDate: member.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: member.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        performance,
        recentLeaves,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt
      };
    } catch (error) {
      console.error('Error updating team member:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update team member');
    }
  }

  /**
   * Toggle team member status
   */
  static async toggleTeamMemberStatus(managerId: string, memberId: string, isActive: boolean): Promise<TeamMember> {
    try {
      // Check if member belongs to this manager
      const existingMember = await prisma.user.findFirst({
        where: { 
          id: memberId,
          managerId: managerId 
        }
      });

      if (!existingMember) {
        throw new Error('Team member not found or not under your management');
      }

      const member = await prisma.user.update({
        where: { id: memberId },
        data: { isActive },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      const leaveBalance = await this.getMemberLeaveBalance(member.id);
      const performance = await this.getMemberPerformance(member.id);
      const recentLeaves = await this.getMemberRecentLeaves(member.id);

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        department: member.department || 'Unassigned',
        position: 'Employee', // Not in schema
        role: member.role as 'manager' | 'employee',
        managerId: member.managerId || undefined,
        managerName: member.manager?.name,
        isActive: member.isActive,
        joinDate: member.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: member.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        performance,
        recentLeaves,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt
      };
    } catch (error) {
      console.error('Error toggling team member status:', error);
      throw new Error('Failed to toggle team member status');
    }
  }

  /**
   * Get team member leave balance
   */
  private static async getMemberLeaveBalance(memberId: string): Promise<LeaveBalance> {
    try {
      const currentYear = new Date().getFullYear();
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: memberId,
            year: currentYear
          }
        }
      });

      if (leaveBalance) {
        return {
          annual: leaveBalance.annualRemaining,
          sick: leaveBalance.sickRemaining,
          casual: leaveBalance.casualRemaining,
          emergency: 3 // Default emergency leave
        };
      }

      // Return default values if no balance record exists
      return {
        annual: 25,
        sick: 10,
        casual: 8,
        emergency: 3
      };
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      return {
        annual: 0,
        sick: 0,
        casual: 0,
        emergency: 0
      };
    }
  }

  /**
   * Get team member performance metrics
   */
  private static async getMemberPerformance(memberId: string): Promise<PerformanceMetrics> {
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

      return {
        overall,
        attendance,
        productivity,
        teamwork,
        communication,
        lastReviewDate,
        nextReviewDate
      };
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return {
        overall: 0,
        attendance: 0,
        productivity: 0,
        teamwork: 0,
        communication: 0,
        lastReviewDate: new Date(),
        nextReviewDate: new Date()
      };
    }
  }

  /**
   * Get team member recent leaves
   */
  private static async getMemberRecentLeaves(memberId: string): Promise<RecentLeave[]> {
    try {
      const recentLeaves = await prisma.leaveRequest.findMany({
        where: { userId: memberId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          totalDays: true,
          status: true,
          submittedAt: true
        }
      });

      return recentLeaves.map(leave => ({
        id: leave.id,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: Number(leave.totalDays),
        status: leave.status as 'pending' | 'approved' | 'rejected',
        submittedAt: leave.submittedAt
      }));
    } catch (error) {
      console.error('Error fetching recent leaves:', error);
      return [];
    }
  }

  /**
   * Get team statistics
   */
  static async getTeamStats(managerId: string): Promise<{
    totalMembers: number;
    activeMembers: number;
    onLeave: number;
    averagePerformance: number;
    leaveUtilization: number;
    byDepartment: { [key: string]: number };
    byRole: { [key: string]: number };
  }> {
    try {
      const [
        totalMembers,
        activeMembers,
        onLeave
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
            status: 'approved',
            startDate: { lte: new Date() },
            endDate: { gte: new Date() }
          }
        })
      ]);

      // Get team members for additional stats
      const teamMembers = await prisma.user.findMany({
        where: { managerId: managerId },
        select: {
          department: true,
          role: true
        }
      });

      const byDepartment = teamMembers.reduce((acc, member) => {
        const dept = member.department || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const byRole = teamMembers.reduce((acc, member) => {
        acc[member.role] = (acc[member.role] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      // Mock data for performance and utilization
      const averagePerformance = 4.2;
      const leaveUtilization = 65;

      return {
        totalMembers,
        activeMembers,
        onLeave,
        averagePerformance,
        leaveUtilization,
        byDepartment,
        byRole
      };
    } catch (error) {
      console.error('Error fetching team stats:', error);
      throw new Error('Failed to fetch team statistics');
    }
  }

  /**
   * Get departments for team members
   */
  static async getTeamDepartments(managerId: string): Promise<string[]> {
    try {
      const departments = await prisma.user.groupBy({
        by: ['department'],
        where: { 
          managerId: managerId,
          isActive: true,
          department: { not: null }
        },
        _count: {
          department: true
        }
      });

      return departments.map(dept => dept.department).filter(Boolean) as string[];
    } catch (error) {
      console.error('Error fetching team departments:', error);
      return [];
    }
  }
}
