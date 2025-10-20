import { Request, Response } from 'express';
import { ApiResponse } from '../../../types';
import SalaryService from '../../../services/salaryService';

export class SalaryController {
  /**
   * Get all employee salaries
   */
  static async getEmployeeSalaries(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      console.log('🔍 SalaryController: getEmployeeSalaries called by admin:', adminId);

      const salaries = await SalaryService.getEmployeeSalaries();

      const response: ApiResponse = {
        success: true,
        message: 'Employee salaries fetched successfully',
        data: salaries
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getEmployeeSalaries:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch employee salaries',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get monthly salaries
   */
  static async getMonthlySalaries(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { year, month } = req.query;

      console.log('🔍 SalaryController: getMonthlySalaries called', { adminId, year, month });

      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      const monthNum = month ? parseInt(month as string) : undefined;

      const salaries = await SalaryService.getMonthlySalaries(yearNum, monthNum);

      const response: ApiResponse = {
        success: true,
        message: 'Monthly salaries fetched successfully',
        data: salaries
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getMonthlySalaries:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch monthly salaries',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Generate monthly salaries for all employees
   */
  static async generateMonthlySalaries(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { year, month } = req.body;

      console.log('🔍 SalaryController: generateMonthlySalaries called', { adminId, year, month });

      if (!year || !month) {
        const response: ApiResponse = {
          success: false,
          message: 'Year and month are required',
          error: 'Missing required parameters'
        };
        res.status(400).json(response);
        return;
      }

      const generatedSalaries = await SalaryService.generateMonthlySalaries(year, month);

      const response: ApiResponse = {
        success: true,
        message: `Monthly salaries generated successfully for ${generatedSalaries.length} employees`,
        data: generatedSalaries
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error in generateMonthlySalaries:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to generate monthly salaries',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Approve monthly salary
   */
  static async approveMonthlySalary(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { salaryId } = req.params;
      const { notes } = req.body;

      console.log('🔍 SalaryController: approveMonthlySalary called', { adminId, salaryId });

      const approvedSalary = await SalaryService.approveMonthlySalary(salaryId, adminId, notes);

      const response: ApiResponse = {
        success: true,
        message: 'Monthly salary approved successfully',
        data: approvedSalary
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in approveMonthlySalary:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to approve monthly salary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get salary statistics
   */
  static async getSalaryStatistics(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { year, month } = req.query;

      console.log('🔍 SalaryController: getSalaryStatistics called', { adminId, year, month });

      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      const monthNum = month ? parseInt(month as string) : undefined;

      const statistics = await SalaryService.getSalaryStatistics(yearNum, monthNum);

      const response: ApiResponse = {
        success: true,
        message: 'Salary statistics fetched successfully',
        data: statistics
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getSalaryStatistics:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch salary statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Calculate salary for specific employee
   */
  static async calculateEmployeeSalary(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { userId } = req.params;
      const { year, month } = req.query;

      console.log('🔍 SalaryController: calculateEmployeeSalary called', { adminId, userId, year, month });

      const yearNum = year ? parseInt(year as string) : new Date().getFullYear();
      const monthNum = month ? parseInt(month as string) : new Date().getMonth() + 1;

      const calculation = await SalaryService.calculateMonthlySalary(userId, yearNum, monthNum);

      const response: ApiResponse = {
        success: true,
        message: 'Salary calculation completed successfully',
        data: calculation
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in calculateEmployeeSalary:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to calculate employee salary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Create new employee salary
   */
  static async createEmployeeSalary(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const salaryData = req.body;
      
      console.log('🔍 SalaryController: createEmployeeSalary called by admin:', adminId);
      console.log('🔍 SalaryController: salary data:', salaryData);

      const salary = await SalaryService.createEmployeeSalary(salaryData);

      const response: ApiResponse = {
        success: true,
        message: 'Employee salary created successfully',
        data: salary
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createEmployeeSalary:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to create employee salary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update employee salary
   */
  static async updateEmployeeSalary(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { salaryId } = req.params;
      const updateData = req.body;
      
      console.log('🔍 SalaryController: updateEmployeeSalary called by admin:', adminId);
      console.log('🔍 SalaryController: salary ID:', salaryId);
      console.log('🔍 SalaryController: update data:', updateData);

      const salary = await SalaryService.updateEmployeeSalary(salaryId, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Employee salary updated successfully',
        data: salary
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateEmployeeSalary:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update employee salary',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(400).json(response);
    }
  }
}
