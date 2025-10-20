import { Request, Response } from 'express';
import { EmployeeService } from '../services/employeeService';
import { ApiResponse } from '../../../types';
import { EmployeeFilters } from '../types';

export class EmployeeController {
  /**
   * Get all employees with filtering and pagination
   */
  static async getEmployees(req: Request, res: Response): Promise<void> {
    try {
      const filters: EmployeeFilters = {
        search: req.query.search as string,
        department: req.query.department as string,
        role: req.query.role as string,
        status: req.query.status as 'active' | 'inactive' | 'all',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      const result = await EmployeeService.getEmployees(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Employees retrieved successfully',
        data: result.employees,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getEmployees:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve employees',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get employee by ID
   */
  static async getEmployeeById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee ID'
        };
        res.status(400).json(response);
        return;
      }

      const employee = await EmployeeService.getEmployeeById(id);

      if (!employee) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee not found',
          error: 'Employee with the given ID does not exist'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Employee retrieved successfully',
        data: employee
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getEmployeeById:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve employee',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Create new employee
   */
  static async createEmployee(req: Request, res: Response): Promise<void> {
    try {
      const employeeData = req.body;
      
      console.log('🔍 EmployeeController: Received employee data:', employeeData);
      console.log('🔍 EmployeeController: Request body keys:', Object.keys(employeeData));

      const employee = await EmployeeService.createEmployee(employeeData);

      const response: ApiResponse = {
        success: true,
        message: 'Employee created successfully',
        data: employee
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createEmployee:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to create employee',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Update employee
   */
  static async updateEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee ID'
        };
        res.status(400).json(response);
        return;
      }

      const employee = await EmployeeService.updateEmployee(id, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Employee updated successfully',
        data: employee
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateEmployee:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update employee',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Delete employee (soft delete - deactivate)
   */
  static async deleteEmployee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;

      console.log(`🔍 EmployeeController: Delete employee request - ID: ${id}, Admin ID: ${adminId}`);

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee ID'
        };
        res.status(400).json(response);
        return;
      }

      if (!adminId) {
        const response: ApiResponse = {
          success: false,
          message: 'Authentication required',
          error: 'Admin user not found'
        };
        res.status(401).json(response);
        return;
      }

      const result = await EmployeeService.deleteEmployee(id);

      if (result.success) {
        const response: ApiResponse = {
          success: true,
          message: result.message,
          data: result.employee
        };
        res.status(200).json(response);
      } else {
        const response: ApiResponse = {
          success: false,
          message: result.message,
          error: result.message
        };
        res.status(400).json(response);
      }
    } catch (error) {
      console.error('❌ EmployeeController: Error in deleteEmployee:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to deactivate employee',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Toggle employee status
   */
  static async toggleEmployeeStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee ID'
        };
        res.status(400).json(response);
        return;
      }

      if (typeof isActive !== 'boolean') {
        const response: ApiResponse = {
          success: false,
          message: 'isActive must be a boolean value',
          error: 'Invalid isActive value'
        };
        res.status(400).json(response);
        return;
      }

      const employee = await EmployeeService.toggleEmployeeStatus(id, isActive);

      const response: ApiResponse = {
        success: true,
        message: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: employee
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in toggleEmployeeStatus:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to toggle employee status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Bulk update employee status
   */
  static async bulkUpdateEmployeeStatus(req: Request, res: Response): Promise<void> {
    try {
      const { employeeIds, isActive } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee IDs array is required',
          error: 'Missing or invalid employee IDs'
        };
        res.status(400).json(response);
        return;
      }

      if (typeof isActive !== 'boolean') {
        const response: ApiResponse = {
          success: false,
          message: 'isActive must be a boolean value',
          error: 'Invalid isActive value'
        };
        res.status(400).json(response);
        return;
      }

      const result = await EmployeeService.bulkUpdateEmployeeStatus(employeeIds, isActive);

      const response: ApiResponse = {
        success: true,
        message: `Bulk status update completed: ${result.updated} updated, ${result.failed} failed`,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in bulkUpdateEmployeeStatus:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to bulk update employee status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Bulk delete employees
   */
  static async bulkDeleteEmployees(req: Request, res: Response): Promise<void> {
    try {
      const { employeeIds } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee IDs array is required',
          error: 'Missing or invalid employee IDs'
        };
        res.status(400).json(response);
        return;
      }

      const result = await EmployeeService.bulkDeleteEmployees(employeeIds);

      const response: ApiResponse = {
        success: true,
        message: `Bulk deactivation completed: ${result.deleted} deactivated, ${result.failed} failed`,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in bulkDeleteEmployees:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to bulk deactivate employees',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Bulk update employee department
   */
  static async bulkUpdateEmployeeDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { employeeIds, department } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee IDs array is required',
          error: 'Missing or invalid employee IDs'
        };
        res.status(400).json(response);
        return;
      }

      if (!department || typeof department !== 'string') {
        const response: ApiResponse = {
          success: false,
          message: 'Department is required',
          error: 'Missing or invalid department'
        };
        res.status(400).json(response);
        return;
      }

      const result = await EmployeeService.bulkUpdateEmployeeDepartment(employeeIds, department);

      const response: ApiResponse = {
        success: true,
        message: `Bulk department update completed: ${result.updated} updated, ${result.failed} failed`,
        data: result
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in bulkUpdateEmployeeDepartment:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to bulk update employee department',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Export employees to CSV
   */
  static async exportEmployeesToCSV(req: Request, res: Response): Promise<void> {
    try {
      const csvContent = await EmployeeService.exportEmployeesToCSV();

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
      res.status(200).send(csvContent);
    } catch (error) {
      console.error('Error in exportEmployeesToCSV:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to export employees to CSV',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get departments list
   */
  static async getDepartments(req: Request, res: Response): Promise<void> {
    try {
      const departments = await EmployeeService.getDepartments();

      const response: ApiResponse = {
        success: true,
        message: 'Departments retrieved successfully',
        data: departments
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getDepartments:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve departments',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get managers list
   */
  static async getManagers(req: Request, res: Response): Promise<void> {
    try {
      const managers = await EmployeeService.getManagers();

      const response: ApiResponse = {
        success: true,
        message: 'Managers retrieved successfully',
        data: managers
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getManagers:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve managers',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get employee statistics
   */
  static async getEmployeeStats(req: Request, res: Response): Promise<void> {
    try {
      const { department } = req.query;

      const filters: EmployeeFilters = {
        department: department as string,
        status: 'active'
      };

      const result = await EmployeeService.getEmployees(filters);

      const stats = {
        totalEmployees: result.totalCount,
        byDepartment: result.employees.reduce((acc, emp) => {
          acc[emp.department] = (acc[emp.department] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number }),
        byRole: result.employees.reduce((acc, emp) => {
          acc[emp.role] = (acc[emp.role] || 0) + 1;
          return acc;
        }, {} as { [key: string]: number })
      };

      const response: ApiResponse = {
        success: true,
        message: 'Employee statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getEmployeeStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve employee statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get employee leave balance
   */
  static async getEmployeeLeaveBalance(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = req.params.id;
      const year = req.query.year as string || new Date().getFullYear().toString();

      console.log('🔍 Admin Controller: getEmployeeLeaveBalance called with:', { employeeId, year });

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee ID'
        };
        res.status(400).json(response);
        return;
      }

      const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(employeeId, year);
      console.log('🔍 Admin Controller: Service returned:', leaveBalance);

      const response: ApiResponse = {
        success: true,
        message: 'Employee leave balance retrieved successfully',
        data: leaveBalance
      };

      console.log('🔍 Admin Controller: Sending response:', response);
      res.status(200).json(response);
    } catch (error) {
      console.error('❌ Admin Controller: Error in getEmployeeLeaveBalance:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve employee leave balance',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
