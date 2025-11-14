import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse, PaginatedResponse } from '../../../types';

const prisma = new PrismaClient();

export class LeavePolicyController {
  /**
   * Get all leave policies (read-only access for employees)
   */
  static async getLeavePolicies(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { status = 'active', limit = 50, page = 1 } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Get employee's employeeType to filter policies
      let employeeType: string | null = null;
      if (employeeId) {
        try {
          const employee = await prisma.user.findUnique({
            where: { id: employeeId },
            select: { employeeType: true }
          });
          employeeType = employee?.employeeType || null;
        } catch (error) {
          console.warn('⚠️ Could not fetch employee type, showing all policies');
        }
      }
      
      // Filter only active policies for employees
      // IMPORTANT: Employees see policies matching their employeeType
      // TEMPORARY: During migration, also show null policies if no exact matches exist
      // Handle case where migration hasn't been applied yet
      let policies: any[] = [];
      let total: number = 0;
      try {
        // IMPORTANT: Filter by employeeType with fallback to null policies for migration support
        // Employees should see policies that match their employeeType (onshore/offshore)
        // If no exact match, fallback to null policies (for backward compatibility during migration)
        if (employeeType) {
          // First try to get policies with exact employeeType match
          policies = await prisma.leavePolicy.findMany({
            where: {
              isActive: true,
              employeeType: employeeType
            },
            skip,
            take: parseInt(limit as string),
            orderBy: {
              createdAt: 'desc'
            }
          });
          
          console.log('🔍 Employee getLeavePolicies: Filtering by employeeType:', employeeType);
          console.log('🔍 Employee getLeavePolicies: Found policies with exact match:', policies.length);
          
          // If no policies found with exact match, fallback to null policies (for migration support)
          if (policies.length === 0) {
            console.warn('⚠️ Employee getLeavePolicies: No policies found for employeeType:', employeeType);
            console.warn('⚠️ Employee getLeavePolicies: Falling back to null employeeType policies (migration support)');
            
            policies = await prisma.leavePolicy.findMany({
              where: {
                isActive: true,
                employeeType: null
              },
              skip,
              take: parseInt(limit as string),
              orderBy: {
                createdAt: 'desc'
              }
            });
            
            console.log('🔍 Employee getLeavePolicies: Found null employeeType policies (fallback):', policies.length);
            
            if (policies.length > 0) {
              console.warn('⚠️ Employee getLeavePolicies: Using legacy policies with null employeeType.');
              console.warn('⚠️ Employee getLeavePolicies: Admin should update these policies to set employeeType =', employeeType);
            }
          }
          
          console.log('🔍 Employee getLeavePolicies: Employee ID:', employeeId);
        } else {
          // If employee has no employeeType set, return empty (they need to be assigned an employeeType)
          console.log('⚠️ Employee getLeavePolicies: Employee has no employeeType, returning empty result. Employee needs to be assigned an employeeType.');
          console.log('⚠️ Employee getLeavePolicies: Employee ID:', employeeId);
          policies = [];
        }
        
        // Debug: Check what policies exist in database
        const allPolicies = await prisma.leavePolicy.findMany({
          where: { isActive: true },
          select: {
            id: true,
            leaveType: true,
            employeeType: true,
            isActive: true
          }
        });
        console.log('🔍 Employee getLeavePolicies: All active policies in database:', JSON.stringify(allPolicies, null, 2));
        console.log('🔍 Employee getLeavePolicies: Final policies returned:', JSON.stringify(policies.map(p => ({ id: p.id, leaveType: p.leaveType, employeeType: p.employeeType })), null, 2));

        // Calculate total count (matching the same logic as policies query)
        if (employeeType) {
          // First count exact matches
          total = await prisma.leavePolicy.count({
            where: {
              isActive: true,
              employeeType: employeeType
            }
          });
          
          // If no exact matches, count null policies (fallback)
          if (total === 0) {
            total = await prisma.leavePolicy.count({
              where: {
                isActive: true,
                employeeType: null
              }
            });
          }
        } else {
          // If employee has no employeeType, return 0 count
          total = 0;
        }
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
          
          // Add employeeType filter if column exists
          // IMPORTANT: Strictly filter by employeeType - no fallback to null policies
          if (hasEmployeeTypeColumn) {
            if (employeeType) {
              // Show only policies with exact employeeType match
              whereClause += ` AND employee_type = $${paramIndex}`;
              queryParams.push(employeeType);
              paramIndex++;
              console.log('🔍 Raw SQL: Filtering by employeeType:', employeeType, '(exact match only, no fallback)');
            } else {
              // If employee has no employeeType, return no results (they need to be assigned an employeeType)
              whereClause += ` AND employee_type = $${paramIndex}`;
              queryParams.push('__NO_TYPE__'); // This will return no results
              paramIndex++;
              console.log('⚠️ Raw SQL: Employee has no employeeType, returning empty result.');
            }
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
          // Match the same strict logic as the main query
          if (hasEmployeeTypeColumn) {
            if (employeeType) {
              countWhereClause += ' AND employee_type = $1';
              countParams.push(employeeType);
            } else {
              // If employee has no employeeType, return 0 count
              countWhereClause += ' AND employee_type = $1';
              countParams.push('__NO_TYPE__'); // This will return 0
            }
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
   * Get policy by ID (read-only access for employees)
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
   * Get policy statistics (read-only access for employees)
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
   * Get available leave types (read-only access for employees)
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
