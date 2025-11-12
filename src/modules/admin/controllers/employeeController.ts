import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { EmployeeService } from '../services/employeeService';
import { ApiResponse } from '../../../types';
import { EmployeeFilters } from '../types';
import prisma from '../../../lib/prisma';

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
      const editor = (req as any).user;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee ID'
        };
        res.status(400).json(response);
        return;
      }

      // Get editor info for audit log
      const editedBy = editor ? {
        userId: editor.id,
        userName: editor.name || editor.email,
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || undefined,
        userAgent: req.headers['user-agent']
      } : undefined;

      const employee = await EmployeeService.updateEmployee(id, updateData, editedBy);

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
   * Manually adjust employee leave balance (Admin/Manager only)
   */
  static async adjustEmployeeLeaveBalance(req: Request, res: Response): Promise<void> {
    try {
      const { id: employeeId } = req.params;
      const { leaveType, additionalDays, reason } = req.body;
      const adjustedBy = (req as any).user?.id;

      if (!adjustedBy) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      if (!leaveType || !additionalDays || additionalDays <= 0) {
        res.status(400).json({
          success: false,
          message: 'Invalid request. leaveType and additionalDays (positive number) are required.'
        });
        return;
      }

      if (!reason || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Reason is required for leave balance adjustments'
        });
        return;
      }

      const result = await EmployeeService.adjustEmployeeLeaveBalance(
        employeeId,
        leaveType,
        additionalDays,
        reason,
        adjustedBy,
        req.query.year ? parseInt(req.query.year as string) : undefined
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.leaveBalance
      });
    } catch (error) {
      console.error('Error in adjustEmployeeLeaveBalance:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to adjust employee leave balance'
      });
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

  /**
   * Process leave accrual for all eligible employees
   */
  static async processLeaveAccrual(req: Request, res: Response): Promise<void> {
    try {
      const { triggerAccrualProcessing } = await import('../../../services/leaveAccrualScheduler');
      const result = await triggerAccrualProcessing();

      res.status(200).json({
        success: true,
        message: `Leave accrual processing completed. Processed: ${result.processed}, Skipped: ${result.skipped}`,
        data: result
      });
    } catch (error) {
      console.error('Error in processLeaveAccrual:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process leave accrual'
      });
    }
  }

  /**
   * Process leave accrual for a specific employee
   */
  static async processEmployeeAccrual(req: Request, res: Response): Promise<void> {
    try {
      const { id: employeeId } = req.params;
      const accrualDate = req.body.accrualDate ? new Date(req.body.accrualDate) : new Date();

      const { LeaveAccrualService } = await import('../../../services/leaveAccrualService');
      const result = await LeaveAccrualService.processMonthlyAccrual(employeeId, accrualDate);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.accruals
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Error in processEmployeeAccrual:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process employee leave accrual'
      });
    }
  }

  /**
   * Get accrual history for an employee
   */
  static async getEmployeeAccrualHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id: employeeId } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const { LeaveAccrualService } = await import('../../../services/leaveAccrualService');
      const history = await LeaveAccrualService.getAccrualHistory(employeeId, year);

      res.status(200).json({
        success: true,
        message: 'Accrual history retrieved successfully',
        data: history
      });
    } catch (error) {
      console.error('Error in getEmployeeAccrualHistory:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve accrual history'
      });
    }
  }

  /**
   * Get next accrual date for an employee
   */
  static async getNextAccrualDate(req: Request, res: Response): Promise<void> {
    try {
      const { id: employeeId } = req.params;

      const { LeaveAccrualService } = await import('../../../services/leaveAccrualService');
      const nextDate = await LeaveAccrualService.getNextAccrualDate(employeeId);

      res.status(200).json({
        success: true,
        message: 'Next accrual date retrieved successfully',
        data: { nextAccrualDate: nextDate }
      });
    } catch (error) {
      console.error('Error in getNextAccrualDate:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve next accrual date'
      });
    }
  }

  /**
   * Approve user access
   */
  static async approveUserAccess(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const approverId = (req as any).user?.id;

      if (!approverId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, approvalStatus: true }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      if (user.approvalStatus === 'approved') {
        res.status(400).json({
          success: false,
          message: 'User is already approved'
        });
        return;
      }

      // Update user approval status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: 'approved',
          approvedBy: approverId,
          approvedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          approvalStatus: true,
          approvedBy: true,
          approvedAt: true
        }
      });

      // Create audit log
      const approver = await prisma.user.findUnique({
        where: { id: approverId },
        select: { name: true }
      });

      await prisma.auditLog.create({
        data: {
          userId: approverId,
          userName: approver?.name || 'System',
          action: 'APPROVE_USER_ACCESS',
          targetId: userId,
          targetType: 'user',
          details: {
            userName: user.name,
            userEmail: user.email,
            previousStatus: user.approvalStatus,
            newStatus: 'approved'
          } as any
        }
      });

      res.status(200).json({
        success: true,
        message: 'User access approved successfully',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error in approveUserAccess:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to approve user access'
      });
    }
  }

  /**
   * Reject user access
   */
  static async rejectUserAccess(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.params;
      const { reason } = req.body;
      const approverId = (req as any).user?.id;

      if (!approverId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, approvalStatus: true }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      if (user.approvalStatus === 'rejected') {
        res.status(400).json({
          success: false,
          message: 'User access is already rejected'
        });
        return;
      }

      // Update user approval status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          approvalStatus: 'rejected',
          approvedBy: approverId,
          approvedAt: new Date(),
          rejectionReason: reason || 'Access rejected by administrator'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          approvalStatus: true,
          approvedBy: true,
          approvedAt: true,
          rejectionReason: true
        }
      });

      // Create audit log
      const approver = await prisma.user.findUnique({
        where: { id: approverId },
        select: { name: true }
      });

      await prisma.auditLog.create({
        data: {
          userId: approverId,
          userName: approver?.name || 'System',
          action: 'REJECT_USER_ACCESS',
          targetId: userId,
          targetType: 'user',
          details: {
            userName: user.name,
            userEmail: user.email,
            previousStatus: user.approvalStatus,
            newStatus: 'rejected',
            reason: reason || 'Access rejected by administrator'
          } as any
        }
      });

      res.status(200).json({
        success: true,
        message: 'User access rejected',
        data: updatedUser
      });
    } catch (error) {
      console.error('Error in rejectUserAccess:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to reject user access'
      });
    }
  }

  /**
   * Get pending user approvals with filtering and search
   */
  static async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      const search = req.query.search as string || '';
      const role = req.query.role as string;
      const department = req.query.department as string;

      // Build where clause
      const where: any = {
        approvalStatus: 'pending',
        isActive: true
      };

      // Add search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { department: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Add role filter
      if (role && role !== 'all') {
        where.role = role;
      }

      // Add department filter
      if (department && department !== 'all') {
        where.department = department;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            phone: true,
            createdAt: true,
            approvalStatus: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip,
          take: limit
        }),
        prisma.user.count({ where })
      ]);

      res.status(200).json({
        success: true,
        message: 'Pending approvals retrieved successfully',
        data: {
          data: users,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error in getPendingApprovals:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve pending approvals'
      });
    }
  }

  /**
   * Complete employee probation
   */
  static async completeProbation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await EmployeeService.completeProbation(id);

      res.status(200).json({
        success: true,
        message: 'Employee probation completed successfully',
        data: employee
      });
    } catch (error) {
      console.error('Error in completeProbation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to complete probation'
      });
    }
  }

  /**
   * Extend employee probation
   */
  static async extendProbation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { additionalDays } = req.body;

      if (!additionalDays || additionalDays <= 0) {
        res.status(400).json({
          success: false,
          message: 'Additional days must be a positive number'
        });
        return;
      }

      const employee = await EmployeeService.extendProbation(id, additionalDays);

      res.status(200).json({
        success: true,
        message: 'Employee probation extended successfully',
        data: employee
      });
    } catch (error) {
      console.error('Error in extendProbation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to extend probation'
      });
    }
  }

  /**
   * Terminate employee probation
   */
  static async terminateProbation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const employee = await EmployeeService.terminateProbation(id);

      res.status(200).json({
        success: true,
        message: 'Employee probation terminated successfully',
        data: employee
      });
    } catch (error) {
      console.error('Error in terminateProbation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to terminate probation'
      });
    }
  }

  /**
   * Update employee probation dates and duration
   */
  static async updateProbation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { probationStartDate, probationEndDate, probationDuration } = req.body;

      const employee = await EmployeeService.updateProbation(id, {
        probationStartDate,
        probationEndDate,
        probationDuration
      });

      res.status(200).json({
        success: true,
        message: 'Employee probation updated successfully',
        data: employee
      });
    } catch (error) {
      console.error('Error in updateProbation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update probation'
      });
    }
  }

  /**
   * Get employees with probation ending soon
   */
  static async getProbationEndingSoon(req: Request, res: Response): Promise<void> {
    try {
      const daysAhead = req.query.days ? parseInt(req.query.days as string, 10) : 7;
      
      const employees = await EmployeeService.getEmployeesWithProbationEndingSoon(daysAhead);

      res.status(200).json({
        success: true,
        message: 'Employees with probation ending soon retrieved successfully',
        data: employees
      });
    } catch (error) {
      console.error('Error in getProbationEndingSoon:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch employees with probation ending soon'
      });
    }
  }

  /**
   * Get employee edit history
   */
  static async getEmployeeEditHistory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee ID'
        };
        res.status(400).json(response);
        return;
      }

      const { AuditService } = await import('../../audit/services/auditService');
      const result = await AuditService.getAuditLogs({
        targetType: 'employee',
        targetId: id,
        action: 'update',
        page,
        limit
      });

      const response: ApiResponse = {
        success: true,
        message: 'Employee edit history retrieved successfully',
        data: result.logs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getEmployeeEditHistory:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve employee edit history',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Get paid and unpaid leave statistics for all employees
   */
  static async getPaidUnpaidLeaveStats(req: Request, res: Response): Promise<void> {
    try {
      const department = req.query.department as string | undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const employeeId = req.query.employeeId as string | undefined;

      const stats = await EmployeeService.getPaidUnpaidLeaveStats({
        department,
        year,
        employeeId
      });

      const response: ApiResponse = {
        success: true,
        message: 'Paid/unpaid leave statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPaidUnpaidLeaveStats:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve paid/unpaid leave statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }

  /**
   * Reset employee password (Admin only)
   */
  static async resetEmployeePassword(req: Request, res: Response): Promise<void> {
    try {
      const { employeeId } = req.params;
      const { newPassword } = req.body;
      const adminId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee ID'
        };
        res.status(400).json(response);
        return;
      }

      if (!newPassword || newPassword.length < 6) {
        const response: ApiResponse = {
          success: false,
          message: 'New password must be at least 6 characters long',
          error: 'Invalid password'
        };
        res.status(400).json(response);
        return;
      }

      // Check if employee exists
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: { id: true, email: true, name: true, role: true }
      });

      if (!employee) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee not found',
          error: 'Employee does not exist'
        };
        res.status(404).json(response);
        return;
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: employeeId },
        data: {
          passwordHash,
          updatedAt: new Date()
        }
      });

      // Log the action (you might want to create an audit log entry here)
      console.log(`Admin ${adminId} reset password for employee ${employeeId} (${employee.email})`);

      const response: ApiResponse = {
        success: true,
        message: 'Employee password has been reset successfully',
        data: {
          employeeId,
          email: employee.email,
          name: employee.name
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in resetEmployeePassword:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to reset employee password',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      res.status(500).json(response);
    }
  }
}
