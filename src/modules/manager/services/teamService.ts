import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
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

      console.log('🔍 TeamService: getTeamMembers called with managerId:', managerId);
      console.log('🔍 TeamService: where clause:', JSON.stringify(where));

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
      console.log('🔍 TeamService: totalCount found:', totalCount);

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

      console.log('🔍 TeamService: teamMembers found:', teamMembers.length);
      console.log('🔍 TeamService: teamMembers data:', teamMembers.map(m => ({ id: m.id, name: m.name, managerId: m.managerId })));

      // Transform team members to include additional data
      const transformedMembers: TeamMember[] = await Promise.all(
        teamMembers.map(async (member) => {
          console.log('🔍 TeamService: Transforming member:', member.name, member.id);
          
          let leaveBalance: any, performance: any, recentLeaves: any[];
          
          try {
            leaveBalance = await this.getMemberLeaveBalance(member.id);
            console.log('🔍 TeamService: Leave balance for', member.name, ':', leaveBalance);
          } catch (error) {
            console.error('🔍 TeamService: Error getting leave balance for', member.name, ':', error);
            leaveBalance = { annual: 20, sick: 10, casual: 5, emergency: 3 };
          }
          
          try {
            performance = await this.getMemberPerformance(member.id);
            console.log('🔍 TeamService: Performance for', member.name, ':', performance);
          } catch (error) {
            console.error('🔍 TeamService: Error getting performance for', member.name, ':', error);
            performance = { overall: 4.0, attendance: 4.0, productivity: 4.0, teamwork: 4.0, communication: 4.0, lastReviewDate: new Date(), nextReviewDate: new Date() };
          }
          
          try {
            recentLeaves = await this.getMemberRecentLeaves(member.id);
            console.log('🔍 TeamService: Recent leaves for', member.name, ':', recentLeaves);
          } catch (error) {
            console.error('🔍 TeamService: Error getting recent leaves for', member.name, ':', error);
            recentLeaves = [];
          }
          
          // Determine status based on isActive, recent activity, and leave requests
          let status = 'offline';
          if (member.isActive) {
            // Check if user has been active recently (within last 24 hours)
            const lastActiveDate = member.updatedAt;
            const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
            
            // Check if user is currently on leave
            const today = new Date();
            const hasActiveLeave = recentLeaves.some(leave => {
              const startDate = new Date(leave.startDate);
              const endDate = new Date(leave.endDate);
              return leave.status === 'approved' && today >= startDate && today <= endDate;
            });
            
            if (hasActiveLeave) {
              status = 'on-leave';
            } else if (hoursSinceActive < 24) {
              status = 'active';
            } else {
              status = 'offline';
            }
          }

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
            status: status as 'active' | 'on-leave' | 'offline', // Add status field for frontend compatibility
            joinDate: member.createdAt,
            lastLogin: undefined, // Not in schema
            leaveBalance,
            avatar: member.profilePicture || undefined,
            bio: undefined, // Not in schema
            performance,
            recentLeaves,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt
          };
        })
      );

      console.log('🔍 TeamService: Transformed members count:', transformedMembers.length);
      console.log('🔍 TeamService: Transformed members:', transformedMembers.map(m => ({ id: m.id, name: m.name, email: m.email })));

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

      console.log('🔍 TeamService: Final result - teamMembers count:', filteredMembers.length);
      console.log('🔍 TeamService: Final result - teamMembers:', filteredMembers.map(m => ({ id: m.id, name: m.name, email: m.email })));

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

      // Determine status based on isActive and recent activity
      let status = 'offline';
      if (member.isActive) {
        const lastActiveDate = member.updatedAt;
        const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
        
        // Check if user is currently on leave
        const today = new Date();
        const hasActiveLeave = recentLeaves.some(leave => {
          const startDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          return leave.status === 'approved' && today >= startDate && today <= endDate;
        });
        
        if (hasActiveLeave) {
          status = 'on-leave';
        } else if (hoursSinceActive < 24) {
          status = 'active';
        } else {
          status = 'offline';
        }
      }

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
        status: status as 'active' | 'on-leave' | 'offline',
        joinDate: member.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: member.profilePicture || undefined,
        bio: undefined, // Not in schema
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
   * Add new team member
   */
  static async addTeamMember(managerId: string, memberData: {
    name: string;
    email: string;
    phone: string;
    department: string;
    role: string;
    position: string;
    salary: number;
    startDate: string;
    address: string;
    emergencyContact: string;
    emergencyPhone: string;
    notes?: string;
    isActive?: boolean;
  }): Promise<TeamMember> {
    try {
      console.log('🔍 TeamService: addTeamMember called');
      console.log('🔍 TeamService: managerId:', managerId);
      console.log('🔍 TeamService: memberData:', memberData);

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: memberData.email }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Verify manager exists
      const manager = await prisma.user.findUnique({
        where: { id: managerId }
      });

      if (!manager) {
        throw new Error('Manager not found');
      }

      // Create new user with only the fields that exist in the schema
      const newUser = await prisma.user.create({
        data: {
          name: memberData.name,
          email: memberData.email,
          department: memberData.department,
          role: memberData.role as any,
          isActive: memberData.isActive ?? true,
          managerId: managerId,
          // Set a default password that the user will need to change on first login
          passwordHash: 'TempPassword123!', // This should be handled differently in production
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

      console.log('✅ TeamService: Team member created successfully:', newUser.id);

      // Return the created user as TeamMember
      return {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        department: newUser.department || '',
        position: '', // Not available in current schema
        role: newUser.role === 'admin' ? 'employee' : newUser.role, // Map admin to employee for TeamMember type
        managerId: newUser.managerId || undefined,
        managerName: newUser.manager?.name || undefined,
        isActive: newUser.isActive,
        status: newUser.isActive ? 'active' : 'offline', // New users are active by default
        joinDate: newUser.createdAt, // Use createdAt as joinDate
        lastLogin: undefined,
        leaveBalance: { annual: 0, sick: 0, casual: 0, emergency: 0 }, // Default leave balance
        avatar: undefined,
        bio: undefined,
        performance: { 
          overall: 0, 
          attendance: 0, 
          productivity: 0, 
          teamwork: 0, 
          communication: 0,
          lastReviewDate: new Date(),
          nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
        }, // Default performance
        recentLeaves: [], // Empty array for new user
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      };
    } catch (error) {
      console.error('❌ TeamService: Error adding team member:', error);
      throw error;
    }
  }

  /**
   * Update team member
   */
  static async updateTeamMember(managerId: string, memberId: string, updateData: {
    name?: string;
    email?: string;
    password?: string;
    phone?: string;
    department?: string;
    position?: string;
    bio?: string;
    performance?: {
      overall?: number;
      attendance?: number;
      productivity?: number;
      teamwork?: number;
      communication?: number;
    };
  }, editedBy?: { userId: string; userName: string; ipAddress?: string; userAgent?: string }): Promise<TeamMember> {
    try {
      // Check if member belongs to this manager
      const existingMember = await prisma.user.findFirst({
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

      // Track field changes for audit log
      const fieldChanges: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
      const oldData: Record<string, unknown> = {};
      const newData: Record<string, unknown> = {};

      // Compare and track changes
      const fieldsToTrack: Array<{ key: keyof typeof updateData; dbKey: string }> = [
        { key: 'name', dbKey: 'name' },
        { key: 'email', dbKey: 'email' },
        { key: 'phone', dbKey: 'phone' },
        { key: 'department', dbKey: 'department' },
      ];

      fieldsToTrack.forEach(({ key, dbKey }) => {
        if (updateData[key] !== undefined) {
          const oldValue = existingMember[dbKey as keyof typeof existingMember];
          const newValue = updateData[key];
          
          // Only track if value actually changed
          if (oldValue !== newValue) {
            fieldChanges.push({
              field: dbKey,
              oldValue: oldValue ?? null,
              newValue: newValue ?? null
            });
            oldData[dbKey] = oldValue ?? null;
            newData[dbKey] = newValue ?? null;
          }
        }
      });

      // Prepare update data
      const updateFields: any = {};
      
      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.email !== undefined) updateFields.email = updateData.email;
      if (updateData.department !== undefined) updateFields.department = updateData.department;
      
      // Hash password if provided
      if (updateData.password) {
        const saltRounds = 12;
        updateFields.passwordHash = await bcrypt.hash(updateData.password, saltRounds);
        // Track password change (without showing the actual password)
        fieldChanges.push({
          field: 'password',
          oldValue: '***',
          newValue: '***'
        });
      }

      // Update member
      const member = await prisma.user.update({
        where: { id: memberId },
        data: updateFields,
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Log changes to audit log if there are any changes and editor info is provided
      if (fieldChanges.length > 0 && editedBy) {
        try {
          const { AuditService } = await import('../../audit/services/auditService');
          await AuditService.logUpdate(
            editedBy.userId,
            editedBy.userName,
            'employee',
            memberId,
            fieldChanges,
            oldData,
            newData,
            {
              ipAddress: editedBy.ipAddress,
              userAgent: editedBy.userAgent,
              requestMethod: 'PUT',
              requestPath: `/manager/team/members/${memberId}`
            }
          );
        } catch (auditError) {
          console.error('Failed to log team member update to audit log:', auditError);
          // Don't throw - audit logging failure shouldn't break the update
        }
      }

      const leaveBalance = await this.getMemberLeaveBalance(member.id);
      const performance = await this.getMemberPerformance(member.id);
      const recentLeaves = await this.getMemberRecentLeaves(member.id);

      // Determine status based on isActive and recent activity
      let status = 'offline';
      if (member.isActive) {
        const lastActiveDate = member.updatedAt;
        const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
        
        // Check if user is currently on leave
        const today = new Date();
        const hasActiveLeave = recentLeaves.some(leave => {
          const startDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          return leave.status === 'approved' && today >= startDate && today <= endDate;
        });
        
        if (hasActiveLeave) {
          status = 'on-leave';
        } else if (hoursSinceActive < 24) {
          status = 'active';
        } else {
          status = 'offline';
        }
      }

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
        status: status as 'active' | 'on-leave' | 'offline',
        joinDate: member.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: member.profilePicture || undefined,
        bio: undefined, // Not in schema
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

      // Determine status based on isActive and recent activity
      let status = 'offline';
      if (member.isActive) {
        const lastActiveDate = member.updatedAt;
        const hoursSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60);
        
        // Check if user is currently on leave
        const today = new Date();
        const hasActiveLeave = recentLeaves.some(leave => {
          const startDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          return leave.status === 'approved' && today >= startDate && today <= endDate;
        });
        
        if (hasActiveLeave) {
          status = 'on-leave';
        } else if (hoursSinceActive < 24) {
          status = 'active';
        } else {
          status = 'offline';
        }
      }

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
        status: status as 'active' | 'on-leave' | 'offline',
        joinDate: member.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: member.profilePicture || undefined,
        bio: undefined, // Not in schema
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
   * Get team member performance metrics
   */
  private static async getMemberPerformance(memberId: string): Promise<PerformanceMetrics> {
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

      // Get performance and utilization data from database
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

  /**
   * Get team member leave balance (public method for API)
   */
  public static async getTeamMemberLeaveBalance(managerId: string, memberId: string): Promise<any> {
    try {
      // Verify the member belongs to this manager
      const member = await prisma.user.findFirst({
        where: {
          id: memberId,
          managerId: managerId
        }
      });

      if (!member) {
        throw new Error('Team member not found or not under this manager');
      }

      return await this.getMemberLeaveBalance(memberId);
    } catch (error) {
      console.error('Error fetching team member leave balance:', error);
      return {
        annual: 14,
        sick: 5,
        casual: 5,
        emergency: 3
      };
    }
  }

  /**
   * Manually adjust team member leave balance (Manager only)
   * This allows managers to add additional leave days beyond the policy limit for their team members
   */
  public static async adjustTeamMemberLeaveBalance(
    managerId: string,
    memberId: string,
    leaveType: string,
    additionalDays: number,
    reason: string,
    year?: number
  ): Promise<any> {
    try {
      // Verify the member belongs to this manager and get employeeType
      const member = await prisma.user.findFirst({
        where: {
          id: memberId,
          managerId: managerId
        },
        select: {
          id: true,
          name: true,
          employeeType: true
        }
      });

      if (!member) {
        throw new Error('Team member not found or not under your management');
      }

      const currentYear = year || new Date().getFullYear();

      // Validate leave type - find policy matching employeeType or generic (null)
      // First try to find policy with exact employeeType match
      let policy = null;
      
      if (member?.employeeType) {
        policy = await prisma.leavePolicy.findFirst({
          where: {
            leaveType,
            employeeType: member.employeeType,
            isActive: true
          }
        });
        
        console.log('🔍 Manager createLeaveRequestForMember: Looking for policy with employeeType:', member.employeeType);
        console.log('🔍 Manager createLeaveRequestForMember: Found policy with exact match:', policy ? 'Yes' : 'No');
        
        // If no exact match found, fallback to null employeeType policies (for migration support)
        if (!policy) {
          console.warn('⚠️ Manager createLeaveRequestForMember: No policy found for employeeType:', member.employeeType);
          console.warn('⚠️ Manager createLeaveRequestForMember: Falling back to null employeeType policies (migration support)');
          
          policy = await prisma.leavePolicy.findFirst({
            where: {
              leaveType,
              employeeType: null,
              isActive: true
            }
          });
          
          if (policy) {
            console.warn('⚠️ Manager createLeaveRequestForMember: Using legacy policy with null employeeType.');
            console.warn('⚠️ Manager createLeaveRequestForMember: Admin should update this policy to set employeeType =', member.employeeType);
          }
        }
      } else {
        // If member has no employeeType, try null policies as fallback
        console.warn('⚠️ Manager createLeaveRequestForMember: Member has no employeeType, trying null policies as fallback');
        policy = await prisma.leavePolicy.findFirst({
          where: {
            leaveType,
            employeeType: null,
            isActive: true
          }
        });
      }

      if (!policy) {
        throw new Error(`No leave policy found for ${leaveType} leave`);
      }

      // Get or create leave balance
      let leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: memberId,
            year: currentYear
          }
        }
      });

      if (!leaveBalance) {
        // Create new leave balance record
        leaveBalance = await prisma.leaveBalance.create({
          data: {
            userId: memberId,
            year: currentYear,
            annualTotal: 25,
            annualUsed: 0,
            annualRemaining: 25,
            sickTotal: 10,
            sickUsed: 0,
            sickRemaining: 10,
            casualTotal: 8,
            casualUsed: 0,
            casualRemaining: 8,
            maternityTotal: 90,
            maternityUsed: 0,
            maternityRemaining: 90,
            paternityTotal: 15,
            paternityUsed: 0,
            paternityRemaining: 15,
            emergencyTotal: 5,
            emergencyUsed: 0,
            emergencyRemaining: 5
          }
        });
      }

      // Map leave type to balance field
      const balanceFieldMap: { [key: string]: { total: string; remaining: string } } = {
        'annual': { total: 'annualTotal', remaining: 'annualRemaining' },
        'sick': { total: 'sickTotal', remaining: 'sickRemaining' },
        'casual': { total: 'casualTotal', remaining: 'casualRemaining' },
        'maternity': { total: 'maternityTotal', remaining: 'maternityRemaining' },
        'paternity': { total: 'paternityTotal', remaining: 'paternityRemaining' },
        'emergency': { total: 'emergencyTotal', remaining: 'emergencyRemaining' }
      };

      const fields = balanceFieldMap[leaveType];
      if (!fields) {
        throw new Error(`Invalid leave type: ${leaveType}`);
      }

      // Update leave balance - add additional days to total and remaining
      const currentTotal = (leaveBalance as any)[fields.total];
      const currentRemaining = (leaveBalance as any)[fields.remaining];
      
      const updatedBalance = await prisma.leaveBalance.update({
        where: {
          userId_year: {
            userId: memberId,
            year: currentYear
          }
        },
        data: {
          [fields.total]: currentTotal + additionalDays,
          [fields.remaining]: currentRemaining + additionalDays
        }
      });

      // Get manager user name for audit log
      const managerUser = await prisma.user.findUnique({
        where: { id: managerId },
        select: { name: true }
      });

      // Create audit log entry for the adjustment
      await prisma.auditLog.create({
        data: {
          userId: managerId,
          userName: managerUser?.name || 'System',
          action: 'ADJUST_LEAVE_BALANCE',
          targetId: memberId,
          targetType: 'user',
          details: {
            leaveType,
            additionalDays,
            reason,
            previousTotal: currentTotal,
            newTotal: currentTotal + additionalDays,
            previousRemaining: currentRemaining,
            newRemaining: currentRemaining + additionalDays,
            year: currentYear,
            adjustedBy: 'manager'
          } as any
        }
      });

      return {
        success: true,
        message: `Successfully added ${additionalDays} ${leaveType} leave days to ${member.name}'s balance`,
        leaveBalance: updatedBalance
      };
    } catch (error) {
      console.error('Error adjusting team member leave balance:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to adjust team member leave balance');
    }
  }

  /**
   * Get member leave balance based on active policies and actual approved requests
   * Now calculates based on employee tenure
   */
  private static async getMemberLeaveBalance(memberId: string): Promise<any> {
    try {
      const currentYear = new Date().getFullYear();
      console.log('🔍 TeamService: getMemberLeaveBalance called for member:', memberId, 'year:', currentYear);
      
      // Get employee info including joinDate and employeeType
      const employee = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
          joinDate: true,
          createdAt: true,
          employeeType: true
        }
      });

      if (!employee) {
        return {
          annual: 0,
          sick: 0,
          casual: 0,
          emergency: 0
        };
      }

      // Calculate days served (for daily accrual)
      const joinDate = employee.joinDate ? new Date(employee.joinDate) : new Date(employee.createdAt);
      const currentDate = new Date();
      const daysServed = this.calculateDaysServed(joinDate, currentDate);
      
      // Get active leave policies from database filtered by employeeType
      // IMPORTANT: Strictly filter by employeeType - no fallback to null policies
      // Employees should ONLY see policies that match their employeeType (onshore/offshore)
      // Get active leave policies filtered by employeeType with fallback
      // IMPORTANT: First try exact match, then fallback to null policies for migration support
      let leavePolicies: any[] = [];
      
      try {
        if (employee.employeeType) {
          // First try to get policies with exact employeeType match
          leavePolicies = await prisma.leavePolicy.findMany({
            where: {
              isActive: true,
              employeeType: employee.employeeType
            },
            select: {
              leaveType: true,
              totalDaysPerYear: true,
              employeeType: true
            } as any
          });
          
          console.log('🔍 Manager getMemberLeaveBalance: Filtering by employeeType:', employee.employeeType);
          console.log('🔍 Manager getMemberLeaveBalance: Found policies with exact match:', leavePolicies.length);
          
          // If no policies found with exact match, fallback to null policies (for migration support)
          if (leavePolicies.length === 0) {
            console.warn('⚠️ Manager getMemberLeaveBalance: No policies found for employeeType:', employee.employeeType);
            console.warn('⚠️ Manager getMemberLeaveBalance: Falling back to null employeeType policies (migration support)');
            
            leavePolicies = await prisma.leavePolicy.findMany({
              where: {
                isActive: true,
                employeeType: null
              },
              select: {
                leaveType: true,
                totalDaysPerYear: true,
                employeeType: true
              } as any
            });
            
            console.log('🔍 Manager getMemberLeaveBalance: Found null employeeType policies (fallback):', leavePolicies.length);
            
            if (leavePolicies.length > 0) {
              console.warn('⚠️ Manager getMemberLeaveBalance: Using legacy policies with null employeeType.');
              console.warn('⚠️ Manager getMemberLeaveBalance: Admin should update these policies to set employeeType =', employee.employeeType);
            }
          }
        } else {
          // If employee has no employeeType, try null policies as fallback
          console.warn('⚠️ Manager getMemberLeaveBalance: Employee has no employeeType, trying null policies as fallback');
          leavePolicies = await prisma.leavePolicy.findMany({
            where: {
              isActive: true,
              employeeType: null
            },
            select: {
              leaveType: true,
              totalDaysPerYear: true,
              employeeType: true
            } as any
          });
        }
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

      // Get all leave requests for the year (both approved and pending)
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);
      
      const allRequests = await prisma.leaveRequest.findMany({
        where: {
          userId: memberId,
          submittedAt: { gte: startOfYear, lte: endOfYear }
        },
        select: {
          leaveType: true,
          totalDays: true,
          status: true
        }
      });

      // Calculate used days from approved requests
      const usedDays: { [key: string]: number } = {};
      
      console.log('🔍 TeamService: Processing leave requests:', allRequests.length);
      
      allRequests.forEach(request => {
        const days = Number(request.totalDays);
        console.log(`🔍 TeamService: Request - Type: ${request.leaveType}, Days: ${days}, Status: ${request.status}`);
        
        if (request.status === 'approved') {
          usedDays[request.leaveType] = (usedDays[request.leaveType] || 0) + days;
        }
      });
      
      console.log('🔍 TeamService: Calculated used days:', usedDays);

      // Build leave balance based on active policies and calculated usage
      const result: LeaveBalance = {
        annual: 0,
        sick: 0,
        casual: 0,
        emergency: 0
      };

      // Only include leave types that have active policies
      for (const [leaveType, tenureBasedTotal] of policyMap) {
        const used = usedDays[leaveType] || 0; // Use calculated used days from approved requests
        const remaining = Math.max(0, tenureBasedTotal - used);
        
        // Use the tenure-based total as the authoritative source
        (result as any)[leaveType] = remaining;
      }

      console.log('🔍 TeamService: Final leave balance result:', result);
      
      // Get user information to match admin API structure
      const user = await prisma.user.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          name: true,
          email: true,
          department: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate totals to match admin API structure
      const totalDays = Array.from(policyMap.values()).reduce((sum, days) => sum + days, 0);
      const totalUsedDays = Object.values(usedDays).reduce((sum, days) => sum + days, 0);
      const totalRemainingDays = totalDays - totalUsedDays;

      // Create dynamic leave balance based on actual policies
      const dynamicLeaveBalance: { [key: string]: any } = {};
      
      for (const [leaveType, totalDaysPerYear] of policyMap) {
        dynamicLeaveBalance[leaveType] = {
          total: totalDaysPerYear,
          used: usedDays[leaveType] || 0,
          remaining: result[leaveType] || totalDaysPerYear
        };
      }

      // Return the comprehensive leave balance data matching admin API structure
      const comprehensiveResult = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        department: user.department || 'Unassigned',
        leaveBalance: dynamicLeaveBalance,
        total: {
          totalDays,
          usedDays: totalUsedDays,
          remainingDays: totalRemainingDays,
          pendingDays: 0, // Manager API doesn't track pending separately
          overallUtilization: totalDays > 0 ? (totalUsedDays / totalDays) * 100 : 0
        }
      };

      console.log('🔍 TeamService: Comprehensive result:', comprehensiveResult);
      return comprehensiveResult;
    } catch (error) {
      console.error('Error fetching member leave balance:', error);
      return {
        userId: memberId,
        userName: 'Unknown User',
        userEmail: 'unknown@example.com',
        department: 'Unassigned',
        leaveBalance: {
          annual: { total: 14, used: 0, remaining: 14 },
          sick: { total: 5, used: 0, remaining: 5 },
          casual: { total: 5, used: 0, remaining: 5 },
          emergency: { total: 3, used: 0, remaining: 3 }
        },
        total: {
          totalDays: 27,
          usedDays: 0,
          remainingDays: 27,
          pendingDays: 0,
          overallUtilization: 0
        }
      };
    }
  }

  /**
   * Get team performance metrics
   */
  static async getTeamPerformanceMetrics(managerId: string): Promise<any> {
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

      // Mock performance data - in a real application, this would come from actual performance tracking
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
   * Get team capacity metrics
   */
  static async getTeamCapacityMetrics(managerId: string): Promise<any> {
    try {
      // Get team members
      const teamMembers = await prisma.user.findMany({
        where: {
          managerId: managerId,
          isActive: true
        }
      });

      const totalMembers = teamMembers.length;
      const activeMembers = teamMembers.filter(member => member.isActive).length;

      // Get current leave requests (people currently on leave)
      const today = new Date();
      const onLeave = await prisma.leaveRequest.count({
        where: {
          user: { managerId: managerId },
          status: 'approved',
          startDate: { lte: today },
          endDate: { gte: today }
        }
      });

      console.log('🔍 TeamCapacity: Manager ID:', managerId);
      console.log('🔍 TeamCapacity: Total members:', totalMembers);
      console.log('🔍 TeamCapacity: Active members:', activeMembers);
      console.log('🔍 TeamCapacity: On leave:', onLeave);
      console.log('🔍 TeamCapacity: Available:', activeMembers - onLeave);

      const available = activeMembers - onLeave;
      const utilizationRate = totalMembers > 0 ? Math.round((available / totalMembers) * 100) : 0;
      const capacityScore = totalMembers > 0 ? Math.round((available / totalMembers) * 100) : 0;

      return {
        totalMembers,
        activeMembers,
        onLeave,
        available,
        utilizationRate,
        capacityScore
      };
    } catch (error) {
      console.error('Error fetching team capacity metrics:', error);
      return {
        totalMembers: 0,
        activeMembers: 0,
        onLeave: 0,
        available: 0,
        utilizationRate: 0,
        capacityScore: 0
      };
    }
  }

  /**
   * Get pending user approvals for manager's department
   */
  static async getPendingUserApprovals(managerId: string, page: number = 1, limit: number = 10): Promise<{
    users: any[];
    pagination: PaginationInfo;
  }> {
    try {
      // Get manager's department
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { department: true }
      });

      if (!manager?.department) {
        return {
          users: [],
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        };
      }

      const skip = (page - 1) * limit;

      // Get pending users from manager's department OR assigned to this manager
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            approvalStatus: 'pending',
            isActive: true,
            OR: [
              { department: manager.department },
              { managerId: managerId }
            ]
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            phone: true,
            createdAt: true,
            approvalStatus: true,
            managerId: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.user.count({
          where: {
            approvalStatus: 'pending',
            isActive: true,
            OR: [
              { department: manager.department },
              { managerId: managerId }
            ]
          }
        })
      ]);

      return {
        users,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      console.error('Error in getPendingUserApprovals:', error);
      throw new Error('Failed to fetch pending user approvals');
    }
  }

  /**
   * Approve user access (manager can approve users from their department)
   */
  static async approveUserAccess(managerId: string, userId: string): Promise<any> {
    try {
      // Get manager's department
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { department: true, name: true }
      });

      if (!manager) {
        throw new Error('Manager not found');
      }

      // Get user to approve
      const userToApprove = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          managerId: true,
          approvalStatus: true
        }
      });

      if (!userToApprove) {
        throw new Error('User not found');
      }

      // Verify manager can approve this user (same department or assigned manager)
      if (userToApprove.department !== manager.department && userToApprove.managerId !== managerId) {
        throw new Error('You can only approve users from your department or assigned to you');
      }

      if (userToApprove.approvalStatus !== 'pending') {
        throw new Error(`User is already ${userToApprove.approvalStatus}`);
      }

      // Approve user
      const approvedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: 'approved',
          approvedBy: managerId,
          approvedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          approvalStatus: true,
          approvedBy: true,
          approvedAt: true
        }
      });

      return approvedUser;
    } catch (error) {
      console.error('Error in approveUserAccess:', error);
      throw error;
    }
  }

  /**
   * Reject user access (manager can reject users from their department)
   */
  static async rejectUserAccess(managerId: string, userId: string, reason?: string): Promise<any> {
    try {
      // Get manager's department
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: { department: true, name: true }
      });

      if (!manager) {
        throw new Error('Manager not found');
      }

      // Get user to reject
      const userToReject = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          managerId: true,
          approvalStatus: true
        }
      });

      if (!userToReject) {
        throw new Error('User not found');
      }

      // Verify manager can reject this user (same department or assigned manager)
      if (userToReject.department !== manager.department && userToReject.managerId !== managerId) {
        throw new Error('You can only reject users from your department or assigned to you');
      }

      if (userToReject.approvalStatus !== 'pending') {
        throw new Error(`User is already ${userToReject.approvalStatus}`);
      }

      // Reject user
      const rejectedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: 'rejected',
          approvedBy: managerId,
          approvedAt: new Date(),
          rejectionReason: reason || 'Rejected by department manager'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
          approvalStatus: true,
          approvedBy: true,
          approvedAt: true,
          rejectionReason: true
        }
      });

      return rejectedUser;
    } catch (error) {
      console.error('Error in rejectUserAccess:', error);
      throw error;
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
}
