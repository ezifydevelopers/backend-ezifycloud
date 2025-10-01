import { PrismaClient } from '@prisma/client';
import { 
  LeaveRequestFormData, 
  LeaveRequestResponse, 
  LeaveRequestFilters, 
  LeaveRequestListResponse, 
  PaginationInfo,
  LeaveHistory,
  LeaveHistoryFilters,
  LeaveHistoryResponse,
  LeaveHistorySummary
} from '../types';

const prisma = new PrismaClient();

export class LeaveRequestService {
  /**
   * Create a new leave request
   */
  static async createLeaveRequest(employeeId: string, formData: LeaveRequestFormData): Promise<LeaveRequestResponse> {
    try {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);

      // Validate date range
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }

      // Calculate total days
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

      // Adjust for half day
      const totalDays = formData.isHalfDay ? 0.5 : daysDiff;

      // Check for overlapping requests
      const overlappingRequest = await prisma.leaveRequest.findFirst({
        where: {
          userId: employeeId,
          status: { in: ['pending', 'approved'] },
          OR: [
            {
              startDate: { lte: endDate },
              endDate: { gte: startDate }
            }
          ]
        }
      });

      if (overlappingRequest) {
        throw new Error('You already have a leave request for this period');
      }

      // Create leave request
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId: employeeId,
          leaveType: formData.leaveType as any, // Cast to Prisma enum
          startDate,
          endDate,
          totalDays,
          reason: formData.reason,
          isHalfDay: formData.isHalfDay || false,
          halfDayPeriod: formData.halfDayPeriod as any || null, // Cast to Prisma enum
          status: 'pending',
          submittedAt: new Date()
        }
      });

      // Get employee info for response
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          name: true,
          email: true,
          department: true,
          profilePicture: true
        }
      });

      return {
        id: leaveRequest.id,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        days: Number(leaveRequest.totalDays),
        reason: leaveRequest.reason,
        status: leaveRequest.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(leaveRequest),
        emergencyContact: formData.emergencyContact || undefined,
        workHandover: formData.workHandover || undefined,
        isHalfDay: leaveRequest.isHalfDay,
        halfDayPeriod: leaveRequest.halfDayPeriod as 'morning' | 'afternoon' | undefined,
        submittedAt: leaveRequest.submittedAt,
        reviewedAt: leaveRequest.approvedAt || undefined,
        reviewedBy: leaveRequest.approvedBy || undefined,
        reviewerName: undefined, // Would need to fetch from approver
        comments: leaveRequest.comments || undefined,
        attachments: [], // Not in schema
        createdAt: leaveRequest.createdAt,
        updatedAt: leaveRequest.updatedAt
      };
    } catch (error) {
      console.error('Error creating leave request:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create leave request');
    }
  }

  /**
   * Get leave requests with filtering and pagination
   */
  static async getLeaveRequests(employeeId: string, filters: LeaveRequestFilters): Promise<LeaveRequestListResponse> {
    try {
      const {
        status = 'all',
        leaveType = '',
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
        userId: employeeId
      };

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
        orderBy: { [sortBy]: sortOrder }
      });

      // Transform leave requests
      const transformedRequests: LeaveRequestResponse[] = leaveRequests.map(request => ({
        id: request.id,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        reason: request.reason,
        status: request.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(request),
        emergencyContact: undefined, // Not in schema
        workHandover: undefined, // Not in schema
        isHalfDay: request.isHalfDay,
        halfDayPeriod: request.halfDayPeriod as 'morning' | 'afternoon' | undefined,
        submittedAt: request.submittedAt,
        reviewedAt: request.approvedAt || undefined,
        reviewedBy: request.approvedBy || undefined,
        reviewerName: undefined, // Would need to fetch from approver
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
  static async getLeaveRequestById(employeeId: string, requestId: string): Promise<LeaveRequestResponse | null> {
    try {
      const request = await prisma.leaveRequest.findFirst({
        where: { 
          id: requestId,
          userId: employeeId 
        }
      });

      if (!request) {
        return null;
      }

      return {
        id: request.id,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        reason: request.reason,
        status: request.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(request),
        emergencyContact: undefined, // Not in schema
        workHandover: undefined, // Not in schema
        isHalfDay: request.isHalfDay,
        halfDayPeriod: request.halfDayPeriod as 'morning' | 'afternoon' | undefined,
        submittedAt: request.submittedAt,
        reviewedAt: request.approvedAt || undefined,
        reviewedBy: request.approvedBy || undefined,
        reviewerName: undefined, // Would need to fetch from approver
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
   * Update leave request (only if pending)
   */
  static async updateLeaveRequest(
    employeeId: string, 
    requestId: string, 
    updateData: Partial<LeaveRequestFormData>
  ): Promise<LeaveRequestResponse> {
    try {
      // Check if request exists and belongs to employee
      const existingRequest = await prisma.leaveRequest.findFirst({
        where: { 
          id: requestId,
          userId: employeeId 
        }
      });

      if (!existingRequest) {
        throw new Error('Leave request not found');
      }

      if (existingRequest.status !== 'pending') {
        throw new Error('Cannot update leave request that has been processed');
      }

      // Prepare update data
      const updateFields: any = {};

      if (updateData.leaveType) {
        updateFields.leaveType = updateData.leaveType;
      }

      if (updateData.startDate) {
        updateFields.startDate = new Date(updateData.startDate);
      }

      if (updateData.endDate) {
        updateFields.endDate = new Date(updateData.endDate);
      }

      if (updateData.reason) {
        updateFields.reason = updateData.reason;
      }

      // Note: emergencyContact and workHandover are not in the schema
      // They would need to be stored in a separate table or added to the schema

      if (updateData.isHalfDay !== undefined) {
        updateFields.isHalfDay = updateData.isHalfDay;
      }

      if (updateData.halfDayPeriod !== undefined) {
        updateFields.halfDayPeriod = updateData.halfDayPeriod || null;
      }

      // Recalculate total days if dates changed
      if (updateData.startDate || updateData.endDate) {
        const startDate = updateFields.startDate || existingRequest.startDate;
        const endDate = updateFields.endDate || existingRequest.endDate;
        
        if (startDate >= endDate) {
          throw new Error('End date must be after start date');
        }

        const timeDiff = endDate.getTime() - startDate.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        const totalDays = updateFields.isHalfDay ? 0.5 : daysDiff;
        
        updateFields.totalDays = totalDays;
      }

      // Update leave request
      const updatedRequest = await prisma.leaveRequest.update({
        where: { id: requestId },
        data: updateFields
      });

      return {
        id: updatedRequest.id,
        leaveType: updatedRequest.leaveType,
        startDate: updatedRequest.startDate,
        endDate: updatedRequest.endDate,
        days: Number(updatedRequest.totalDays),
        reason: updatedRequest.reason,
        status: updatedRequest.status as 'pending' | 'approved' | 'rejected',
        priority: this.determinePriority(updatedRequest),
        emergencyContact: undefined, // Not in schema
        workHandover: undefined, // Not in schema
        isHalfDay: updatedRequest.isHalfDay,
        halfDayPeriod: updatedRequest.halfDayPeriod as 'morning' | 'afternoon' | undefined,
        submittedAt: updatedRequest.submittedAt,
        reviewedAt: updatedRequest.approvedAt || undefined,
        reviewedBy: updatedRequest.approvedBy || undefined,
        reviewerName: undefined, // Would need to fetch from approver
        comments: updatedRequest.comments || undefined,
        attachments: [], // Not in schema
        createdAt: updatedRequest.createdAt,
        updatedAt: updatedRequest.updatedAt
      };
    } catch (error) {
      console.error('Error updating leave request:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update leave request');
    }
  }

  /**
   * Cancel leave request (only if pending)
   */
  static async cancelLeaveRequest(employeeId: string, requestId: string): Promise<boolean> {
    try {
      const request = await prisma.leaveRequest.findFirst({
        where: { 
          id: requestId,
          userId: employeeId 
        }
      });

      if (!request) {
        throw new Error('Leave request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Cannot cancel leave request that has been processed');
      }

      await prisma.leaveRequest.delete({
        where: { id: requestId }
      });

      return true;
    } catch (error) {
      console.error('Error canceling leave request:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to cancel leave request');
    }
  }

  /**
   * Get leave history with filtering and pagination
   */
  static async getLeaveHistory(employeeId: string, filters: LeaveHistoryFilters): Promise<LeaveHistoryResponse> {
    try {
      const {
        year,
        leaveType = '',
        status = 'all',
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
        userId: employeeId
      };

      if (year) {
        where.submittedAt = {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31)
        };
      }

      if (leaveType && leaveType !== 'all') {
        where.leaveType = leaveType;
      }

      if (status !== 'all') {
        where.status = status;
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
        orderBy: { [sortBy]: sortOrder }
      });

      // Transform to leave history
      const leaveHistory: LeaveHistory[] = leaveRequests.map(request => ({
        id: request.id,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        status: request.status as 'pending' | 'approved' | 'rejected',
        reason: request.reason,
        submittedAt: request.submittedAt,
        reviewedAt: request.approvedAt || undefined,
        reviewedBy: request.approvedBy || undefined,
        reviewerName: undefined, // Would need to fetch from approver
        comments: request.comments || undefined,
        attachments: [] // Not in schema
      }));

      // Get summary data
      const summary = await this.getLeaveHistorySummary(employeeId, where);

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
        leaveHistory,
        pagination,
        filters,
        totalCount,
        summary
      };
    } catch (error) {
      console.error('Error fetching leave history:', error);
      throw new Error('Failed to fetch leave history');
    }
  }

  /**
   * Get leave history summary
   */
  private static async getLeaveHistorySummary(employeeId: string, whereClause: any): Promise<LeaveHistorySummary> {
    try {
      const [
        totalRequests,
        approvedRequests,
        rejectedRequests,
        pendingRequests,
        totalDaysResult,
        approvedDaysResult,
        rejectedDaysResult,
        pendingDaysResult
      ] = await Promise.all([
        prisma.leaveRequest.count({ where: whereClause }),
        prisma.leaveRequest.count({ where: { ...whereClause, status: 'approved' } }),
        prisma.leaveRequest.count({ where: { ...whereClause, status: 'rejected' } }),
        prisma.leaveRequest.count({ where: { ...whereClause, status: 'pending' } }),
        prisma.leaveRequest.aggregate({ where: whereClause, _sum: { totalDays: true } }),
        prisma.leaveRequest.aggregate({ where: { ...whereClause, status: 'approved' }, _sum: { totalDays: true } }),
        prisma.leaveRequest.aggregate({ where: { ...whereClause, status: 'rejected' }, _sum: { totalDays: true } }),
        prisma.leaveRequest.aggregate({ where: { ...whereClause, status: 'pending' }, _sum: { totalDays: true } })
      ]);

      const totalDays = Number(totalDaysResult._sum.totalDays) || 0;
      const approvedDays = Number(approvedDaysResult._sum.totalDays) || 0;
      const rejectedDays = Number(rejectedDaysResult._sum.totalDays) || 0;
      const pendingDays = Number(pendingDaysResult._sum.totalDays) || 0;

      // Get by leave type
      const byLeaveType = await prisma.leaveRequest.groupBy({
        by: ['leaveType'],
        where: whereClause,
        _count: { leaveType: true }
      });

      const leaveTypeStats: { [key: string]: number } = {};
      byLeaveType.forEach(item => {
        leaveTypeStats[item.leaveType] = item._count.leaveType;
      });

      // Get by month (mock data for now)
      const byMonth: { [key: string]: number } = {};
      for (let i = 0; i < 12; i++) {
        byMonth[`${i + 1}`] = Math.floor(Math.random() * 5); // Mock data
      }

      const averageDaysPerRequest = totalRequests > 0 ? totalDays / totalRequests : 0;
      const approvalRate = totalRequests > 0 ? (approvedRequests / totalRequests) * 100 : 0;

      return {
        totalRequests,
        approvedRequests,
        rejectedRequests,
        pendingRequests,
        totalDays,
        approvedDays,
        rejectedDays,
        pendingDays,
        byLeaveType: leaveTypeStats,
        byMonth,
        averageDaysPerRequest: Math.round(averageDaysPerRequest * 100) / 100,
        approvalRate: Math.round(approvalRate * 100) / 100
      };
    } catch (error) {
      console.error('Error fetching leave history summary:', error);
      return {
        totalRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        pendingRequests: 0,
        totalDays: 0,
        approvedDays: 0,
        rejectedDays: 0,
        pendingDays: 0,
        byLeaveType: {},
        byMonth: {},
        averageDaysPerRequest: 0,
        approvalRate: 0
      };
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
