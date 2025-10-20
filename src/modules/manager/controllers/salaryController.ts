import { Request, Response } from 'express';
import { ApiResponse } from '../../../types';
import SalaryService from '../../../services/salaryService';
import prisma from '../../../lib/prisma';

export class SalaryController {
  /**
   * Get team employee salaries
   */
  static async getTeamSalaries(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      console.log('🔍 ManagerSalaryController: getTeamSalaries called by manager:', managerId);

      const salaries = await SalaryService.getEmployeeSalaries(managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Team salaries fetched successfully',
        data: salaries
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamSalaries:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch team salaries',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get team monthly salaries
   */
  static async getTeamMonthlySalaries(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { year, month } = req.query;

      console.log('🔍 ManagerSalaryController: getTeamMonthlySalaries called', { managerId, year, month });

      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      const monthNum = month ? parseInt(month as string) : undefined;

      const salaries = await SalaryService.getMonthlySalaries(yearNum, monthNum, managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Team monthly salaries fetched successfully',
        data: salaries
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamMonthlySalaries:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch team monthly salaries',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Generate monthly salaries for team
   */
  static async generateTeamMonthlySalaries(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { year, month } = req.body;

      console.log('🔍 ManagerSalaryController: generateTeamMonthlySalaries called', { managerId, year, month });

      if (!year || !month) {
        const response: ApiResponse = {
          success: false,
          message: 'Year and month are required',
          error: 'Missing required parameters'
        };
        res.status(400).json(response);
        return;
      }

      const generatedSalaries = await SalaryService.generateMonthlySalaries(year, month, managerId);

      const response: ApiResponse = {
        success: true,
        message: `Team monthly salaries generated successfully for ${generatedSalaries.length} employees`,
        data: generatedSalaries
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error in generateTeamMonthlySalaries:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to generate team monthly salaries',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Approve team monthly salary
   */
  static async approveTeamMonthlySalary(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { salaryId } = req.params;
      const { notes } = req.body;

      console.log('🔍 ManagerSalaryController: approveTeamMonthlySalary called', { managerId, salaryId });

      const approvedSalary = await SalaryService.approveMonthlySalary(salaryId, managerId, notes);

      const response: ApiResponse = {
        success: true,
        message: 'Team monthly salary approved successfully',
        data: approvedSalary
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in approveTeamMonthlySalary:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to approve team monthly salary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get team salary statistics
   */
  static async getTeamSalaryStatistics(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { year, month } = req.query;

      console.log('🔍 ManagerSalaryController: getTeamSalaryStatistics called', { managerId, year, month });

      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      const monthNum = month ? parseInt(month as string) : undefined;

      const statistics = await SalaryService.getSalaryStatistics(yearNum, monthNum, managerId);

      const response: ApiResponse = {
        success: true,
        message: 'Team salary statistics fetched successfully',
        data: statistics
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getTeamSalaryStatistics:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch team salary statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Calculate salary for specific team member
   */
  static async calculateTeamMemberSalary(req: Request, res: Response): Promise<void> {
    try {
      const managerId = (req as any).user?.id;
      const { userId } = req.params;
      const { year, month } = req.query;

      console.log('🔍 ManagerSalaryController: calculateTeamMemberSalary called', { managerId, userId, year, month });

      // Verify that the user is under this manager
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          managerId: managerId
        }
      });

      if (!user) {
        const response: ApiResponse = {
          success: false,
          message: 'User not found in your team',
          error: 'Unauthorized access'
        };
        res.status(403).json(response);
        return;
      }

      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      const monthNum = month ? parseInt(month as string) : new Date().getMonth() + 1;

      const calculation = await SalaryService.calculateMonthlySalary(userId, yearNum, monthNum);

      const response: ApiResponse = {
        success: true,
        message: 'Team member salary calculation completed successfully',
        data: calculation
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in calculateTeamMemberSalary:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to calculate team member salary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }
}
