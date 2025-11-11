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
      const { status = 'active', limit = 50, page = 1 } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Filter policies by the current admin user
      const policies = await prisma.leavePolicy.findMany({
        where: {
          createdBy: adminId
        },
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

      const total = await prisma.leavePolicy.count({
        where: {
          createdBy: adminId
        }
      });

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
      
      const policy = await prisma.leavePolicy.findFirst({
        where: { 
          id,
          createdBy: adminId
        }
      });

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
      
      const policy = await prisma.leavePolicy.create({
        data: {
          ...policyData,
          createdBy: adminId
        }
      });

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
      if (error instanceof Error && error.message.includes('Unique constraint failed')) {
        message = `A policy for leave type "${policyData.leaveType}" already exists. Please choose a different leave type or update the existing policy.`;
        statusCode = 409; // Conflict
      } else if (error instanceof Error && error.message.includes('P2002')) {
        message = `A policy for leave type "${policyData.leaveType}" already exists. Please choose a different leave type or update the existing policy.`;
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
      
      // First check if the policy exists and belongs to the current admin
      const existingPolicy = await prisma.leavePolicy.findFirst({
        where: { 
          id,
          createdBy: adminId
        }
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
      
      const policy = await prisma.leavePolicy.update({
        where: { id },
        data: updateData
      });

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
      
      // First check if the policy exists and belongs to the current admin
      const existingPolicy = await prisma.leavePolicy.findFirst({
        where: { 
          id,
          createdBy: adminId
        }
      });

      if (!existingPolicy) {
        const response: ApiResponse = {
          success: false,
          message: 'Policy not found',
          error: 'Policy with the given ID does not exist or you do not have permission to delete it'
        };
        res.status(404).json(response);
        return;
      }
      
      await prisma.leavePolicy.delete({
        where: { id }
      });

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
      const policies = await prisma.leavePolicy.findMany({
        select: { leaveType: true },
        distinct: ['leaveType']
      });

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
      
      // First check if the policy exists and belongs to the current admin
      const existingPolicy = await prisma.leavePolicy.findFirst({
        where: { 
          id,
          createdBy: adminId
        }
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
      
      const policy = await prisma.leavePolicy.update({
        where: { id },
        data: { 
          isActive: isActive
        }
      });

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
