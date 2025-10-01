import { PrismaClient } from '@prisma/client';
import { 
  LeaveApproval, 
  ApprovalFilters, 
  ApprovalListResponse, 
  PaginationInfo,
  ApprovalAction,
  BulkApprovalAction
} from '../types';

const prisma = new PrismaClient();

export class ApprovalService {
  /**
   * Get all leave approvals for manager's team with filtering and pagination
   */
  static async getLeaveApprovals(managerId: string, filters: ApprovalFilters): Promise<ApprovalListResponse> {
    try {
      const {
        search = '',
        status = 'all',
        leaveType = '',
        priority = 'all',
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        user: { managerId: managerId }
      };

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
      const transformedApprovals: LeaveApproval[] = leaveRequests.map(request => ({
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

      // Filter by priority if specified
      let filteredApprovals = transformedApprovals;
      if (priority !== 'all') {
        filteredApprovals = transformedApprovals.filter(approval => approval.priority === priority);
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
        approvals: filteredApprovals,
        pagination,
        filters,
        totalCount
      };
    } catch (error) {
      console.error('Error fetching leave approvals:', error);
      throw new Error('Failed to fetch leave approvals');
    }
  }

  /**
   * Get leave approval by ID
   */
  static async getLeaveApprovalById(managerId: string, approvalId: string): Promise<LeaveApproval | null> {
    try {
      const request = await prisma.leaveRequest.findFirst({
        where: { 
          id: approvalId,
          user: { managerId: managerId }
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
      console.error('Error fetching leave approval by ID:', error);
      throw new Error('Failed to fetch leave approval');
    }
  }

  /**
   * Process leave approval action
   */
  static async processApprovalAction(
    managerId: string, 
    action: ApprovalAction
  ): Promise<LeaveApproval> {
    try {
      const { requestId, action: actionType, comments, priority } = action;

      // Check if request belongs to manager's team
      const existingRequest = await prisma.leaveRequest.findFirst({
        where: { 
          id: requestId,
          user: { managerId: managerId }
        }
      });

      if (!existingRequest) {
        throw new Error('Leave request not found or not under your management');
      }

      if (existingRequest.status !== 'pending') {
        throw new Error('Leave request has already been processed');
      }

      // Update leave request
      const request = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: actionType === 'approve' ? 'approved' : 'rejected',
          approvedAt: new Date(),
          approvedBy: managerId,
          comments: comments || null
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
      console.error('Error processing approval action:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to process approval action');
    }
  }

  /**
   * Process bulk approval actions
   */
  static async processBulkApprovalAction(
    managerId: string, 
    action: BulkApprovalAction
  ): Promise<{ updated: number; failed: number; results: LeaveApproval[] }> {
    try {
      const { requestIds, action: actionType, comments } = action;
      let updated = 0;
      let failed = 0;
      const results: LeaveApproval[] = [];

      for (const requestId of requestIds) {
        try {
          const approvalAction: ApprovalAction = {
            requestId,
            action: actionType,
            comments
          };

          const result = await this.processApprovalAction(managerId, approvalAction);
          results.push(result);
          updated++;
        } catch (error) {
          console.error(`Error processing approval for request ${requestId}:`, error);
          failed++;
        }
      }

      return { updated, failed, results };
    } catch (error) {
      console.error('Error processing bulk approval action:', error);
      throw new Error('Failed to process bulk approval action');
    }
  }

  /**
   * Get approval statistics for manager
   */
  static async getApprovalStats(managerId: string, dateRange?: { startDate: Date; endDate: Date }): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    averageResponseTime: number;
    approvalRate: number;
    byLeaveType: { [key: string]: number };
    byPriority: { [key: string]: number };
  }> {
    try {
      const where = {
        user: { managerId: managerId },
        ...(dateRange && {
          submittedAt: {
            gte: dateRange.startDate,
            lte: dateRange.endDate
          }
        })
      };

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

      const leaveTypeStats: { [key: string]: number } = {};
      byLeaveType.forEach(item => {
        leaveTypeStats[item.leaveType] = item._count.leaveType;
      });

      // Calculate approval rate
      const approvalRate = total > 0 ? (approved / total) * 100 : 0;

      // Mock data for response time and priority stats
      const averageResponseTime = 24; // hours
      const byPriority = {
        high: Math.floor(total * 0.2),
        medium: Math.floor(total * 0.5),
        low: Math.floor(total * 0.3)
      };

      return {
        total,
        pending,
        approved,
        rejected,
        averageResponseTime,
        approvalRate: Math.round(approvalRate * 100) / 100,
        byLeaveType: leaveTypeStats,
        byPriority
      };
    } catch (error) {
      console.error('Error fetching approval stats:', error);
      throw new Error('Failed to fetch approval statistics');
    }
  }

  /**
   * Get pending approvals count
   */
  static async getPendingCount(managerId: string): Promise<number> {
    try {
      return await prisma.leaveRequest.count({
        where: {
          user: { managerId: managerId },
          status: 'pending'
        }
      });
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return 0;
    }
  }

  /**
   * Get urgent approvals (high priority, pending)
   */
  static async getUrgentApprovals(managerId: string): Promise<LeaveApproval[]> {
    try {
      const urgentRequests = await prisma.leaveRequest.findMany({
        where: {
          user: { managerId: managerId },
          status: 'pending',
          // Add urgency criteria - emergency leaves, sick leaves, or requests submitted recently
          OR: [
            { leaveType: 'emergency' },
            { leaveType: 'sick' },
            { 
              submittedAt: { 
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
              }
            }
          ]
        },
        take: 10,
        orderBy: { submittedAt: 'asc' },
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

      return urgentRequests.map(request => ({
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
      console.error('Error fetching urgent approvals:', error);
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
}
