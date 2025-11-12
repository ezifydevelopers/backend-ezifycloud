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
import BusinessRulesService from '../../../services/businessRulesService';
import PolicyEnforcementService from '../../../services/policyEnforcementService';

export class LeaveRequestService {
  /**
   * Create a new leave request
   */
  static async createLeaveRequest(employeeId: string, formData: LeaveRequestFormData): Promise<LeaveRequestResponse> {
    try {
      console.log('🔍 LeaveRequestService: Creating leave request:', {
        employeeId,
        formData,
        startDate: formData.startDate,
        endDate: formData.endDate
      });
      
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      console.log('🔍 LeaveRequestService: Parsed dates:', {
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

      // Apply business rules validation
      console.log('🔍 LeaveRequestService: Validating business rules...');
      const businessRulesResult = await BusinessRulesService.validateLeaveRequest(employeeId, {
        leaveType: formData.leaveType,
        startDate,
        endDate,
        isHalfDay: formData.isHalfDay || false,
        halfDayPeriod: formData.halfDayPeriod,
        reason: formData.reason
      });

      console.log('🔍 LeaveRequestService: Business rules result:', businessRulesResult);

      if (!businessRulesResult.isValid) {
        console.log('❌ LeaveRequestService: Business rules validation failed:', businessRulesResult.message);
        throw new Error(businessRulesResult.message || 'Business rules validation failed');
      }

      // Handle salary deduction if there's a negative balance
      if (businessRulesResult.salaryDeduction) {
        console.log('💰 LeaveRequestService: Salary deduction required:', businessRulesResult.salaryDeduction);
        // Create salary deduction record
        await this.createSalaryDeductionRecord(employeeId, {
          leaveType: formData.leaveType,
          startDate,
          endDate,
          excessDays: businessRulesResult.salaryDeduction.days,
          deductionAmount: businessRulesResult.salaryDeduction.amount,
          reason: `Excess leave days beyond policy limit`
        });
      }

      // Apply policy enforcement
      console.log('🔍 LeaveRequestService: Enforcing policies...');
      const policyResult = await PolicyEnforcementService.enforceLeavePolicies(employeeId, {
        leaveType: formData.leaveType,
        startDate,
        endDate,
        isHalfDay: formData.isHalfDay || false,
        halfDayPeriod: formData.halfDayPeriod,
        reason: formData.reason,
        emergencyContact: formData.emergencyContact,
        workHandover: formData.workHandover
      });

      console.log('🔍 LeaveRequestService: Policy enforcement result:', policyResult);

      if (!policyResult.isCompliant) {
        const criticalViolations = policyResult.violations.filter(v => v.type === 'CRITICAL');
        if (criticalViolations.length > 0) {
          console.log('❌ LeaveRequestService: Critical policy violation:', criticalViolations[0]);
          throw new Error(`Policy violation: ${criticalViolations[0].message}`);
        }
      }

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
        },
        orderBy: {
          submittedAt: 'desc'
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

      // Get employee info (including probation status for unpaid check)
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          name: true,
          email: true,
          department: true,
          profilePicture: true,
          probationStatus: true,
          probationStartDate: true,
          probationEndDate: true
        }
      });

      // Auto-detect if leave is paid from leave policy
      const leavePolicy = await prisma.leavePolicy.findUnique({
        where: { leaveType: formData.leaveType },
        select: { isPaid: true }
      });
      // Default to true (paid) if policy not found
      let isPaid = leavePolicy?.isPaid ?? true;

      // Check if employee is in probation period - if so, mark ALL leaves as unpaid
      const isInProbation = employee?.probationStatus === 'active' || employee?.probationStatus === 'extended';
      if (isInProbation) {
        // All leaves taken during probation are unpaid
        isPaid = false;
        console.log('💰 LeaveRequestService: Employee is in probation, marking as unpaid leave');
      }

      // Check if request exceeds leave balance - if so, mark as unpaid
      if (businessRulesResult.salaryDeduction) {
        // Request exceeds available balance, mark as unpaid
        isPaid = false;
        console.log('💰 LeaveRequestService: Request exceeds balance, marking as unpaid leave');
      }

      // Create leave request
      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId: employeeId,
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
      const summary = await this.getLeaveHistorySummary(employeeId, where, year || new Date().getFullYear());

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
  private static async getLeaveHistorySummary(employeeId: string, whereClause: any, year: number): Promise<LeaveHistorySummary> {
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
            userId: employeeId,
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
   * Create salary deduction record for excess leave days
   */
  private static async createSalaryDeductionRecord(
    employeeId: string,
    deductionData: {
      leaveType: string;
      startDate: Date;
      endDate: Date;
      excessDays: number;
      deductionAmount: number;
      reason: string;
    }
  ): Promise<void> {
    try {
      console.log('💰 Creating salary deduction record:', deductionData);
      
      // For now, we'll log the deduction
      // In a real system, this would create a record in a salary_deductions table
      console.log('💰 Salary Deduction Details:', {
        employeeId,
        leaveType: deductionData.leaveType,
        period: `${deductionData.startDate.toISOString().split('T')[0]} to ${deductionData.endDate.toISOString().split('T')[0]}`,
        excessDays: deductionData.excessDays,
        deductionAmount: deductionData.deductionAmount,
        reason: deductionData.reason,
        createdAt: new Date().toISOString()
      });

      // TODO: Implement actual salary deduction record creation
      // await prisma.salaryDeduction.create({
      //   data: {
      //     employeeId,
      //     leaveType: deductionData.leaveType,
      //     startDate: deductionData.startDate,
      //     endDate: deductionData.endDate,
      //     excessDays: deductionData.excessDays,
      //     deductionAmount: deductionData.deductionAmount,
      //     reason: deductionData.reason,
      //     status: 'pending',
      //     createdAt: new Date()
      //   }
      // });

    } catch (error) {
      console.error('Error creating salary deduction record:', error);
      // Don't throw error here as it shouldn't block the leave request
    }
  }
}
