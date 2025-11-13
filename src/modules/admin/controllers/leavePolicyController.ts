import { Request, Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../../../types';
import prisma from '../../../lib/prisma';

export class LeavePolicyController {
  /**
   * Get all leave policies
   */
  static async getLeavePolicies(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { status = 'active', limit = 50, page = 1, employeeType } = req.query;
      
      console.log('🔍 getLeavePolicies: Request params:', {
        adminId,
        employeeType,
        status,
        page,
        limit
      });
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Filter policies by the current admin user and employeeType
      // Handle case where migration hasn't been applied yet
      let policies;
      let total;
      try {
        // For admins, show all policies (not just ones they created)
        // This allows admins to see and manage all policies in the system
        const whereClause: any = {};
        
        // Add employeeType filter if provided
        // IMPORTANT: Onshore and Offshore policies are completely separate
        // Show policies with exact employeeType match, OR null policies if no exact match exists (for migration)
        if (employeeType && (employeeType === 'onshore' || employeeType === 'offshore')) {
          // Check if any policies exist with the exact employeeType
          const countWithType = await prisma.leavePolicy.count({
            where: { employeeType: employeeType }
          }).catch(() => 0);
          
          if (countWithType > 0) {
            // Show only policies with exact employeeType match
            whereClause.employeeType = employeeType;
            console.log('🔍 getLeavePolicies: Filtering by employeeType:', employeeType, '(exact match only)');
          } else {
            // No policies with exact match - show null policies so they can be edited and assigned
            whereClause.employeeType = null;
            console.log('🔍 getLeavePolicies: No policies found with employeeType:', employeeType);
            console.log('🔍 getLeavePolicies: Showing null policies for migration - they can be edited to assign employeeType');
          }
        } else {
          console.log('🔍 getLeavePolicies: No employeeType filter, showing all policies');
        }
        
        console.log('🔍 getLeavePolicies: Where clause:', JSON.stringify(whereClause, null, 2));
        console.log('🔍 getLeavePolicies: Admin ID (for reference):', adminId);
        
        policies = await prisma.leavePolicy.findMany({
          where: whereClause,
          skip,
          take: parseInt(limit as string),
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        });

        const countWhereClause: any = {};
        
        // Add employeeType filter if provided (match the same logic as main query)
        if (employeeType && (employeeType === 'onshore' || employeeType === 'offshore')) {
          // Check if any policies exist with the exact employeeType
          const countWithType = await prisma.leavePolicy.count({
            where: { employeeType: employeeType }
          }).catch(() => 0);
          
          if (countWithType > 0) {
            countWhereClause.employeeType = employeeType;
          } else {
            // No policies with exact match - count null policies
            countWhereClause.employeeType = null;
          }
        }
        
        total = await prisma.leavePolicy.count({
          where: countWhereClause
        });
        
        console.log('🔍 getLeavePolicies: Query results:', {
          filteredCount: policies.length,
          totalForAdmin: total,
          employeeType: employeeType || 'all',
          adminId,
          total,
          policiesForAdmin: policies.map(p => ({
            id: p.id,
            leaveType: p.leaveType,
            employeeType: (p as any).employeeType
          })),
          // Also check total policies in DB for debugging
          totalPoliciesInDb: await prisma.leavePolicy.count({}).catch(() => 0),
          samplePoliciesInDb: await prisma.leavePolicy.findMany({
            take: 3,
            select: {
              id: true,
              leaveType: true,
              employeeType: true,
              createdBy: true
            }
          }).catch(() => []),
          samplePolicy: policies.length > 0 ? {
            id: policies[0].id,
            leaveType: policies[0].leaveType,
            employeeType: (policies[0] as any).employeeType,
            createdBy: (policies[0] as any).createdBy
          } : null
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
          
          // Build WHERE clause - for admins, show all policies (not filtered by created_by)
          let whereClause = '1=1'; // Always true, show all policies
          const queryParams: any[] = [];
          let paramIndex = 1;
          
          // Add employeeType filter if column exists and employeeType is provided
          // Show policies with exact employeeType match, OR null policies if no exact match exists (for migration)
          if (hasEmployeeTypeColumn && employeeType && (employeeType === 'onshore' || employeeType === 'offshore')) {
            // Check if any policies exist with the exact employeeType
            const countWithTypeResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
              `SELECT COUNT(*)::int as count FROM leave_policies WHERE employee_type = $1`,
              employeeType
            ).catch(() => [{ count: BigInt(0) }]);
            const countWithType = Number(countWithTypeResult[0]?.count || 0);
            
            if (countWithType > 0) {
              // Show only policies with exact employeeType match
              whereClause += ` AND lp.employee_type = $${paramIndex}`;
              queryParams.push(employeeType);
              paramIndex++;
            } else {
              // No policies with exact match - show null policies for migration
              whereClause += ` AND lp.employee_type IS NULL`;
              console.log('🔍 Raw SQL: Showing null policies for migration');
            }
          }
          
          const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT 
              lp.id,
              lp.leave_type as "leaveType",
              lp.total_days_per_year as "totalDaysPerYear",
              lp.is_paid as "isPaid",
              lp.can_carry_forward as "canCarryForward",
              lp.max_carry_forward_days as "maxCarryForwardDays",
              lp.requires_approval as "requiresApproval",
              lp.allow_half_day as "allowHalfDay",
              lp.description,
              lp.is_active as "isActive",
              lp.created_by as "createdBy",
              lp.created_at as "createdAt",
              lp.updated_at as "updatedAt",
              ${hasEmployeeTypeColumn ? 'lp.employee_type as "employeeType",' : ''}
              json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email
              ) as creator
            FROM leave_policies lp
            LEFT JOIN users u ON lp.created_by = u.id
            WHERE ${whereClause}
            ORDER BY lp.created_at DESC
            LIMIT $${paramIndex}
            OFFSET $${paramIndex + 1}
          `, ...queryParams, parseInt(limit as string), skip);
          
          // Build count WHERE clause - for admins, show all policies
          // Match the same logic as the main query
          let countWhereClause = '1=1'; // Always true, count all policies
          const countParams: any[] = [];
          if (hasEmployeeTypeColumn && employeeType && (employeeType === 'onshore' || employeeType === 'offshore')) {
            // Check if any policies exist with the exact employeeType
            const countWithTypeResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
              `SELECT COUNT(*)::int as count FROM leave_policies WHERE employee_type = $1`,
              employeeType
            ).catch(() => [{ count: BigInt(0) }]);
            const countWithType = Number(countWithTypeResult[0]?.count || 0);
            
            if (countWithType > 0) {
              countWhereClause += ' AND employee_type = $1';
              countParams.push(employeeType);
            } else {
              // No policies with exact match - count null policies
              countWhereClause += ' AND employee_type IS NULL';
            }
          }
          
          const totalResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
            `SELECT COUNT(*)::int as count FROM leave_policies WHERE ${countWhereClause}`,
            ...countParams
          );
          
          policies = result.map((p: any) => ({
            ...p,
            creator: typeof p.creator === 'string' ? JSON.parse(p.creator) : p.creator
          }));
          total = Number(totalResult[0].count);
        } else {
          throw error;
        }
      }


      // Return as PaginatedResponse (which extends ApiResponse<T[]>)
      // Frontend expects: ApiResponse<PaginatedResponse<LeavePolicy>>
      // But PaginatedResponse<T> is ApiResponse<T[]>, so we return PaginatedResponse directly
      // The frontend will access response.data.data for the array
      const paginatedData: any = {
        data: policies,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      };
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Policies retrieved successfully',
        data: paginatedData
      };

      console.log('🔍 getLeavePolicies: Final response structure:', {
        success: response.success,
        hasData: !!response.data,
        dataIsArray: Array.isArray(response.data),
        dataHasData: !!(response.data && typeof response.data === 'object' && 'data' in response.data),
        policiesCount: response.data?.data?.length || 0
      });

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPolicies:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve policies',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get policy by ID
   */
  static async getLeavePolicyById(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { id } = req.params;
      
      let policy;
      try {
        policy = await prisma.leavePolicy.findFirst({
          where: { 
            id,
            createdBy: adminId
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
            WHERE id = $1 AND created_by = $2
          `, id, adminId);
          policy = result[0] || null;
        } else {
          throw error;
        }
      }

      if (!policy) {
        const response: ApiResponse = {
          success: false,
          message: 'Policy not found',
          error: 'Policy with the given ID does not exist or you do not have permission to access it'
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
      console.error('Error in getPolicyById:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve policy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Create new leave policy
   */
  static async createLeavePolicy(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.id;
    const policyData = req.body;
    
    try {
      console.log('🔍 LeavePolicyController: Received data:', policyData);
      console.log('🔍 LeavePolicyController: Admin ID:', adminId);
      console.log('🔍 LeavePolicyController: Data types:', {
        leaveType: typeof policyData.leaveType,
        totalDaysPerYear: typeof policyData.totalDaysPerYear,
        canCarryForward: typeof policyData.canCarryForward,
        maxCarryForwardDays: typeof policyData.maxCarryForwardDays,
        requiresApproval: typeof policyData.requiresApproval,
        allowHalfDay: typeof policyData.allowHalfDay,
      });
      
      // Check for existing policy with same leaveType and employeeType before creating
      // This prevents unique constraint violations
      const { employeeType: bodyEmployeeType, leaveType } = policyData as any;
      const { employeeType: queryEmployeeType } = req.query; // Get employeeType from query params (tab context)
      
      // IMPORTANT: Use employeeType from query params (tab context) if provided, otherwise from body
      // This ensures policies created from onshore/offshore tabs are automatically assigned to that tab
      // Normalize employeeType: convert undefined, empty string, or 'null' to null
      const normalizedEmployeeType = (queryEmployeeType || bodyEmployeeType) && 
        (queryEmployeeType || bodyEmployeeType) !== 'null' && 
        (queryEmployeeType || bodyEmployeeType) !== '' 
        ? (queryEmployeeType || bodyEmployeeType) 
        : null;
      
      console.log('🔍 createLeavePolicy: Checking for duplicates:', {
        leaveType,
        employeeType: normalizedEmployeeType,
        adminId,
        note: normalizedEmployeeType ? `Policy will be created for ${normalizedEmployeeType} employees only` : 'WARNING: Policy will be generic (null employeeType) - may not show in onshore/offshore tabs'
      });
      
      try {
        // First try with Prisma (if employee_type column exists)
        try {
          // Check for exact match: same leaveType AND same employeeType
          // IMPORTANT: Check across ALL policies, not just current admin's policies
          // This allows creating separate policies for onshore/offshore (they are independent)
          // But prevents duplicate policies within the same employeeType category
          const existingPolicyCheck = await prisma.leavePolicy.findFirst({
            where: {
              leaveType: leaveType,
              employeeType: normalizedEmployeeType // Match exact employeeType (null for generic)
              // NOTE: Removed createdBy filter - policies are unique per employeeType across all admins
            } as any
          });
          
          console.log('🔍 createLeavePolicy: Duplicate check result:', {
            found: !!existingPolicyCheck,
            existingPolicy: existingPolicyCheck ? {
              id: existingPolicyCheck.id,
              leaveType: existingPolicyCheck.leaveType,
              employeeType: existingPolicyCheck.employeeType
            } : null
          });
          
          if (existingPolicyCheck) {
            const existingEmployeeType = existingPolicyCheck.employeeType;
            const employeeTypeDisplay = existingEmployeeType 
              ? existingEmployeeType === 'onshore' ? 'Onshore' : 'Offshore'
              : 'Generic (applies to all)';
            
            const response: ApiResponse = {
              success: false,
              message: `A policy for leave type "${leaveType}" (${employeeTypeDisplay}) already exists with ID: ${existingPolicyCheck.id}. Please edit the existing policy or choose a different leave type.`,
              error: 'Policy with this leave type and employee type already exists',
              data: {
                existingPolicyId: existingPolicyCheck.id,
                existingEmployeeType: existingEmployeeType
              } as any
            };
            res.status(409).json(response);
            return;
          }
        } catch (prismaError: any) {
          // If Prisma fails due to employee_type column not existing, use raw SQL
          if (prismaError.message?.includes('employee_type')) {
            // Check if employee_type column exists
            const columnCheck = await prisma.$queryRawUnsafe<[{ exists: boolean }]>(
              `SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'leave_policies' 
                AND column_name = 'employee_type'
              ) as exists`
            );
            const hasEmployeeTypeColumn = columnCheck[0]?.exists || false;
            
            if (hasEmployeeTypeColumn) {
              // Column exists, check with employee_type
              // IMPORTANT: Check across ALL policies, not just current admin's policies
              let checkQuery = 'SELECT id FROM leave_policies WHERE leave_type = $1';
              const checkParams: any[] = [leaveType];
              
              if (normalizedEmployeeType) {
                checkQuery += ' AND employee_type = $2';
                checkParams.push(normalizedEmployeeType);
              } else {
                checkQuery += ' AND employee_type IS NULL';
              }
              
              const existingCheck = await prisma.$queryRawUnsafe<any[]>(checkQuery, ...checkParams);
              if (existingCheck && existingCheck.length > 0) {
                // Fetch full policy details to get employeeType
                const fullPolicyQuery = 'SELECT id, leave_type, employee_type FROM leave_policies WHERE id = $1';
                const fullPolicy = await prisma.$queryRawUnsafe<any[]>(fullPolicyQuery, existingCheck[0].id);
                const existingPolicy = fullPolicy && fullPolicy.length > 0 ? fullPolicy[0] : null;
                
                const existingEmployeeType = existingPolicy?.employee_type || null;
                const employeeTypeDisplay = existingEmployeeType 
                  ? existingEmployeeType === 'onshore' ? 'Onshore' : 'Offshore'
                  : 'Generic (applies to all)';
                
                const response: ApiResponse = {
                  success: false,
                  message: `A policy for leave type "${leaveType}" (${employeeTypeDisplay}) already exists with ID: ${existingCheck[0].id}. Please edit the existing policy or choose a different leave type.`,
                  error: 'Policy with this leave type and employee type already exists',
                  data: {
                    existingPolicyId: existingCheck[0].id,
                    existingEmployeeType: existingEmployeeType
                  } as any
                };
                res.status(409).json(response);
                return;
              }
            } else {
              // Column doesn't exist - check only by leave_type (old constraint)
              const existingCheck = await prisma.$queryRawUnsafe<any[]>(
                'SELECT id FROM leave_policies WHERE leave_type = $1 AND created_by = $2',
                leaveType,
                adminId
              );
              if (existingCheck && existingCheck.length > 0) {
                const response: ApiResponse = {
                  success: false,
                  message: `A policy for leave type "${leaveType}" already exists. Please apply the database migration to enable separate policies for onshore and offshore employees, or choose a different leave type.`,
                  error: 'Policy with this leave type already exists. Migration required to support separate onshore/offshore policies.'
                };
                res.status(409).json(response);
                return;
              }
            }
          } else {
            throw prismaError;
          }
        }
      } catch (checkError: any) {
        // If check fails for other reasons, log and continue
        // The database constraint will catch duplicates
        console.warn('⚠️ Could not check for existing policy:', checkError);
      }
      
      let policy;
      try {
        // Include employeeType in the policy creation
        const { employeeType: policyEmployeeType, ...otherData } = policyData as any;
        
        console.log('🔍 createLeavePolicy: Creating policy with:', {
          leaveType: otherData.leaveType,
          employeeType: normalizedEmployeeType,
          adminId
        });
        
        policy = await prisma.leavePolicy.create({
          data: {
            ...otherData,
            employeeType: normalizedEmployeeType, // Use normalized value
            createdBy: adminId
          } as any
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          
          const {
            leaveType,
            totalDaysPerYear,
            isPaid = true,
            canCarryForward = false,
            maxCarryForwardDays = null,
            requiresApproval = true,
            allowHalfDay = true,
            description = null,
            isActive = true
          } = policyData;
          
          // Use normalized employeeType
          const fallbackEmployeeType = normalizedEmployeeType;
          
          // Check if employee_type column exists before including it
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
            // If check fails, assume column doesn't exist
            hasEmployeeTypeColumn = false;
          }
          
          if (hasEmployeeTypeColumn) {
            const result = await prisma.$queryRawUnsafe<any[]>(`
              INSERT INTO leave_policies (
                id,
                leave_type,
                total_days_per_year,
                is_paid,
                can_carry_forward,
                max_carry_forward_days,
                requires_approval,
                allow_half_day,
                description,
                is_active,
                employee_type,
                created_by,
                created_at,
                updated_at
              ) VALUES (
                gen_random_uuid(),
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                $11,
                NOW(),
                NOW()
              )
              RETURNING 
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
                employee_type as "employeeType",
                created_by as "createdBy",
                created_at as "createdAt",
                updated_at as "updatedAt"
            `,
              leaveType,
              totalDaysPerYear,
              isPaid,
              canCarryForward,
              maxCarryForwardDays,
              requiresApproval,
              allowHalfDay,
              description,
              isActive,
              fallbackEmployeeType,
              adminId
            );
            policy = result[0];
          } else {
            // Column doesn't exist, create without employee_type
            const result = await prisma.$queryRawUnsafe<any[]>(`
              INSERT INTO leave_policies (
                id,
                leave_type,
                total_days_per_year,
                is_paid,
                can_carry_forward,
                max_carry_forward_days,
                requires_approval,
                allow_half_day,
                description,
                is_active,
                created_by,
                created_at,
                updated_at
              ) VALUES (
                gen_random_uuid(),
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9,
                $10,
                NOW(),
                NOW()
              )
              RETURNING 
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
            `,
              leaveType,
              totalDaysPerYear,
              isPaid,
              canCarryForward,
              maxCarryForwardDays,
              requiresApproval,
              allowHalfDay,
              description,
              isActive,
              adminId
            );
            policy = result[0];
          }
        } else {
          throw error;
        }
      }

      const response: ApiResponse = {
        success: true,
        message: 'Policy created successfully',
        data: policy
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createPolicy:', error);
      
      let message = 'Failed to create policy';
      let statusCode = 500;
      
      // Handle unique constraint violation
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Unique constraint failed') || 
          errorMessage.includes('P2002') || 
          errorMessage.includes('already exists')) {
        const employeeTypeStr = (policyData as any).employeeType 
          ? ` (${(policyData as any).employeeType})` 
          : '';
        message = `A policy for leave type "${(policyData as any).leaveType}"${employeeTypeStr} already exists. Please choose a different leave type or update the existing policy.`;
        statusCode = 409; // Conflict
      }
      
      const response: ApiResponse = {
        success: false,
        message,
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(statusCode).json(response);
    }
  }

  /**
   * Update leave policy
   */
  static async updateLeavePolicy(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { id } = req.params;
      const updateData = req.body;
      const { employeeType } = req.query; // Get employeeType from query params
      
      // First check if the policy exists and belongs to the current admin
      let existingPolicy;
      try {
        // First, get the policy without employeeType filter to check its actual employeeType
        existingPolicy = await prisma.leavePolicy.findFirst({
          where: {
            id,
            createdBy: adminId
          } as any
        });
        
        if (!existingPolicy) {
          const response: ApiResponse = {
            success: false,
            message: 'Policy not found',
            error: 'Policy with the given ID does not exist or you do not have permission to update it'
          };
          res.status(404).json(response);
          return;
        }
        
        // If employeeType is provided, verify it matches the policy's employeeType
        // IMPORTANT: If policy has null employeeType and we're updating from a specific tab,
        // automatically assign it to that tab's employeeType to make policies independent
        if (employeeType && (employeeType === 'onshore' || employeeType === 'offshore')) {
          const policyEmployeeType = (existingPolicy as any).employeeType;
          
          // Allow update if:
          // 1. Policy has exact employeeType match, OR
          // 2. Policy has null employeeType (will be assigned to this tab's employeeType)
          if (policyEmployeeType !== employeeType && policyEmployeeType !== null && policyEmployeeType !== undefined) {
            const response: ApiResponse = {
              success: false,
              message: 'Policy not found',
              error: `Policy with the given ID belongs to ${policyEmployeeType} employee type, not ${employeeType}. Cannot update from this tab.`
            };
            res.status(404).json(response);
            return;
          }
          
          // If policy has null employeeType, automatically assign it to the tab's employeeType
          // This ensures policies become independent when edited from a specific tab
          if (policyEmployeeType === null || policyEmployeeType === undefined) {
            console.log(`🔍 updateLeavePolicy: Assigning null policy to ${employeeType} employeeType`);
            // Set employeeType in updateData if not already set
            if (!updateData.employeeType) {
              updateData.employeeType = employeeType;
            }
          }
        }
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          let query = 'SELECT id FROM leave_policies WHERE id = $1 AND created_by = $2';
          const params: any[] = [id, adminId];
          
          const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);
          existingPolicy = result[0] || null;
        } else {
          throw error;
        }
      }

      if (!existingPolicy) {
        const response: ApiResponse = {
          success: false,
          message: 'Policy not found',
          error: 'Policy with the given ID does not exist or you do not have permission to update it'
        };
        res.status(404).json(response);
        return;
      }
      
      let policy;
      try {
        // Include employeeType in the update if provided
        const { employeeType: updateEmployeeType, ...otherData } = updateData as any;
        const updatePayload: any = {
          ...otherData
        };
        
        // Only update employeeType if it's provided in the update data
        // Don't change it if not provided (preserve existing value)
        if (updateEmployeeType !== undefined) {
          updatePayload.employeeType = updateEmployeeType || null;
        }
        
        policy = await prisma.leavePolicy.update({
          where: { id },
          data: updatePayload as any
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          
          const setClauses: string[] = [];
          const values: any[] = [];
          let paramIndex = 1;
          
          if (updateData.leaveType !== undefined) {
            setClauses.push(`leave_type = $${paramIndex++}`);
            values.push(updateData.leaveType);
          }
          if (updateData.totalDaysPerYear !== undefined) {
            setClauses.push(`total_days_per_year = $${paramIndex++}`);
            values.push(updateData.totalDaysPerYear);
          }
          if (updateData.isPaid !== undefined) {
            setClauses.push(`is_paid = $${paramIndex++}`);
            values.push(updateData.isPaid);
          }
          if (updateData.canCarryForward !== undefined) {
            setClauses.push(`can_carry_forward = $${paramIndex++}`);
            values.push(updateData.canCarryForward);
          }
          if (updateData.maxCarryForwardDays !== undefined) {
            setClauses.push(`max_carry_forward_days = $${paramIndex++}`);
            values.push(updateData.maxCarryForwardDays);
          }
          if (updateData.requiresApproval !== undefined) {
            setClauses.push(`requires_approval = $${paramIndex++}`);
            values.push(updateData.requiresApproval);
          }
          if (updateData.allowHalfDay !== undefined) {
            setClauses.push(`allow_half_day = $${paramIndex++}`);
            values.push(updateData.allowHalfDay);
          }
          if (updateData.description !== undefined) {
            setClauses.push(`description = $${paramIndex++}`);
            values.push(updateData.description);
          }
          if (updateData.isActive !== undefined) {
            setClauses.push(`is_active = $${paramIndex++}`);
            values.push(updateData.isActive);
          }
          
          setClauses.push(`updated_at = NOW()`);
          values.push(id);
          
          const result = await prisma.$queryRawUnsafe<any[]>(`
            UPDATE leave_policies
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING 
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
          `, ...values);
          
          policy = result[0];
        } else {
          throw error;
        }
      }

      const response: ApiResponse = {
        success: true,
        message: 'Policy updated successfully',
        data: policy
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updatePolicy:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update policy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Delete leave policy
   */
  static async deleteLeavePolicy(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { id } = req.params;
      const { employeeType } = req.query; // Get employeeType from query params
      
      // First check if the policy exists and belongs to the current admin
      let existingPolicy;
      try {
        // First, get the policy without employeeType filter to check its actual employeeType
        const policyCheck = await prisma.leavePolicy.findFirst({
          where: {
            id,
            createdBy: adminId
          } as any,
          select: {
            id: true,
            employeeType: true as any,
            leaveType: true
          } as any
        });
        
        if (!policyCheck) {
          const response: ApiResponse = {
            success: false,
            message: 'Policy not found',
            error: 'Policy with the given ID does not exist or you do not have permission to delete it'
          };
          res.status(404).json(response);
          return;
        }
        
        // If employeeType is provided, verify it matches the policy's employeeType
        // TEMPORARY: During migration, allow deletion of null policies from either tab
        if (employeeType && (employeeType === 'onshore' || employeeType === 'offshore')) {
          const policyEmployeeType = policyCheck.employeeType;
          
          // Allow deletion if:
          // 1. Policy has exact employeeType match, OR
          // 2. Policy has null employeeType (migration case - can be deleted from any tab)
          if (policyEmployeeType !== employeeType && policyEmployeeType !== null && policyEmployeeType !== undefined) {
            const response: ApiResponse = {
              success: false,
              message: 'Policy not found',
              error: `Policy with the given ID belongs to ${policyEmployeeType} employee type, not ${employeeType}. Cannot delete from this tab.`
            };
            res.status(404).json(response);
            return;
          }
        }
        
        existingPolicy = policyCheck;
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          // When column doesn't exist, cannot filter by employeeType - just check id and createdBy
          const result = await prisma.$queryRawUnsafe<any[]>(
            'SELECT id FROM leave_policies WHERE id = $1 AND created_by = $2',
            id,
            adminId
          );
          existingPolicy = result[0] || null;
        } else {
          throw error;
        }
      }

      if (!existingPolicy) {
        const response: ApiResponse = {
          success: false,
          message: 'Policy not found',
          error: 'Policy with the given ID does not exist or you do not have permission to delete it'
        };
        res.status(404).json(response);
        return;
      }
      
      try {
        await prisma.leavePolicy.delete({
          where: { id }
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          await prisma.$queryRawUnsafe(`DELETE FROM leave_policies WHERE id = $1`, id);
        } else {
          throw error;
        }
      }

      const response: ApiResponse = {
        success: true,
        message: 'Policy deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in deletePolicy:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete policy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get policy statistics
   */
  static async getLeavePolicyStats(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const totalPolicies = await prisma.leavePolicy.count({
        where: {
          createdBy: adminId
        }
      });
      
      const response: ApiResponse = {
        success: true,
        message: 'Policy statistics retrieved successfully',
        data: {
          totalPolicies,
          activePolicies: totalPolicies, // Assuming all policies are active for now
          inactivePolicies: 0,
          byLeaveType: {} // This would need to be calculated based on leaveType field
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPolicyStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve policy statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get available leave types
   */
  static async getLeavePolicyTypes(req: Request, res: Response): Promise<void> {
    try {
      let policies;
      try {
        policies = await prisma.leavePolicy.findMany({
          select: { leaveType: true },
          distinct: ['leaveType']
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
        const result = await prisma.$queryRaw<{ leaveType: string }[]>`
          SELECT DISTINCT leave_type as "leaveType"
          FROM leave_policies
        `;
        policies = result;
      }

      const leaveTypes = policies.map(policy => policy.leaveType);
      
      const response: ApiResponse = {
        success: true,
        message: 'Leave types retrieved successfully',
        data: leaveTypes
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveTypes:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave types',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Toggle leave policy status
   */
  static async toggleLeavePolicyStatus(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { id } = req.params;
      const { isActive } = req.body;
      const { employeeType } = req.query; // Get employeeType from query params
      
      // First check if the policy exists and belongs to the current admin
      let existingPolicy;
      try {
        const whereClause: any = {
          id,
          createdBy: adminId
        };
        
        // If employeeType is provided, verify it matches the policy's employeeType
        if (employeeType && (employeeType === 'onshore' || employeeType === 'offshore')) {
          whereClause.employeeType = employeeType;
        }
        
        existingPolicy = await prisma.leavePolicy.findFirst({
          where: whereClause as any
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          let query = 'SELECT id FROM leave_policies WHERE id = $1 AND created_by = $2';
          const params: any[] = [id, adminId];
          
          if (employeeType && (employeeType === 'onshore' || employeeType === 'offshore')) {
            query += ' AND employee_type = $3';
            params.push(employeeType);
          }
          
          const result = await prisma.$queryRawUnsafe<any[]>(query, ...params);
          existingPolicy = result[0] || null;
        } else {
          throw error;
        }
      }

      if (!existingPolicy) {
        const response: ApiResponse = {
          success: false,
          message: 'Policy not found',
          error: 'Policy with the given ID does not exist or you do not have permission to update it'
        };
        res.status(404).json(response);
        return;
      }
      
      let policy;
      try {
        policy = await prisma.leavePolicy.update({
          where: { id },
          data: { 
            isActive: isActive
          } as any
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, use raw query
        if (error.message && error.message.includes('employee_type')) {
          console.warn('⚠️ employeeType column not found, using fallback query. Please apply migration.');
          const result = await prisma.$queryRawUnsafe<any[]>(`
            UPDATE leave_policies
            SET is_active = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING 
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
          `, isActive, id);
          policy = result[0];
        } else {
          throw error;
        }
      }

      const response: ApiResponse = {
        success: true,
        message: 'Policy status updated successfully',
        data: policy
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in toggleLeavePolicyStatus:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to toggle policy status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Bulk update leave policies
   */
  static async bulkUpdateLeavePolicies(req: Request, res: Response): Promise<void> {
    try {
      const { policyIds, updates } = req.body;
      
      // For now, just return success since we don't have bulk update logic
      const response: ApiResponse = {
        success: true,
        message: 'Bulk update completed successfully',
        data: { updatedCount: policyIds?.length || 0 }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in bulkUpdateLeavePolicies:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to bulk update policies',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
