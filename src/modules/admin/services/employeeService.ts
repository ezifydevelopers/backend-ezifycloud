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
        probationStatus = 'all',
        employeeType = 'all',
        region = '',
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

      // Filter by probation status
      if (probationStatus && probationStatus !== 'all') {
        if (probationStatus === 'active') {
          where.probationStatus = 'active';
        } else if (probationStatus === 'completed') {
          where.probationStatus = 'completed';
        } else if (probationStatus === 'extended') {
          where.probationStatus = 'extended';
        } else if (probationStatus === 'terminated') {
          where.probationStatus = 'terminated';
        }
      }

      // Filter by employee type
      if (employeeType && employeeType !== 'all') {
        where.employeeType = employeeType;
      }

      // Filter by region
      if (region && region !== '') {
        where.region = region;
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
          const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(emp.id);
          
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
            probationStatus: emp.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
            probationStartDate: emp.probationStartDate,
            probationEndDate: emp.probationEndDate,
            probationDuration: emp.probationDuration,
            probationCompletedAt: emp.probationCompletedAt,
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
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
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

      const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(employee.id);

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
        probationStatus: employee.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
        probationStartDate: employee.probationStartDate,
        probationEndDate: employee.probationEndDate,
        probationDuration: employee.probationDuration,
        probationCompletedAt: employee.probationCompletedAt,
        employeeType: employee.employeeType as 'onshore' | 'offshore' | null,
        region: employee.region,
        timezone: employee.timezone,
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
    role: 'admin' | 'manager' | 'employee';
    managerId?: string;
    password: string;
    bio?: string;
    probationDuration?: number; // Duration in days (default: 90)
    startProbation?: boolean; // Whether to start probation immediately
    employeeType?: 'onshore' | 'offshore'; // Employee type for dashboard routing
    region?: string; // Region/country
    timezone?: string; // Timezone
  }): Promise<Employee> {
    try {
      console.log('🔍 EmployeeService: Creating employee with data:', employeeData);
      console.log('🔍 EmployeeService: Required fields check:', {
        name: !!employeeData.name,
        email: !!employeeData.email,
        department: !!employeeData.department,
        role: !!employeeData.role,
        password: !!employeeData.password
      });
      
      // Check if email already exists
      const existingEmployee = await prisma.user.findUnique({
        where: { email: employeeData.email }
      });

      if (existingEmployee) {
        throw new Error('Employee with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(employeeData.password, 12);

      // Auto-assign manager if not provided and role is employee
      let assignedManagerId = employeeData.managerId;
      if (!assignedManagerId && employeeData.role === 'employee' && employeeData.department) {
        const departmentManager = await prisma.user.findFirst({
          where: {
            role: 'manager',
            department: employeeData.department,
            isActive: true
          },
          select: { id: true, name: true }
        });
        assignedManagerId = departmentManager?.id || undefined;
        
        if (departmentManager) {
          console.log(`✅ Auto-assigned manager ${departmentManager.name} to new employee in ${employeeData.department} department`);
        } else {
          console.log(`⚠️ No manager found in ${employeeData.department} department for new employee`);
        }
      }

      // Create employee
      // Admins are auto-approved, employees/managers need approval
      const autoApprove = employeeData.role === 'admin';
      
      // Set up probation for employees (not admins/managers)
      const probationDuration = employeeData.probationDuration || 90; // Default 90 days
      const shouldStartProbation = employeeData.startProbation !== false && employeeData.role === 'employee';
      const probationStartDate = shouldStartProbation ? new Date() : null;
      const probationEndDate = shouldStartProbation 
        ? new Date(Date.now() + probationDuration * 24 * 60 * 60 * 1000)
        : null;
      
      const employee = await prisma.user.create({
        data: {
          name: employeeData.name,
          email: employeeData.email,
          passwordHash: hashedPassword,
          role: employeeData.role,
          department: employeeData.department,
          managerId: assignedManagerId,
          isActive: true,
          approvalStatus: autoApprove ? 'approved' : 'pending',
          probationStatus: shouldStartProbation ? 'active' : null,
          probationStartDate,
          probationEndDate,
          probationDuration: shouldStartProbation ? probationDuration : null,
          employeeType: employeeData.employeeType || null,
          region: employeeData.region || null,
          timezone: employeeData.timezone || null
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

      const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(employee.id);

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
        probationStatus: employee.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
        probationStartDate: employee.probationStartDate,
        probationEndDate: employee.probationEndDate,
        probationDuration: employee.probationDuration,
        probationCompletedAt: employee.probationCompletedAt,
        employeeType: employee.employeeType as 'onshore' | 'offshore' | null,
        region: employee.region,
        timezone: employee.timezone,
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
    avatar?: string;
    employeeType?: 'onshore' | 'offshore' | null;
    region?: string | null;
    timezone?: string | null;
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
          managerId: updateData.managerId,
          profilePicture: updateData.avatar || undefined,
          employeeType: updateData.employeeType !== undefined ? updateData.employeeType : undefined,
          region: updateData.region !== undefined ? updateData.region : undefined,
          timezone: updateData.timezone !== undefined ? updateData.timezone : undefined
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

      const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(employee.id);

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
        probationStatus: employee.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
        probationStartDate: employee.probationStartDate,
        probationEndDate: employee.probationEndDate,
        probationDuration: employee.probationDuration,
        probationCompletedAt: employee.probationCompletedAt,
        employeeType: employee.employeeType as 'onshore' | 'offshore' | null,
        region: employee.region,
        timezone: employee.timezone,
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
   * Delete employee (soft delete - marks as inactive)
   */
  static async deleteEmployee(id: string): Promise<{ success: boolean; message: string; employee?: any }> {
    try {
      console.log(`🔍 EmployeeService: Starting delete process for employee ID: ${id}`);
      
      // Check if employee exists
      const employee = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          role: true,
          department: true
        }
      });

      if (!employee) {
        console.log(`❌ EmployeeService: Employee not found with ID: ${id}`);
        return {
          success: false,
          message: 'Employee not found'
        };
      }

      if (!employee.isActive) {
        console.log(`⚠️ EmployeeService: Employee ${employee.name} is already deactivated`);
        return {
          success: false,
          message: 'Employee is already deactivated'
        };
      }

      // Check if employee has any pending leave requests
      const pendingLeaveRequests = await prisma.leaveRequest.count({
        where: { 
          userId: id,
          status: 'pending'
        }
      });

      if (pendingLeaveRequests > 0) {
        console.log(`❌ EmployeeService: Employee ${employee.name} has ${pendingLeaveRequests} pending leave requests`);
        return {
          success: false,
          message: `Cannot deactivate employee with ${pendingLeaveRequests} pending leave request(s). Please approve or reject pending requests first.`
        };
      }

      // Soft delete - mark as inactive instead of hard delete
      const updatedEmployee = await prisma.user.update({
        where: { id },
        data: { 
          isActive: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true
        }
      });

      console.log(`✅ EmployeeService: Employee ${employee.name} (${employee.email}) has been deactivated successfully`);
      
      return {
        success: true,
        message: `Employee ${employee.name} has been deactivated successfully`,
        employee: updatedEmployee
      };
    } catch (error) {
      console.error('❌ EmployeeService: Error deleting employee:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to deactivate employee'
      };
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

      const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(employee.id);

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
        probationStatus: employee.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
        probationStartDate: employee.probationStartDate,
        probationEndDate: employee.probationEndDate,
        probationDuration: employee.probationDuration,
        probationCompletedAt: employee.probationCompletedAt,
        employeeType: employee.employeeType as 'onshore' | 'offshore' | null,
        region: employee.region,
        timezone: employee.timezone,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      };
    } catch (error) {
      console.error('Error toggling employee status:', error);
      throw new Error('Failed to toggle employee status');
    }
  }

  /**
   * Bulk update employee status
   */
  static async bulkUpdateEmployeeStatus(
    employeeIds: string[],
    isActive: boolean
  ): Promise<{ updated: number; failed: number }> {
    try {
      let updated = 0;
      let failed = 0;

      for (const id of employeeIds) {
        try {
          await prisma.user.update({
            where: { id },
            data: { isActive }
          });
          updated++;
        } catch (error) {
          console.error(`Error updating employee ${id}:`, error);
          failed++;
        }
      }

      return { updated, failed };
    } catch (error) {
      console.error('Error bulk updating employee status:', error);
      throw new Error('Failed to bulk update employee status');
    }
  }

  /**
   * Bulk delete employees (soft delete - marks as inactive)
   */
  static async bulkDeleteEmployees(employeeIds: string[]): Promise<{ deleted: number; failed: number }> {
    try {
      let deleted = 0;
      let failed = 0;

      for (const id of employeeIds) {
        try {
          // Check if employee exists
          const employee = await prisma.user.findUnique({
            where: { id }
          });

          if (!employee) {
            console.error(`Employee ${id} not found`);
            failed++;
            continue;
          }

          // Check if employee has any pending leave requests
          const pendingLeaveRequests = await prisma.leaveRequest.count({
            where: { 
              userId: id,
              status: 'pending'
            }
          });

          if (pendingLeaveRequests > 0) {
            console.error(`Employee ${employee.name} has pending leave requests, skipping deactivation`);
            failed++;
            continue;
          }

          // Soft delete - mark as inactive instead of hard delete
          await prisma.user.update({
            where: { id },
            data: { 
              isActive: false
            }
          });

          console.log(`Employee ${employee.name} (${employee.email}) has been deactivated`);
          deleted++;
        } catch (error) {
          console.error(`Error deactivating employee ${id}:`, error);
          failed++;
        }
      }

      return { deleted, failed };
    } catch (error) {
      console.error('Error bulk deactivating employees:', error);
      throw new Error('Failed to bulk deactivate employees');
    }
  }

  /**
   * Bulk update employee department
   */
  static async bulkUpdateEmployeeDepartment(
    employeeIds: string[],
    department: string
  ): Promise<{ updated: number; failed: number }> {
    try {
      let updated = 0;
      let failed = 0;

      for (const id of employeeIds) {
        try {
          await prisma.user.update({
            where: { id },
            data: { department }
          });
          updated++;
        } catch (error) {
          console.error(`Error updating employee ${id}:`, error);
          failed++;
        }
      }

      return { updated, failed };
    } catch (error) {
      console.error('Error bulk updating employee department:', error);
      throw new Error('Failed to bulk update employee department');
    }
  }

  /**
   * Export employees to CSV
   */
  static async exportEmployeesToCSV(): Promise<string> {
    try {
      const employees = await prisma.user.findMany({
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // CSV headers
      const headers = [
        'ID',
        'Name',
        'Email',
        'Phone',
        'Department',
        'Role',
        'Manager',
        'Status',
        'Join Date',
        'Last Updated'
      ];

      // CSV rows
      const rows = employees.map(employee => [
        employee.id,
        employee.name,
        employee.email,
        (employee as any).phone || '',
        employee.department || '',
        employee.role,
        employee.manager?.name || '',
        employee.isActive ? 'Active' : 'Inactive',
        employee.createdAt.toISOString().split('T')[0],
        employee.updatedAt.toISOString().split('T')[0]
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return csvContent;
    } catch (error) {
      console.error('Error exporting employees to CSV:', error);
      throw new Error('Failed to export employees to CSV');
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

  /**
   * Get comprehensive employee leave balance for admin view
   */
  public static async getEmployeeLeaveBalance(employeeId: string, year?: string): Promise<any> {
    try {
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      console.log('🔍 EmployeeService: getEmployeeLeaveBalance called with:', { employeeId, year, currentYear });
      
      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          name: true,
          email: true,
          department: true
        }
      });

      console.log('🔍 EmployeeService: User found:', user);

      if (!user) {
        throw new Error('User not found');
      }

      // Get leave balance from database
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: employeeId,
            year: currentYear
          }
        }
      });

      // Get active leave policies from database
      const leavePolicies = await prisma.leavePolicy.findMany({
        where: {
          isActive: true
        },
        select: {
          leaveType: true,
          totalDaysPerYear: true
        }
      });

      // Create a map of leave types to their max days
      const policyMap = new Map<string, number>();
      leavePolicies.forEach(policy => {
        policyMap.set(policy.leaveType, policy.totalDaysPerYear);
      });

      // Get all leave requests for the year (both approved and pending)
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);
      
      const allRequests = await prisma.leaveRequest.findMany({
        where: {
          userId: employeeId,
          submittedAt: { gte: startDate, lte: endDate }
        },
        select: {
          leaveType: true,
          totalDays: true,
          status: true
        }
      });

      // Calculate used days from approved requests and pending days by leave type
      const usedDays: { [key: string]: number } = {};
      const pendingDays: { [key: string]: number } = {};
      
      console.log('🔍 EmployeeService: Processing leave requests:', allRequests.length);
      
      allRequests.forEach(request => {
        const days = Number(request.totalDays);
        console.log(`🔍 EmployeeService: Request - Type: ${request.leaveType}, Days: ${days}, Status: ${request.status}`);
        
        if (request.status === 'approved') {
          usedDays[request.leaveType] = (usedDays[request.leaveType] || 0) + days;
        } else if (request.status === 'pending') {
          pendingDays[request.leaveType] = (pendingDays[request.leaveType] || 0) + days;
        }
      });
      
      console.log('🔍 EmployeeService: Calculated used days:', usedDays);
      console.log('🔍 EmployeeService: Calculated pending days:', pendingDays);

      // Dynamically build leave balance based ONLY on active policies
      const dynamicLeaveBalance: { [key: string]: any } = {};
      let totalDays = 0;
      let totalUsedDays = 0;
      let totalRemainingDays = 0;
      let totalPendingDays = 0;

      // Only process leave types that have active policies
      for (const [leaveType, totalFromPolicy] of policyMap) {
        const used = usedDays[leaveType] || 0; // Use calculated used days from approved requests
        const pending = pendingDays[leaveType] || 0;
        
        // Calculate remaining days accounting for pending requests
        const actualRemaining = Math.max(0, totalFromPolicy - used - pending);
        
        // Use the policy total as the authoritative source
        dynamicLeaveBalance[leaveType] = {
          total: totalFromPolicy, // Always use policy total
          used: used, // Use calculated used days from approved requests
          remaining: actualRemaining, // Total - Used - Pending
          pending: pending,
          utilizationRate: totalFromPolicy > 0 ? (used / totalFromPolicy) * 100 : 0
        };

        totalDays += totalFromPolicy;
        totalUsedDays += used;
        totalRemainingDays += actualRemaining;
        totalPendingDays += pending;
      }

      const total = {
        totalDays,
        usedDays: totalUsedDays,
        remainingDays: totalRemainingDays,
        pendingDays: totalPendingDays,
        overallUtilization: totalDays > 0 ? (totalUsedDays / totalDays) * 100 : 0
      };

      // Return the comprehensive leave balance data
      const result = {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        department: user.department || 'Unassigned',
        leaveBalance: dynamicLeaveBalance,
        total
      };
      
      console.log('🔍 EmployeeService: Returning result:', result);
      return result;
    } catch (error) {
      console.error('❌ EmployeeService: Error fetching employee leave balance:', error);
      throw new Error('Failed to fetch employee leave balance');
    }
  }

  /**
   * Manually adjust employee leave balance (Admin/Manager only)
   * This allows authorized personnel to add additional leave days beyond the policy limit
   */
  public static async adjustEmployeeLeaveBalance(
    employeeId: string,
    leaveType: string,
    additionalDays: number,
    reason: string,
    adjustedBy: string,
    year?: number
  ): Promise<any> {
    try {
      const currentYear = year || new Date().getFullYear();
      
      // Validate leave type
      const policy = await prisma.leavePolicy.findUnique({
        where: { leaveType }
      });

      if (!policy) {
        throw new Error(`No leave policy found for ${leaveType} leave`);
      }

      // Get or create leave balance
      let leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: employeeId,
            year: currentYear
          }
        }
      });

      if (!leaveBalance) {
        // Create new leave balance record
        leaveBalance = await prisma.leaveBalance.create({
          data: {
            userId: employeeId,
            year: currentYear,
            annualTotal: 25,
            annualUsed: 0,
            annualRemaining: 25,
            sickTotal: 10,
            sickUsed: 0,
            sickRemaining: 10,
            casualTotal: 8,
            casualUsed: 0,
            casualRemaining: 8,
            maternityTotal: 90,
            maternityUsed: 0,
            maternityRemaining: 90,
            paternityTotal: 15,
            paternityUsed: 0,
            paternityRemaining: 15,
            emergencyTotal: 5,
            emergencyUsed: 0,
            emergencyRemaining: 5
          }
        });
      }

      // Map leave type to balance field
      const balanceFieldMap: { [key: string]: { total: string; remaining: string } } = {
        'annual': { total: 'annualTotal', remaining: 'annualRemaining' },
        'sick': { total: 'sickTotal', remaining: 'sickRemaining' },
        'casual': { total: 'casualTotal', remaining: 'casualRemaining' },
        'maternity': { total: 'maternityTotal', remaining: 'maternityRemaining' },
        'paternity': { total: 'paternityTotal', remaining: 'paternityRemaining' },
        'emergency': { total: 'emergencyTotal', remaining: 'emergencyRemaining' }
      };

      const fields = balanceFieldMap[leaveType];
      if (!fields) {
        throw new Error(`Invalid leave type: ${leaveType}`);
      }

      // Update leave balance - add additional days to total and remaining
      const currentTotal = (leaveBalance as any)[fields.total];
      const currentRemaining = (leaveBalance as any)[fields.remaining];
      
      const updatedBalance = await prisma.leaveBalance.update({
        where: {
          userId_year: {
            userId: employeeId,
            year: currentYear
          }
        },
        data: {
          [fields.total]: currentTotal + additionalDays,
          [fields.remaining]: currentRemaining + additionalDays
        }
      });

      // Get admin user name for audit log
      const adminUser = await prisma.user.findUnique({
        where: { id: adjustedBy },
        select: { name: true }
      });

      // Create audit log entry for the adjustment
      await prisma.auditLog.create({
        data: {
          userId: adjustedBy,
          userName: adminUser?.name || 'System',
          action: 'ADJUST_LEAVE_BALANCE',
          targetId: employeeId,
          targetType: 'user',
          details: {
            leaveType,
            additionalDays,
            reason,
            previousTotal: currentTotal,
            newTotal: currentTotal + additionalDays,
            previousRemaining: currentRemaining,
            newRemaining: currentRemaining + additionalDays,
            year: currentYear
          } as any
        }
      });

      return {
        success: true,
        message: `Successfully added ${additionalDays} ${leaveType} leave days`,
        leaveBalance: updatedBalance
      };
    } catch (error) {
      console.error('Error adjusting employee leave balance:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to adjust employee leave balance');
    }
  }

  /**
   * Complete employee probation
   */
  static async completeProbation(employeeId: string): Promise<Employee> {
    try {
      const employee = await prisma.user.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      if (employee.probationStatus !== 'active' && employee.probationStatus !== 'extended') {
        throw new Error('Employee is not in active probation');
      }

      const updatedEmployee = await prisma.user.update({
        where: { id: employeeId },
        data: {
          probationStatus: 'completed',
          probationCompletedAt: new Date()
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

      const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(updatedEmployee.id);

      return {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: undefined,
        department: updatedEmployee.department || 'Unassigned',
        position: 'Employee',
        role: updatedEmployee.role as 'admin' | 'manager' | 'employee',
        managerId: updatedEmployee.managerId || undefined,
        managerName: updatedEmployee.manager?.name,
        isActive: updatedEmployee.isActive,
        joinDate: updatedEmployee.createdAt,
        lastLogin: undefined,
        leaveBalance,
        avatar: updatedEmployee.profilePicture || undefined,
        bio: undefined,
        probationStatus: updatedEmployee.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
        probationStartDate: updatedEmployee.probationStartDate,
        probationEndDate: updatedEmployee.probationEndDate,
        probationDuration: updatedEmployee.probationDuration,
        probationCompletedAt: updatedEmployee.probationCompletedAt,
        employeeType: updatedEmployee.employeeType as 'onshore' | 'offshore' | null,
        region: updatedEmployee.region,
        timezone: updatedEmployee.timezone,
        createdAt: updatedEmployee.createdAt,
        updatedAt: updatedEmployee.updatedAt
      };
    } catch (error) {
      console.error('Error completing probation:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to complete probation');
    }
  }

  /**
   * Extend employee probation
   */
  static async extendProbation(employeeId: string, additionalDays: number): Promise<Employee> {
    try {
      const employee = await prisma.user.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      if (employee.probationStatus !== 'active' && employee.probationStatus !== 'extended') {
        throw new Error('Employee is not in active probation');
      }

      const currentEndDate = employee.probationEndDate || new Date();
      const newEndDate = new Date(currentEndDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);
      const newDuration = (employee.probationDuration || 0) + additionalDays;

      const updatedEmployee = await prisma.user.update({
        where: { id: employeeId },
        data: {
          probationStatus: 'extended',
          probationEndDate: newEndDate,
          probationDuration: newDuration
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

      const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(updatedEmployee.id);

      return {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: undefined,
        department: updatedEmployee.department || 'Unassigned',
        position: 'Employee',
        role: updatedEmployee.role as 'admin' | 'manager' | 'employee',
        managerId: updatedEmployee.managerId || undefined,
        managerName: updatedEmployee.manager?.name,
        isActive: updatedEmployee.isActive,
        joinDate: updatedEmployee.createdAt,
        lastLogin: undefined,
        leaveBalance,
        avatar: updatedEmployee.profilePicture || undefined,
        bio: undefined,
        probationStatus: updatedEmployee.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
        probationStartDate: updatedEmployee.probationStartDate,
        probationEndDate: updatedEmployee.probationEndDate,
        probationDuration: updatedEmployee.probationDuration,
        probationCompletedAt: updatedEmployee.probationCompletedAt,
        employeeType: updatedEmployee.employeeType as 'onshore' | 'offshore' | null,
        region: updatedEmployee.region,
        timezone: updatedEmployee.timezone,
        createdAt: updatedEmployee.createdAt,
        updatedAt: updatedEmployee.updatedAt
      };
    } catch (error) {
      console.error('Error extending probation:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to extend probation');
    }
  }

  /**
   * Terminate employee probation (employee terminated during probation)
   */
  static async terminateProbation(employeeId: string): Promise<Employee> {
    try {
      const employee = await prisma.user.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      const updatedEmployee = await prisma.user.update({
        where: { id: employeeId },
        data: {
          probationStatus: 'terminated',
          isActive: false
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

      const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(updatedEmployee.id);

      return {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: undefined,
        department: updatedEmployee.department || 'Unassigned',
        position: 'Employee',
        role: updatedEmployee.role as 'admin' | 'manager' | 'employee',
        managerId: updatedEmployee.managerId || undefined,
        managerName: updatedEmployee.manager?.name,
        isActive: updatedEmployee.isActive,
        joinDate: updatedEmployee.createdAt,
        lastLogin: undefined,
        leaveBalance,
        avatar: updatedEmployee.profilePicture || undefined,
        bio: undefined,
        probationStatus: updatedEmployee.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
        probationStartDate: updatedEmployee.probationStartDate,
        probationEndDate: updatedEmployee.probationEndDate,
        probationDuration: updatedEmployee.probationDuration,
        probationCompletedAt: updatedEmployee.probationCompletedAt,
        employeeType: updatedEmployee.employeeType as 'onshore' | 'offshore' | null,
        region: updatedEmployee.region,
        timezone: updatedEmployee.timezone,
        createdAt: updatedEmployee.createdAt,
        updatedAt: updatedEmployee.updatedAt
      };
    } catch (error) {
      console.error('Error terminating probation:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to terminate probation');
    }
  }
}