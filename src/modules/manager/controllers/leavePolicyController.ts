import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse, PaginatedResponse } from '../../../types';

const prisma = new PrismaClient();

export class LeavePolicyController {
  /**
   * Get all leave policies (read-only access for managers)
   */
  static async getLeavePolicies(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { status = 'active', limit = 50, page = 1 } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Get manager's employeeType to filter policies
      // Managers see policies matching their employeeType (onshore managers see onshore policies, etc.)
      let managerEmployeeType: string | null = null;
      if (managerId) {
        try {
          const manager = await prisma.user.findUnique({
            where: { id: managerId },
            select: { employeeType: true }
          });
          managerEmployeeType = manager?.employeeType || null;
        } catch (error) {
          console.warn('⚠️ Could not fetch manager employee type, showing all policies');
        }
      }
      
      // Filter only active policies for managers
      // IMPORTANT: Managers only see policies matching their exact employeeType
      // Handle case where migration hasn't been applied yet
      let policies;
      let total;
      try {
        const whereClause: any = {
          isActive: true
        };
        
        // Filter by exact employeeType match if manager has one
        if (managerEmployeeType) {
          whereClause.employeeType = managerEmployeeType;
          console.log('🔍 Manager getLeavePolicies: Filtering by employeeType:', managerEmployeeType, '(exact match only)');
        } else {
          // If manager has no employeeType, show no policies (they need to be assigned a type)
          whereClause.employeeType = '__NO_MATCH__'; // This will return 0 results
          console.log('🔍 Manager getLeavePolicies: Manager has no employeeType, showing no policies');
        }
        
        policies = await prisma.leavePolicy.findMany({
          where: whereClause,
          skip,
          take: parseInt(limit as string),
          orderBy: {
            createdAt: 'desc'
          }
        });

        const countWhereClause: any = {
          isActive: true
        };
        
        if (managerEmployeeType) {
          countWhereClause.employeeType = managerEmployeeType;
        } else {
          countWhereClause.employeeType = '__NO_MATCH__';
        }

        total = await prisma.leavePolicy.count({
          where: countWhereClause
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          
          // Check if employee_type column exists
          let hasEmployeeTypeColumn = false;
          try {
            const columnCheck = await prisma.$queryRawUnsafe<[{ exists: boolean }]>(
              `SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'leave_policies' 
                AND column_name = 'employee_type'
              ) as exists`
            );
            hasEmployeeTypeColumn = columnCheck[0]?.exists || false;
          } catch (e) {
            hasEmployeeTypeColumn = false;
          }
          
          let whereClause = 'is_active = true';
          const queryParams: any[] = [];
          let paramIndex = 1;
          
          // Add employeeType filter if column exists and manager has employeeType
          if (hasEmployeeTypeColumn && managerEmployeeType) {
            whereClause += ` AND employee_type = $${paramIndex}`;
            queryParams.push(managerEmployeeType);
            paramIndex++;
          } else if (hasEmployeeTypeColumn && !managerEmployeeType) {
            // Manager has no employeeType - return no results
            whereClause += ` AND employee_type = $${paramIndex}`;
            queryParams.push('__NO_MATCH__');
            paramIndex++;
          }
          
          const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT 
              id,
              leave_type as "leaveType",
              total_days_per_year as "totalDaysPerYear",
              is_paid as "isPaid",
              can_carry_forward as "canCarryForward",
              max_carry_forward_days as "maxCarryForwardDays",
              requires_approval as "requiresApproval",
              allow_half_day as "allowHalfDay",
              description,
              is_active as "isActive",
              created_by as "createdBy",
              created_at as "createdAt",
              updated_at as "updatedAt",
              ${hasEmployeeTypeColumn ? 'employee_type as "employeeType",' : ''}
            FROM leave_policies
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex}
            OFFSET $${paramIndex + 1}
          `, ...queryParams, parseInt(limit as string), skip);
          
          let countWhereClause = 'is_active = true';
          const countParams: any[] = [];
          if (hasEmployeeTypeColumn && managerEmployeeType) {
            countWhereClause += ' AND employee_type = $1';
            countParams.push(managerEmployeeType);
          } else if (hasEmployeeTypeColumn && !managerEmployeeType) {
            countWhereClause += ' AND employee_type = $1';
            countParams.push('__NO_MATCH__');
          }
          
          const totalResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
            `SELECT COUNT(*)::int as count FROM leave_policies WHERE ${countWhereClause}`,
            ...countParams
          );
          
          policies = result;
          total = Number(totalResult[0].count);
        } else {
          throw error;
        }
      }

      const response: PaginatedResponse<any> = {
        success: true,
        message: 'Policies retrieved successfully',
        data: policies,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeavePolicies:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve policies',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get policy by ID (read-only access for managers)
   */
  static async getLeavePolicyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      let policy;
      try {
        policy = await prisma.leavePolicy.findFirst({
          where: { 
            id,
            isActive: true
          }
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT 
              id,
              leave_type as "leaveType",
              total_days_per_year as "totalDaysPerYear",
              is_paid as "isPaid",
              can_carry_forward as "canCarryForward",
              max_carry_forward_days as "maxCarryForwardDays",
              requires_approval as "requiresApproval",
              allow_half_day as "allowHalfDay",
              description,
              is_active as "isActive",
              created_by as "createdBy",
              created_at as "createdAt",
              updated_at as "updatedAt"
            FROM leave_policies
            WHERE id = $1 AND is_active = true
          `, id);
          policy = result[0] || null;
        } else {
          throw error;
        }
      }

      if (!policy) {
        const response: ApiResponse = {
          success: false,
          message: 'Policy not found',
          error: 'Policy with the given ID does not exist or is not active'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Policy retrieved successfully',
        data: policy
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeavePolicyById:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve policy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get policy statistics (read-only access for managers)
   */
  static async getLeavePolicyStats(req: Request, res: Response): Promise<void> {
    try {
      let activePolicies;
      let totalPolicies;
      try {
        activePolicies = await prisma.leavePolicy.count({
          where: {
            isActive: true
          }
        });
        
        totalPolicies = await prisma.leavePolicy.count();
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          const activeResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
            `SELECT COUNT(*)::int as count FROM leave_policies WHERE is_active = true`
          );
          const totalResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
            `SELECT COUNT(*)::int as count FROM leave_policies`
          );
          activePolicies = Number(activeResult[0].count);
          totalPolicies = Number(totalResult[0].count);
        } else {
          throw error;
        }
      }
      const inactivePolicies = totalPolicies - activePolicies;
      
      const response: ApiResponse = {
        success: true,
        message: 'Policy statistics retrieved successfully',
        data: {
          totalPolicies,
          activePolicies,
          inactivePolicies,
          byLeaveType: {} // This would need to be calculated based on leaveType field
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeavePolicyStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve policy statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get available leave types (read-only access for managers)
   */
  static async getLeavePolicyTypes(req: Request, res: Response): Promise<void> {
    try {
      let policies;
      try {
        policies = await prisma.leavePolicy.findMany({
          where: {
            isActive: true
          },
          select: { leaveType: true },
          distinct: ['leaveType']
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          const result = await prisma.$queryRaw<{ leaveType: string }[]>`
            SELECT DISTINCT leave_type as "leaveType"
            FROM leave_policies
            WHERE is_active = true
          `;
          policies = result;
        } else {
          throw error;
        }
      }

      const leaveTypes = policies.map(policy => policy.leaveType);
      
      const response: ApiResponse = {
        success: true,
        message: 'Leave types retrieved successfully',
        data: leaveTypes
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeavePolicyTypes:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave types',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
