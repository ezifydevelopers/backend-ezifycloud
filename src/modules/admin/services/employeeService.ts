import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { 
  Employee, 
  EmployeeFilters, 
  EmployeeListResponse, 
  PaginationInfo,
  LeaveBalance 
} from '../types';

const prisma = new PrismaClient();

export class EmployeeService {
  /**
   * Get all employees with filtering, sorting, and pagination
   */
  static async getEmployees(filters: EmployeeFilters): Promise<EmployeeListResponse> {
    try {
      const {
        search = '',
        department = '',
        role = '',
        status = 'all',
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (department && department !== 'all') {
        where.department = department;
      }

      if (role && role !== 'all') {
        where.role = role;
      }

      if (status !== 'all') {
        where.isActive = status === 'active';
      }

      // Get total count
      const totalCount = await prisma.user.count({ where });

      // Get employees with pagination
      const employees = await prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Transform employees to include additional data
      const transformedEmployees: Employee[] = await Promise.all(
        employees.map(async (emp) => {
          const leaveBalance = await this.getEmployeeLeaveBalance(emp.id);
          
          return {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            phone: undefined, // Not in schema
            department: emp.department || 'Unassigned',
            position: 'Employee', // Not in schema
            role: emp.role as 'admin' | 'manager' | 'employee',
            managerId: emp.managerId || undefined,
            managerName: emp.manager?.name,
            isActive: emp.isActive,
            joinDate: emp.createdAt,
            lastLogin: undefined, // Not in schema
            leaveBalance,
            avatar: emp.profilePicture || undefined,
            bio: undefined, // Not in schema
            skills: [], // Not in schema
            createdAt: emp.createdAt,
            updatedAt: emp.updatedAt
          };
        })
      );

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
        employees: transformedEmployees,
        pagination,
        filters,
        totalCount
      };
    } catch (error) {
      console.error('Error fetching employees:', error);
      throw new Error('Failed to fetch employees');
    }
  }

  /**
   * Get employee by ID
   */
  static async getEmployeeById(id: string): Promise<Employee | null> {
    try {
      const employee = await prisma.user.findUnique({
        where: { id },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!employee) {
        return null;
      }

      const leaveBalance = await this.getEmployeeLeaveBalance(employee.id);

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: undefined, // Not in schema
        department: employee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        role: employee.role as 'admin' | 'manager' | 'employee',
        managerId: employee.managerId || undefined,
        managerName: employee.manager?.name,
        isActive: employee.isActive,
        joinDate: employee.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: employee.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      };
    } catch (error) {
      console.error('Error fetching employee by ID:', error);
      throw new Error('Failed to fetch employee');
    }
  }

  /**
   * Create new employee
   */
  static async createEmployee(employeeData: {
    name: string;
    email: string;
    phone?: string;
    department: string;
    position: string;
    role: 'admin' | 'manager' | 'employee';
    managerId?: string;
    password: string;
    bio?: string;
    skills?: string[];
  }): Promise<Employee> {
    try {
      // Check if email already exists
      const existingEmployee = await prisma.user.findUnique({
        where: { email: employeeData.email }
      });

      if (existingEmployee) {
        throw new Error('Employee with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(employeeData.password, 12);

      // Create employee
      const employee = await prisma.user.create({
        data: {
          name: employeeData.name,
          email: employeeData.email,
          passwordHash: hashedPassword,
          role: employeeData.role,
          department: employeeData.department,
          managerId: employeeData.managerId,
          isActive: true
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      const leaveBalance = await this.getEmployeeLeaveBalance(employee.id);

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: undefined, // Not in schema
        department: employee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        role: employee.role as 'admin' | 'manager' | 'employee',
        managerId: employee.managerId || undefined,
        managerName: employee.manager?.name,
        isActive: employee.isActive,
        joinDate: employee.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: employee.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      };
    } catch (error) {
      console.error('Error creating employee:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to create employee');
    }
  }

  /**
   * Update employee
   */
  static async updateEmployee(id: string, updateData: {
    name?: string;
    email?: string;
    phone?: string;
    department?: string;
    position?: string;
    role?: 'admin' | 'manager' | 'employee';
    managerId?: string;
    bio?: string;
    skills?: string[];
  }): Promise<Employee> {
    try {
      // Check if employee exists
      const existingEmployee = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      // Check if email is being changed and if it already exists
      if (updateData.email && updateData.email !== existingEmployee.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email }
        });

        if (emailExists) {
          throw new Error('Employee with this email already exists');
        }
      }

      // Update employee
      const employee = await prisma.user.update({
        where: { id },
        data: {
          name: updateData.name,
          email: updateData.email,
          role: updateData.role,
          department: updateData.department,
          managerId: updateData.managerId
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      const leaveBalance = await this.getEmployeeLeaveBalance(employee.id);

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: undefined, // Not in schema
        department: employee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        role: employee.role as 'admin' | 'manager' | 'employee',
        managerId: employee.managerId || undefined,
        managerName: employee.manager?.name,
        isActive: employee.isActive,
        joinDate: employee.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: employee.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      };
    } catch (error) {
      console.error('Error updating employee:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update employee');
    }
  }

  /**
   * Delete employee
   */
  static async deleteEmployee(id: string): Promise<void> {
    try {
      // Check if employee exists
      const employee = await prisma.user.findUnique({
        where: { id }
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      // Check if employee has any leave requests
      const leaveRequests = await prisma.leaveRequest.count({
        where: { userId: id }
      });

      if (leaveRequests > 0) {
        throw new Error('Cannot delete employee with existing leave requests');
      }

      // Delete employee
      await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error deleting employee:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to delete employee');
    }
  }

  /**
   * Toggle employee status (active/inactive)
   */
  static async toggleEmployeeStatus(id: string, isActive: boolean): Promise<Employee> {
    try {
      const employee = await prisma.user.update({
        where: { id },
        data: { isActive },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      const leaveBalance = await this.getEmployeeLeaveBalance(employee.id);

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: undefined, // Not in schema
        department: employee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        role: employee.role as 'admin' | 'manager' | 'employee',
        managerId: employee.managerId || undefined,
        managerName: employee.manager?.name,
        isActive: employee.isActive,
        joinDate: employee.createdAt,
        lastLogin: undefined, // Not in schema
        leaveBalance,
        avatar: employee.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      };
    } catch (error) {
      console.error('Error toggling employee status:', error);
      throw new Error('Failed to toggle employee status');
    }
  }

  /**
   * Get employee leave balance
   */
  private static async getEmployeeLeaveBalance(employeeId: string): Promise<LeaveBalance> {
    try {
      const currentYear = new Date().getFullYear();
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: employeeId,
            year: currentYear
          }
        }
      });

      if (leaveBalance) {
        return {
          annual: leaveBalance.annualRemaining,
          sick: leaveBalance.sickRemaining,
          casual: leaveBalance.casualRemaining,
          emergency: 3 // Default emergency leave
        };
      }

      // Return default values if no balance record exists
      return {
        annual: 25,
        sick: 10,
        casual: 8,
        emergency: 3
      };
    } catch (error) {
      console.error('Error fetching leave balance:', error);
      return {
        annual: 0,
        sick: 0,
        casual: 0,
        emergency: 0
      };
    }
  }

  /**
   * Get departments list
   */
  static async getDepartments(): Promise<string[]> {
    try {
      const departments = await prisma.user.groupBy({
        by: ['department'],
        where: { 
          isActive: true,
          department: { not: null }
        },
        _count: {
          department: true
        }
      });

      return departments.map(dept => dept.department).filter(Boolean) as string[];
    } catch (error) {
      console.error('Error fetching departments:', error);
      return [];
    }
  }

  /**
   * Get managers list for dropdown
   */
  static async getManagers(): Promise<{ id: string; name: string; department: string }[]> {
    try {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['admin', 'manager'] },
          isActive: true,
          department: { not: null }
        },
        select: {
          id: true,
          name: true,
          department: true
        },
        orderBy: { name: 'asc' }
      });

      return managers.map(manager => ({
        id: manager.id,
        name: manager.name,
        department: manager.department || 'Unassigned'
      }));
    } catch (error) {
      console.error('Error fetching managers:', error);
      return [];
    }
  }
}