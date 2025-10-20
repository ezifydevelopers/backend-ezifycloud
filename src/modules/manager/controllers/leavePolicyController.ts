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
      const { status = 'active', limit = 50, page = 1 } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Filter only active policies for managers
      const policies = await prisma.leavePolicy.findMany({
        where: {
          isActive: true
        },
        skip,
        take: parseInt(limit as string),
        orderBy: {
          createdAt: 'desc'
        }
      });

      const total = await prisma.leavePolicy.count({
        where: {
          isActive: true
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
      
      const policy = await prisma.leavePolicy.findFirst({
        where: { 
          id,
          isActive: true
        }
      });

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
      const activePolicies = await prisma.leavePolicy.count({
        where: {
          isActive: true
        }
      });
      
      const totalPolicies = await prisma.leavePolicy.count();
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
      const policies = await prisma.leavePolicy.findMany({
        where: {
          isActive: true
        },
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
