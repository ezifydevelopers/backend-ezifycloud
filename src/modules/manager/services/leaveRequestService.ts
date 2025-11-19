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
import prisma from '../../../lib/prisma';

export class LeaveRequestService {
  /**
   * Create a new leave request
   */
  static async createLeaveRequest(managerId: string, formData: LeaveRequestFormData): Promise<LeaveRequestResponse> {
    try {
      console.log('🔍 ManagerLeaveRequestService: Creating leave request:', {
        managerId,
        formData,
        startDate: formData.startDate,
        endDate: formData.endDate
      });
      
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      console.log('🔍 ManagerLeaveRequestService: Parsed dates:', {
        startDate,
        endDate,
        startDateISO: startDate.toISOString(),
        endDateISO: endDate.toISOString()
      });

      // Validate date range
      if (startDate > endDate) {
        throw new Error('End date cannot be before start date');
      }

      // Calculate total days using automated working days calculation (excludes weekends and holidays)
      let totalDays: number;
      if (formData.shortLeaveHours) {
        // Short leave: calculate based on hours (assuming 8 hours per day)
        // 1 hour = 0.125, 2 hours = 0.25, 3 hours = 0.375
        totalDays = formData.shortLeaveHours / 8;
      } else if (formData.isHalfDay) {
        totalDays = 0.5;
      } else {
        const { WorkingDaysService } = await import('../../../services/workingDaysService');
        totalDays = await WorkingDaysService.calculateWorkingDaysBetween(startDate, endDate);
      }

      // Check for overlapping requests
      const overlappingRequest = await prisma.leaveRequest.findFirst({
        where: {
          userId: managerId,
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
        const existingStartDate = new Date(overlappingRequest.startDate).toLocaleDateString();
        const existingEndDate = new Date(overlappingRequest.endDate).toLocaleDateString();
        throw new Error(
          `You already have a ${overlappingRequest.status} leave request for this period. ` +
          `Existing request: ${existingStartDate} to ${existingEndDate}. ` +
          `Please choose different dates or wait for the existing request to be processed.`
        );
      }

      // Get manager info (including probation status for unpaid check)
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: {
          name: true,
          email: true,
          department: true,
          profilePicture: true,
          probationStatus: true,
          probationStartDate: true,
          probationEndDate: true,
          employeeType: true
        }
      });

      // Auto-detect if leave is paid from leave policy
      // IMPORTANT: First try exact match, then fallback to null policies for migration support
      let leavePolicy = null;
      
      if (manager?.employeeType) {
        // First try to get policy with exact employeeType match
        leavePolicy = await prisma.leavePolicy.findFirst({
          where: {
            leaveType: formData.leaveType,
            employeeType: manager.employeeType,
            isActive: true
          },
          select: { isPaid: true }
        });
        
        console.log('🔍 ManagerLeaveRequestService: Looking for policy with employeeType:', manager.employeeType);
        console.log('🔍 ManagerLeaveRequestService: Found policy with exact match:', leavePolicy ? 'Yes' : 'No');
        
        // If no exact match found, fallback to null employeeType policies (for migration support)
        if (!leavePolicy) {
          console.warn('⚠️ ManagerLeaveRequestService: No policy found for employeeType:', manager.employeeType);
          console.warn('⚠️ ManagerLeaveRequestService: Falling back to null employeeType policies (migration support)');
          
          leavePolicy = await prisma.leavePolicy.findFirst({
            where: {
              leaveType: formData.leaveType,
              employeeType: null,
              isActive: true
            },
            select: { isPaid: true }
          });
          
          if (leavePolicy) {
            console.warn('⚠️ ManagerLeaveRequestService: Using legacy policy with null employeeType.');
            console.warn('⚠️ ManagerLeaveRequestService: Admin should update this policy to set employeeType =', manager.employeeType);
          }
        }
      } else {
        // If manager has no employeeType, try null policies as fallback
        console.warn('⚠️ ManagerLeaveRequestService: Manager has no employeeType, trying null policies as fallback');
        leavePolicy = await prisma.leavePolicy.findFirst({
          where: {
            leaveType: formData.leaveType,
            employeeType: null,
            isActive: true
          },
          select: { isPaid: true }
        });
      }
      
      // Default to true (paid) if policy not found
      let isPaid = leavePolicy?.isPaid ?? true;

      // Check if leave dates overlap with probation period
      // Rule: If ANY part of the leave falls within probation period, it must be unpaid
      const leaveOverlapsProbation = this.doesLeaveOverlapProbation(
        startDate,
        endDate,
        manager?.probationStatus,
        manager?.probationStartDate,
        manager?.probationEndDate
      );

      if (leaveOverlapsProbation) {
        // All leaves taken during probation period are unpaid
        // Rule: Employees in probation cannot use leave balance at all
        // They can only take unpaid leave
        const { BusinessRulesService } = await import('../../../services/businessRulesService');
        const balance = await BusinessRulesService.calculateLeaveBalance(managerId);
        const leaveBalance = balance[formData.leaveType];
        
        // If they have any total balance, they're trying to use it (which is not allowed during probation)
        // During probation, remaining will be 0, but total might be > 0 (locked leaves)
        if (leaveBalance && leaveBalance.total > 0) {
          // Manager is trying to use leave balance during probation - reject
          throw new Error('You cannot use leave balance during your probation period. Leaves earned during probation are locked until you complete your probation. You can only take unpaid leave during probation.');
        }
        
        isPaid = false;
        console.log('💰 ManagerLeaveRequestService: Leave overlaps with probation period, marking as unpaid leave');
      } else {
        // Employee has completed probation - check if they can use leave balance
        // Only permanent employees (who completed probation) can use leave balance for paid leaves
        const hasCompletedProbation = !manager?.probationStatus || 
                                     manager.probationStatus === 'completed' ||
                                     (manager.probationStatus !== 'active' && manager.probationStatus !== 'extended');
        
        if (!hasCompletedProbation) {
          // Manager is still in probation (shouldn't happen if dates don't overlap, but safety check)
          isPaid = false;
          console.log('💰 ManagerLeaveRequestService: Manager still in probation, marking as unpaid leave');
        } else {
          // Check if request exceeds leave balance - if so, mark as unpaid
          // Note: Manager requests don't go through business rules validation, so we check balance directly
          const { BusinessRulesService } = await import('../../../services/businessRulesService');
          const balance = await BusinessRulesService.calculateLeaveBalance(managerId);
          const leaveBalance = balance[formData.leaveType];
          
          if (leaveBalance && leaveBalance.remaining < totalDays) {
            // Request exceeds available balance, mark as unpaid
            isPaid = false;
            console.log('💰 ManagerLeaveRequestService: Request exceeds balance, marking as unpaid leave');
          }
        }
      }

      // Create leave request
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId: managerId,
          leaveType: formData.leaveType as any, // Cast to Prisma enum
          startDate,
          endDate,
          totalDays: totalDays.toString(), // Convert to string for Decimal type
          reason: formData.reason,
          isPaid,
          isHalfDay: formData.isHalfDay || false,
          halfDayPeriod: formData.halfDayPeriod as any || null, // Cast to Prisma enum
          shortLeaveHours: formData.shortLeaveHours || null,
          status: 'pending',
          submittedAt: new Date()
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
        isPaid: leaveRequest.isPaid,
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
  static async getLeaveRequests(managerId: string, filters: LeaveRequestFilters): Promise<LeaveRequestListResponse> {
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

      // Build where clause - get leave requests from team members, not manager's own requests
      const where: any = {
        user: {
          managerId: managerId
        }
      };

      if (status !== 'all') {
        where.status = status;
      }

      console.log('🔍 ManagerLeaveRequestService: getLeaveRequests called with:', {
        managerId,
        filters,
        where
      });

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
      console.log('🔍 ManagerLeaveRequestService: totalCount found:', totalCount);

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
              employeeId: true,
              department: true,
              profilePicture: true,
              employeeType: true
            }
          }
        }
      });
      console.log('🔍 ManagerLeaveRequestService: leaveRequests found:', leaveRequests.length);
      console.log('🔍 ManagerLeaveRequestService: leaveRequests data:', leaveRequests);
      
      // Debug department data specifically
      leaveRequests.forEach((request: any, index: number) => {
        console.log(`🔍 Request ${index} department debug:`, {
          id: request.id,
          employeeName: request.user?.name,
          department: request.user?.department,
          user: request.user
        });
      });

      // Transform leave requests
      const transformedRequests: LeaveRequestResponse[] = leaveRequests.map((request: any) => ({
        id: request.id,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        reason: request.reason,
        status: request.status as 'pending' | 'approved' | 'rejected',
        isPaid: request.isPaid ?? true, // Default to paid if not set
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
        updatedAt: request.updatedAt,
        // Add user information for frontend
        user: request.user ? {
          id: request.user.id,
          name: request.user.name,
          email: request.user.email,
          employeeId: request.user.employeeId || undefined,
          department: request.user.department,
          profilePicture: request.user.profilePicture || undefined,
          employeeType: (request.user.employeeType === 'onshore' || request.user.employeeType === 'offshore') 
            ? (request.user.employeeType as 'onshore' | 'offshore')
            : (request.user.employeeType === null ? null : undefined)
        } : undefined
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
  static async getLeaveRequestById(managerId: string, requestId: string): Promise<LeaveRequestResponse | null> {
    try {
      const request = await prisma.leaveRequest.findFirst({
        where: { 
          id: requestId,
          userId: managerId 
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
        isPaid: request.isPaid ?? true, // Default to paid if not set
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
    managerId: string, 
    requestId: string, 
    updateData: Partial<LeaveRequestFormData>
  ): Promise<LeaveRequestResponse> {
    try {
      // Check if request exists and belongs to manager
      const existingRequest = await prisma.leaveRequest.findFirst({
        where: { 
          id: requestId,
          userId: managerId 
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
        isPaid: updatedRequest.isPaid ?? true, // Default to paid if not set
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
  static async cancelLeaveRequest(managerId: string, requestId: string): Promise<boolean> {
    try {
      const request = await prisma.leaveRequest.findFirst({
        where: { 
          id: requestId,
          userId: managerId 
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
  static async getLeaveHistory(managerId: string, filters: LeaveHistoryFilters): Promise<LeaveHistoryResponse> {
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
        userId: managerId
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
      const leaveHistory: LeaveHistory[] = leaveRequests.map((request: any) => ({
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
      const summary = await this.getLeaveHistorySummary(managerId, where, year || new Date().getFullYear());

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
   * Get recent leave requests
   */
  static async getRecentRequests(managerId: string, limit: number = 5): Promise<LeaveRequestResponse[]> {
    try {
      const requests = await prisma.leaveRequest.findMany({
        where: { userId: managerId },
        orderBy: { submittedAt: 'desc' },
        take: limit
      });

      return requests.map((request: any) => ({
        id: request.id,
        leaveType: request.leaveType,
        startDate: request.startDate,
        endDate: request.endDate,
        days: Number(request.totalDays),
        reason: request.reason,
        status: request.status as 'pending' | 'approved' | 'rejected',
        isPaid: request.isPaid ?? true, // Default to paid if not set
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
    } catch (error) {
      console.error('Error fetching recent leave requests:', error);
      throw new Error('Failed to fetch recent leave requests');
    }
  }

  /**
   * Get leave balance
   */
  static async getLeaveBalance(managerId: string): Promise<Record<string, unknown>> {
    try {
      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Fetching leave balance for manager:', managerId);
      
      // Get manager info including employeeType
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
        select: {
          id: true,
          name: true,
          email: true,
          employeeType: true
        }
      });

      if (!manager) {
        console.error('❌ ManagerLeaveRequestService getLeaveBalance: Manager not found:', managerId);
        return {};
      }

      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Manager employeeType:', manager.employeeType || '❌ NOT SET');
      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Manager Name:', manager.name);
      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Manager Email:', manager.email);
      
      if (!manager.employeeType) {
        console.warn('⚠️ ManagerLeaveRequestService getLeaveBalance: Manager has no employeeType assigned!');
        console.warn('⚠️ ManagerLeaveRequestService getLeaveBalance: Admin must assign employeeType (onshore/offshore) to this manager');
        console.warn('⚠️ ManagerLeaveRequestService getLeaveBalance: Steps: Go to Employees page → Edit manager → Set Employee Type');
      }

      // Use BusinessRulesService to calculate leave balance dynamically
      // This service already handles employeeType filtering and calculates balance based on policies
      const { BusinessRulesService } = await import('../../../services/businessRulesService');
      const currentYear = new Date().getFullYear();
      
      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Calling BusinessRulesService.calculateLeaveBalance for year:', currentYear);
      const balance = await BusinessRulesService.calculateLeaveBalance(managerId, currentYear);

      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Calculated balance:', JSON.stringify(balance, null, 2));
      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Balance keys:', Object.keys(balance));
      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Balance count:', Object.keys(balance).length);
      
      // Debug: Check what policies exist in database
      const allPolicies = await prisma.leavePolicy.findMany({
        where: { isActive: true },
        select: {
          id: true,
          leaveType: true,
          employeeType: true,
          totalDaysPerYear: true,
          isActive: true
        }
      });
      console.log('🔍 ManagerLeaveRequestService getLeaveBalance: All active policies in database:', JSON.stringify(allPolicies, null, 2));
      
      // Check policies matching manager's employeeType
      if (manager.employeeType) {
        const matchingPolicies = allPolicies.filter(p => p.employeeType === manager.employeeType);
        console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Policies matching employeeType', manager.employeeType, ':', matchingPolicies.length);
        console.log('🔍 ManagerLeaveRequestService getLeaveBalance: Matching policies:', JSON.stringify(matchingPolicies, null, 2));
      }

      // Transform the balance to match the expected format
      // BusinessRulesService returns: { [leaveType]: { total, used, remaining, pending } }
      const formattedBalance: Record<string, unknown> = {};
      
      for (const [leaveType, balanceData] of Object.entries(balance)) {
        formattedBalance[leaveType] = {
          total: balanceData.total || 0,
          used: balanceData.used || 0,
          remaining: balanceData.remaining || 0,
          pending: balanceData.pending || 0
        };
      }

      // If no balance found, return empty object (don't use hardcoded defaults)
      if (Object.keys(formattedBalance).length === 0) {
        console.warn('⚠️ ManagerLeaveRequestService getLeaveBalance: No leave balance calculated. This might mean:');
        console.warn('  1. Manager has no employeeType assigned');
        console.warn('  2. No leave policies exist for this employeeType');
        console.warn('  3. Manager is new and policies haven\'t been set up yet');
        return {};
      }

      console.log('✅ ManagerLeaveRequestService getLeaveBalance: Returning formatted balance:', JSON.stringify(formattedBalance, null, 2));
      return formattedBalance;
    } catch (error) {
      console.error('❌ ManagerLeaveRequestService getLeaveBalance: Error fetching leave balance:', error);
      throw new Error('Failed to fetch leave balance');
    }
  }

  /**
   * Get leave history summary
   */
  private static async getLeaveHistorySummary(managerId: string, whereClause: any, year: number): Promise<LeaveHistorySummary> {
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
      byLeaveType.forEach((item: any) => {
        leaveTypeStats[item.leaveType] = item._count.leaveType;
      });

      // Get by month from database
      const byMonth: { [key: string]: number } = {};
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(year, i, 1);
        const monthEnd = new Date(year, i + 1, 0);
        
        const monthRequests = await prisma.leaveRequest.count({
          where: {
            userId: managerId,
            startDate: { gte: monthStart },
            endDate: { lte: monthEnd }
          }
        });
        
        byMonth[`${i + 1}`] = monthRequests;
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
   * Check if leave dates overlap with probation period
   * Returns true if ANY part of the leave falls within the probation period
   */
  private static doesLeaveOverlapProbation(
    leaveStartDate: Date,
    leaveEndDate: Date,
    probationStatus: string | null | undefined,
    probationStartDate: Date | null | undefined,
    probationEndDate: Date | null | undefined
  ): boolean {
    // If no probation status or probation is completed/terminated, no overlap
    if (!probationStatus || probationStatus === 'completed' || probationStatus === 'terminated') {
      return false;
    }

    // If probation status is active or extended, check date overlap
    if (probationStatus === 'active' || probationStatus === 'extended') {
      if (!probationStartDate || !probationEndDate) {
        // If dates are missing but status is active/extended, assume overlap for safety
        return true;
      }

      const probStart = new Date(probationStartDate);
      const probEnd = new Date(probationEndDate);
      const leaveStart = new Date(leaveStartDate);
      const leaveEnd = new Date(leaveEndDate);

      // Check if leave dates overlap with probation period
      // Overlap occurs if: leaveStart <= probEnd AND leaveEnd >= probStart
      const overlaps = leaveStart <= probEnd && leaveEnd >= probStart;
      
      return overlaps;
    }

    return false;
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
