import { PrismaClient } from '@prisma/client';
import { 
  LeaveRequest, 
  LeaveRequestFilters, 
  LeaveRequestListResponse, 
  PaginationInfo 
} from '../types';

const prisma = new PrismaClient();

export class LeaveRequestService {
  /**
   * Get all leave requests with filtering, sorting, and pagination
   */
  static async getLeaveRequests(filters: LeaveRequestFilters): Promise<LeaveRequestListResponse> {
    try {
      const {
        search = '',
        status = 'all',
        leaveType = '',
        department = '',
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { leaveType: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (status !== 'all') {
        where.status = status;
      }

      if (leaveType && leaveType !== 'all') {
        where.leaveType = leaveType;
      }

      if (department && department !== 'all') {
        where.user = { department };
      }

      if (startDate) {
        where.startDate = { gte: new Date(startDate) };
      }

      if (endDate) {
        where.endDate = { lte: new Date(endDate) };
      }

      // Get total count
      const totalCount = await prisma.leaveRequest.count({ where });

      // Get leave requests with pagination
      const leaveRequests = await prisma.leaveRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profilePicture: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Transform leave requests
      const transformedRequests: LeaveRequest[] = leaveRequests.map(request => ({
        id: request.id,
        employeeId: request.userId,
        employee: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          department: request.user.department || 'Unassigned',
          position: 'Employee', // Not in schema
          avatar: request.user.profilePicture || undefined
        },
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        reason: request.reason,
        status: request.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(request),
        emergencyContact: undefined, // Not in schema
        workHandover: undefined, // Not in schema
        submittedAt: request.submittedAt,
        reviewedAt: request.approvedAt || undefined,
        reviewedBy: request.approvedBy || undefined,
        reviewerName: request.approver?.name,
        comments: request.comments || undefined,
        attachments: [], // Not in schema
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      }));

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
        leaveRequests: transformedRequests,
        pagination,
        filters,
        totalCount
      };
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      throw new Error('Failed to fetch leave requests');
    }
  }

  /**
   * Get leave request by ID
   */
  static async getLeaveRequestById(id: string): Promise<LeaveRequest | null> {
    try {
      const request = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profilePicture: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!request) {
        return null;
      }

      return {
        id: request.id,
        employeeId: request.userId,
        employee: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          department: request.user.department || 'Unassigned',
          position: 'Employee', // Not in schema
          avatar: request.user.profilePicture || undefined
        },
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        reason: request.reason,
        status: request.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(request),
        emergencyContact: undefined, // Not in schema
        workHandover: undefined, // Not in schema
        submittedAt: request.submittedAt,
        reviewedAt: request.approvedAt || undefined,
        reviewedBy: request.approvedBy || undefined,
        reviewerName: request.approver?.name,
        comments: request.comments || undefined,
        attachments: [], // Not in schema
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      };
    } catch (error) {
      console.error('Error fetching leave request by ID:', error);
      throw new Error('Failed to fetch leave request');
    }
  }

  /**
   * Update leave request status
   */
  static async updateLeaveRequestStatus(
    id: string, 
    status: 'approved' | 'rejected', 
    reviewerId: string,
    comments?: string
  ): Promise<LeaveRequest> {
    try {
      const request = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status,
          approvedAt: new Date(),
          approvedBy: reviewerId,
          comments
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profilePicture: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return {
        id: request.id,
        employeeId: request.userId,
        employee: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          department: request.user.department || 'Unassigned',
          position: 'Employee', // Not in schema
          avatar: request.user.profilePicture || undefined
        },
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        reason: request.reason,
        status: request.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(request),
        emergencyContact: undefined, // Not in schema
        workHandover: undefined, // Not in schema
        submittedAt: request.submittedAt,
        reviewedAt: request.approvedAt || undefined,
        reviewedBy: request.approvedBy || undefined,
        reviewerName: request.approver?.name,
        comments: request.comments || undefined,
        attachments: [], // Not in schema
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      };
    } catch (error) {
      console.error('Error updating leave request status:', error);
      throw new Error('Failed to update leave request status');
    }
  }

  /**
   * Bulk update leave requests
   */
  static async bulkUpdateLeaveRequests(
    requestIds: string[],
    status: 'approved' | 'rejected',
    reviewerId: string,
    comments?: string
  ): Promise<{ updated: number; failed: number }> {
    try {
      let updated = 0;
      let failed = 0;

      for (const id of requestIds) {
        try {
          await prisma.leaveRequest.update({
            where: { id },
            data: {
              status,
              approvedAt: new Date(),
              approvedBy: reviewerId,
              comments
            }
          });
          updated++;
        } catch (error) {
          console.error(`Error updating leave request ${id}:`, error);
          failed++;
        }
      }

      return { updated, failed };
    } catch (error) {
      console.error('Error bulk updating leave requests:', error);
      throw new Error('Failed to bulk update leave requests');
    }
  }

  /**
   * Get leave request statistics
   */
  static async getLeaveRequestStats(dateRange?: { startDate: Date; endDate: Date }): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byLeaveType: { [key: string]: number };
    byDepartment: { [key: string]: number };
  }> {
    try {
      const where = dateRange ? {
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        }
      } : {};

      const [total, pending, approved, rejected] = await Promise.all([
        prisma.leaveRequest.count({ where }),
        prisma.leaveRequest.count({ where: { ...where, status: 'pending' } }),
        prisma.leaveRequest.count({ where: { ...where, status: 'approved' } }),
        prisma.leaveRequest.count({ where: { ...where, status: 'rejected' } })
      ]);

      // Get by leave type
      const byLeaveType = await prisma.leaveRequest.groupBy({
        by: ['leaveType'],
        where,
        _count: {
          leaveType: true
        }
      });

      // Get by department
      const byDepartment = await prisma.leaveRequest.groupBy({
        by: ['userId'],
        where,
        _count: {
          id: true
        }
      });

      // Get department names for the grouped results
      const departmentStats: { [key: string]: number } = {};
      for (const item of byDepartment) {
        const user = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { department: true }
        });
        const department = user?.department || 'Unassigned';
        departmentStats[department] = (departmentStats[department] || 0) + item._count.id;
      }

      const leaveTypeStats: { [key: string]: number } = {};
      byLeaveType.forEach(item => {
        leaveTypeStats[item.leaveType] = item._count.leaveType;
      });

      return {
        total,
        pending,
        approved,
        rejected,
        byLeaveType: leaveTypeStats,
        byDepartment: departmentStats
      };
    } catch (error) {
      console.error('Error fetching leave request stats:', error);
      throw new Error('Failed to fetch leave request statistics');
    }
  }

  /**
   * Get leave types list
   */
  static async getLeaveTypes(): Promise<string[]> {
    try {
      const leaveTypes = await prisma.leaveRequest.groupBy({
        by: ['leaveType'],
        _count: {
          leaveType: true
        }
      });

      return leaveTypes.map(item => item.leaveType);
    } catch (error) {
      console.error('Error fetching leave types:', error);
      return [];
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

  /**
   * Get recent leave requests for dashboard
   */
  static async getRecentLeaveRequests(limit: number = 5): Promise<LeaveRequest[]> {
    try {
      const requests = await prisma.leaveRequest.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              profilePicture: true
            }
          },
          approver: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return requests.map(request => ({
        id: request.id,
        employeeId: request.userId,
        employee: {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          department: request.user.department || 'Unassigned',
          position: 'Employee', // Not in schema
          avatar: request.user.profilePicture || undefined
        },
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        reason: request.reason,
        status: request.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(request),
        emergencyContact: undefined, // Not in schema
        workHandover: undefined, // Not in schema
        submittedAt: request.submittedAt,
        reviewedAt: request.approvedAt || undefined,
        reviewedBy: request.approvedBy || undefined,
        reviewerName: request.approver?.name,
        comments: request.comments || undefined,
        attachments: [], // Not in schema
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching recent leave requests:', error);
      return [];
    }
  }
}