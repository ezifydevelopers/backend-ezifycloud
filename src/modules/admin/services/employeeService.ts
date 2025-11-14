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
            joinDate: emp.joinDate || emp.createdAt,
            lastLogin: undefined, // Not in schema
            leaveBalance,
            avatar: emp.profilePicture || undefined,
            bio: undefined, // Not in schema
            probationStatus: emp.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
            probationStartDate: emp.probationStartDate,
            probationEndDate: emp.probationEndDate,
            probationDuration: emp.probationDuration,
            probationCompletedAt: emp.probationCompletedAt,
            employeeType: emp.employeeType as 'onshore' | 'offshore' | null,
            region: emp.region || null,
            timezone: emp.timezone || null,
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
      
      // Set up probation for employees (not admins/managers) based on joinDate
      // If joinDate is provided, use it; otherwise use current date
      const joinDate = (employeeData as any).joinDate 
        ? new Date((employeeData as any).joinDate) 
        : new Date();
      
      // Get default probation duration from SystemConfig if not provided
      let defaultProbationDuration = 90; // Default fallback
      if (!employeeData.probationDuration) {
        try {
          const probationConfig = await prisma.systemConfig.findUnique({
            where: { key: 'defaultProbationDuration' }
          });
          if (probationConfig) {
            defaultProbationDuration = parseInt(probationConfig.value, 10) || 90;
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch default probation duration from SystemConfig, using default 90 days');
        }
      }
      
      const probationDuration = employeeData.probationDuration || defaultProbationDuration;
      const shouldStartProbation = employeeData.startProbation !== false && employeeData.role === 'employee';
      const probationStartDate = shouldStartProbation ? joinDate : null;
      const probationEndDate = shouldStartProbation 
        ? new Date(joinDate.getTime() + probationDuration * 24 * 60 * 60 * 1000)
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
          joinDate: joinDate,
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
    joinDate?: Date | string | null;
    probationStatus?: 'active' | 'completed' | 'extended' | 'terminated' | null;
  }, editedBy?: { userId: string; userName: string; ipAddress?: string; userAgent?: string }): Promise<Employee> {
    try {
      // Check if employee exists
      const existingEmployee = await prisma.user.findUnique({
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

      // Track field changes for audit log
      const fieldChanges: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
      const oldData: Record<string, unknown> = {};
      const newData: Record<string, unknown> = {};

      // Compare and track changes
      const fieldsToTrack: Array<{ key: keyof typeof updateData; dbKey: string }> = [
        { key: 'name', dbKey: 'name' },
        { key: 'email', dbKey: 'email' },
        { key: 'phone', dbKey: 'phone' },
        { key: 'department', dbKey: 'department' },
        { key: 'role', dbKey: 'role' },
        { key: 'managerId', dbKey: 'managerId' },
        { key: 'avatar', dbKey: 'profilePicture' },
        { key: 'employeeType', dbKey: 'employeeType' },
        { key: 'region', dbKey: 'region' },
        { key: 'timezone', dbKey: 'timezone' },
        { key: 'joinDate', dbKey: 'joinDate' },
        { key: 'probationStatus', dbKey: 'probationStatus' },
      ];

      fieldsToTrack.forEach(({ key, dbKey }) => {
        if (updateData[key] !== undefined) {
          const oldValue = key === 'avatar' ? existingEmployee.profilePicture : existingEmployee[dbKey as keyof typeof existingEmployee];
          let newValue: unknown;
          
          if (key === 'avatar') {
            newValue = updateData.avatar;
          } else if (key === 'joinDate') {
            // Convert joinDate to Date for comparison
            const oldDate = oldValue ? new Date(oldValue as Date).toISOString().split('T')[0] : null;
            const newDate = updateData.joinDate ? new Date(updateData.joinDate).toISOString().split('T')[0] : null;
            newValue = newDate;
            // Only track if date actually changed
            if (oldDate !== newDate) {
              fieldChanges.push({
                field: dbKey,
                oldValue: oldDate,
                newValue: newDate
              });
              oldData[dbKey] = oldDate;
              newData[dbKey] = newDate;
            }
            return; // Skip the default comparison for joinDate
          } else {
            newValue = updateData[key];
          }
          
          // Only track if value actually changed
          if (oldValue !== newValue) {
            fieldChanges.push({
              field: dbKey,
              oldValue: oldValue ?? null,
              newValue: newValue ?? null
            });
            oldData[dbKey] = oldValue ?? null;
            newData[dbKey] = newValue ?? null;
          }
        }
      });

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
          timezone: updateData.timezone !== undefined ? updateData.timezone : undefined,
          joinDate: updateData.joinDate !== undefined ? (updateData.joinDate ? new Date(updateData.joinDate) : null) : undefined,
          probationStatus: updateData.probationStatus !== undefined ? updateData.probationStatus : undefined
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

      // Log changes to audit log if there are any changes and editor info is provided
      if (fieldChanges.length > 0 && editedBy) {
        try {
          const { AuditService } = await import('../../audit/services/auditService');
          await AuditService.logUpdate(
            editedBy.userId,
            editedBy.userName,
            'employee',
            id,
            fieldChanges,
            oldData,
            newData,
            {
              ipAddress: editedBy.ipAddress,
              userAgent: editedBy.userAgent,
              requestMethod: 'PUT',
              requestPath: `/admin/employees/${id}`
            }
          );
        } catch (auditError) {
          console.error('Failed to log employee update to audit log:', auditError);
          // Don't throw - audit logging failure shouldn't break the update
        }
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
   * Permanently delete employee from database (hard delete)
   * WARNING: This will permanently remove all employee data including leave requests, balances, etc.
   */
  static async permanentlyDeleteEmployee(id: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔍 EmployeeService: Starting permanent delete process for employee ID: ${id}`);
      
      // Check if employee exists
      const employee = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      });

      if (!employee) {
        console.log(`❌ EmployeeService: Employee not found with ID: ${id}`);
        return {
          success: false,
          message: 'Employee not found'
        };
      }

      // Prevent deleting admin users
      if (employee.role === 'admin') {
        console.log(`❌ EmployeeService: Cannot delete admin user: ${employee.name}`);
        return {
          success: false,
          message: 'Cannot permanently delete admin users. Please deactivate them instead.'
        };
      }

      // Use a transaction to ensure all deletions succeed or none do
      await prisma.$transaction(async (tx) => {
        // 1. Delete leave requests (and related documents, salary deductions)
        await tx.leaveRequest.deleteMany({
          where: { userId: id }
        });

        // 2. Delete leave balances
        await tx.leaveBalance.deleteMany({
          where: { userId: id }
        });

        // 3. Delete leave accruals (has cascade, but being explicit)
        await tx.leaveAccrual.deleteMany({
          where: { userId: id }
        });

        // 4. Delete attendance records
        await tx.attendanceRecord.deleteMany({
          where: { userId: id }
        });

        // 5. Delete salary records
        await tx.monthlySalary.deleteMany({
          where: { userId: id }
        });
        await tx.employeeSalary.deleteMany({
          where: { userId: id }
        });

        // 6. Update subordinates to remove manager reference
        await tx.user.updateMany({
          where: { managerId: id },
          data: { managerId: null }
        });

        // 7. Update leave requests where this user was the approver
        await tx.leaveRequest.updateMany({
          where: { approvedBy: id },
          data: { approvedBy: null }
        });

        // 8. Update monthly salaries where this user was the approver
        await tx.monthlySalary.updateMany({
          where: { approvedBy: id },
          data: { approvedBy: null }
        });

        // 9. Delete workspace memberships
        await tx.workspaceMember.deleteMany({
          where: { userId: id }
        });

        // 10. Delete workspace invites
        await tx.workspaceInvite.deleteMany({
          where: { 
            OR: [
              { invitedBy: id },
              { email: employee.email }
            ]
          }
        });

        // 11. Delete board memberships
        await tx.boardMember.deleteMany({
          where: { userId: id }
        });

        // 12. Delete comments created by user (and related files will cascade)
        // First delete comment files uploaded by user
        await tx.commentFile.deleteMany({
          where: { uploadedBy: id }
        });
        // Delete comments created by user
        await tx.comment.deleteMany({
          where: { userId: id }
        });
        // Update comments resolved by user (resolvedBy is nullable)
        await tx.comment.updateMany({
          where: { resolvedBy: id },
          data: { resolvedBy: null }
        });

        // 13. Delete item files uploaded by user
        await tx.itemFile.deleteMany({
          where: { uploadedBy: id }
        });

        // 14. Delete items created by user (createdBy is not nullable, so we must delete)
        await tx.item.deleteMany({
          where: { createdBy: id }
        });

        // 15. Delete activities
        await tx.activity.deleteMany({
          where: { userId: id }
        });

        // 16. Delete approvals
        await tx.approval.deleteMany({
          where: { approverId: id }
        });

        // 17. Delete dashboards, reports, templates, boards, columns created by user
        // (createdBy is not nullable, so we must delete these records)
        await tx.dashboard.deleteMany({
          where: { createdBy: id }
        });
        await tx.report.deleteMany({
          where: { createdBy: id }
        });
        await tx.boardTemplate.deleteMany({
          where: { createdBy: id }
        });
        await tx.invoiceTemplate.deleteMany({
          where: { createdBy: id }
        });
        await tx.board.deleteMany({
          where: { createdBy: id }
        });
        await tx.column.deleteMany({
          where: { createdBy: id }
        });

        // 18. Delete notifications
        await tx.notification.deleteMany({
          where: { userId: id }
        });

        // 19. Delete audit logs (optional - you might want to keep these for compliance)
        // Uncomment if you want to delete audit logs
        // await tx.auditLog.deleteMany({
        //   where: { userId: id }
        // });

        // 20. Finally, delete the user
        await tx.user.delete({
          where: { id }
        });
      });

      console.log(`✅ EmployeeService: Employee ${employee.name} (${employee.email}) has been permanently deleted from database`);
      
      return {
        success: true,
        message: `Employee ${employee.name} has been permanently deleted from the database. All associated data has been removed.`
      };
    } catch (error) {
      console.error('❌ EmployeeService: Error permanently deleting employee:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to permanently delete employee'
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
   * Now calculates based on daily accrual: (totalDaysPerYear / 365) * daysServed
   * Leaves accrue day by day from the join date
   */
  public static async getEmployeeLeaveBalance(employeeId: string, year?: string): Promise<any> {
    try {
      const currentYear = year ? parseInt(year) : new Date().getFullYear();
      console.log('🔍 EmployeeService: getEmployeeLeaveBalance called with:', { employeeId, year, currentYear });
      
      // Get user information including joinDate and employeeType
      const user = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          id: true,
          name: true,
          email: true,
          department: true,
          joinDate: true,
          createdAt: true,
          employeeType: true
        }
      });

      console.log('🔍 EmployeeService: User found:', user);

      if (!user) {
        throw new Error('User not found');
      }

      // Calculate days served based on join date (for daily accrual)
      const joinDate = user.joinDate ? new Date(user.joinDate) : new Date(user.createdAt);
      const currentDate = new Date();
      const daysServed = this.calculateDaysServed(joinDate, currentDate);
      console.log('🔍 EmployeeService: Days served:', daysServed);

      // Get leave balance from database
      const leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId: employeeId,
            year: currentYear
          }
        }
      });

      // Get active leave policies from database filtered by employeeType
      // IMPORTANT: Strictly filter by employeeType - no fallback to null policies
      // Employees should ONLY see policies that match their employeeType (onshore/offshore)
      let leavePolicies;
      try {
        const whereClause: any = {
          isActive: true
        };
        
        if (user.employeeType) {
          // Show only policies with exact employeeType match
          whereClause.employeeType = user.employeeType;
          console.log('🔍 Admin getEmployeeLeaveBalance: Filtering by employeeType:', user.employeeType, '(exact match only, no fallback)');
        } else {
          // If employee has no employeeType, return empty (they need to be assigned an employeeType)
          whereClause.employeeType = '__NO_TYPE__'; // This will return no results
          console.log('⚠️ Admin getEmployeeLeaveBalance: Employee has no employeeType, returning empty result. Employee needs to be assigned an employeeType.');
        }
        
        leavePolicies = await prisma.leavePolicy.findMany({
          where: whereClause as any,
          select: {
            leaveType: true,
            totalDaysPerYear: true,
            employeeType: true
          } as any
        });
      } catch (error: any) {
        // Fallback: if employeeType column doesn't exist yet, get all active policies
        console.warn('⚠️ employeeType column not found, using all active policies. Please apply migration.');
        leavePolicies = await prisma.leavePolicy.findMany({
          where: { isActive: true },
          select: {
            leaveType: true,
            totalDaysPerYear: true
          }
        });
      }

      // Create a map of leave types to their tenure-based max days
      // Calculate tenure-based total: (totalDaysPerYear / 365) * daysServed (daily accrual)
      const policyMap = new Map<string, number>();
      leavePolicies.forEach(policy => {
        const dailyAccrual = policy.totalDaysPerYear / 365; // Daily accrual rate
        const tenureBasedTotal = Math.round(dailyAccrual * daysServed * 100) / 100; // Round to 2 decimal places
        policyMap.set(policy.leaveType, tenureBasedTotal);
        console.log(`🔍 EmployeeService: ${policy.leaveType} - Policy: ${policy.totalDaysPerYear} days/year, Days served: ${daysServed}, Accrued: ${tenureBasedTotal} days`);
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
      
      // Get employee info to filter by employeeType
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: { employeeType: true }
      });

      // Validate leave type - find policy matching employeeType or generic (null)
      const policy = await prisma.leavePolicy.findFirst({
        where: {
          leaveType,
          OR: [
            { employeeType: employee?.employeeType },
            { employeeType: null }
          ],
          isActive: true
        },
        orderBy: [
          // Prefer specific policy over generic (null) policy
          { employeeType: 'asc' }
        ]
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

  /**
   * Update employee probation dates and duration
   */
  static async updateProbation(
    employeeId: string,
    updateData: {
      probationStartDate?: Date | string;
      probationEndDate?: Date | string;
      probationDuration?: number;
    }
  ): Promise<Employee> {
    try {
      const employee = await prisma.user.findUnique({
        where: { id: employeeId }
      });

      if (!employee) {
        throw new Error('Employee not found');
      }

      const updateFields: any = {};
      
      if (updateData.probationStartDate) {
        updateFields.probationStartDate = new Date(updateData.probationStartDate);
      }
      
      if (updateData.probationEndDate) {
        updateFields.probationEndDate = new Date(updateData.probationEndDate);
      }
      
      if (updateData.probationDuration !== undefined) {
        updateFields.probationDuration = updateData.probationDuration;
        // If start date exists but end date doesn't, recalculate end date
        if (updateFields.probationStartDate && !updateData.probationEndDate) {
          const startDate = updateFields.probationStartDate || employee.probationStartDate;
          if (startDate) {
            updateFields.probationEndDate = new Date(
              new Date(startDate).getTime() + updateData.probationDuration * 24 * 60 * 60 * 1000
            );
          }
        }
      }

      const updatedEmployee = await prisma.user.update({
        where: { id: employeeId },
        data: updateFields,
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
        joinDate: updatedEmployee.joinDate || updatedEmployee.createdAt,
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
      console.error('Error updating probation:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update probation');
    }
  }

  /**
   * Get employees with probation ending soon (within specified days)
   */
  static async getEmployeesWithProbationEndingSoon(daysAhead: number = 7): Promise<Employee[]> {
    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
      
      const employees = await prisma.user.findMany({
        where: {
          role: 'employee',
          probationStatus: {
            in: ['active', 'extended']
          },
          probationEndDate: {
            gte: today,
            lte: futureDate
          },
          isActive: true
        },
        include: {
          manager: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          probationEndDate: 'asc'
        }
      });

      const employeesWithBalance = await Promise.all(
        employees.map(async (emp) => {
          const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(emp.id);
          
          return {
            id: emp.id,
            name: emp.name,
            email: emp.email,
            phone: undefined,
            department: emp.department || 'Unassigned',
            position: 'Employee',
            role: emp.role as 'admin' | 'manager' | 'employee',
            managerId: emp.managerId || undefined,
            managerName: emp.manager?.name,
            isActive: emp.isActive,
            joinDate: emp.joinDate || emp.createdAt,
            lastLogin: undefined,
            leaveBalance,
            avatar: emp.profilePicture || undefined,
            bio: undefined,
            probationStatus: emp.probationStatus as 'active' | 'completed' | 'extended' | 'terminated' | null,
            probationStartDate: emp.probationStartDate,
            probationEndDate: emp.probationEndDate,
            probationDuration: emp.probationDuration,
            probationCompletedAt: emp.probationCompletedAt,
            employeeType: emp.employeeType as 'onshore' | 'offshore' | null,
            region: emp.region,
            timezone: emp.timezone,
            createdAt: emp.createdAt,
            updatedAt: emp.updatedAt
          };
        })
      );

      return employeesWithBalance;
    } catch (error) {
      console.error('Error fetching employees with probation ending soon:', error);
      throw new Error('Failed to fetch employees with probation ending soon');
    }
  }

  /**
   * Get paid and unpaid leave statistics for all employees
   */
  static async getPaidUnpaidLeaveStats(filters?: {
    department?: string;
    year?: number;
    employeeId?: string;
  }): Promise<Array<{
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    department: string | null;
    totalPaidDays: number;
    totalUnpaidDays: number;
    totalDays: number;
    byLeaveType: Array<{
      leaveType: string;
      paidDays: number;
      unpaidDays: number;
      totalDays: number;
    }>;
    leaveRequests: Array<{
      id: string;
      leaveType: string;
      startDate: Date;
      endDate: Date;
      totalDays: number;
      isPaid: boolean;
      status: string;
      submittedAt: Date;
    }>;
  }>> {
    try {
      const year = filters?.year || new Date().getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);

      // Build where clause - get ALL approved leaves for employees
      // We'll filter by year when calculating paid/unpaid days, but include all leaves in the response
      // This ensures all approved leaves are visible in the UI, even if they're outside the selected year
      const whereClause: any = {
        status: 'approved'
      };

      if (filters?.employeeId) {
        whereClause.userId = filters.employeeId;
      }

      // Get all approved leave requests for the year (based on actual leave dates)
      console.log('🔍 getPaidUnpaidLeaveStats: Query filters:', {
        year,
        startOfYear: startOfYear.toISOString(),
        endOfYear: endOfYear.toISOString(),
        whereClause: JSON.stringify(whereClause, null, 2)
      });
      
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              probationStatus: true,
              probationStartDate: true,
              probationEndDate: true,
              joinDate: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          startDate: 'desc'
        }
      });

      console.log('🔍 getPaidUnpaidLeaveStats: Found', leaveRequests.length, 'approved leave requests');
      if (leaveRequests.length > 0) {
        console.log('🔍 getPaidUnpaidLeaveStats: Sample requests:', leaveRequests.slice(0, 3).map(r => ({
          id: r.id,
          userId: r.userId,
          leaveType: r.leaveType,
          startDate: r.startDate,
          endDate: r.endDate,
          status: r.status,
          employeeName: r.user.name
        })));
      }

      // Filter by department if specified
      let filteredRequests = leaveRequests;
      if (filters?.department && filters.department !== 'all') {
        const beforeFilter = filteredRequests.length;
        filteredRequests = leaveRequests.filter(req => req.user.department === filters.department);
        console.log('🔍 getPaidUnpaidLeaveStats: Filtered by department', filters.department, ':', beforeFilter, '->', filteredRequests.length);
      }

      // Group by employee
      const employeeStatsMap = new Map<string, {
        employeeId: string;
        employeeName: string;
        employeeEmail: string;
        department: string | null;
        totalPaidDays: number;
        totalUnpaidDays: number;
        totalDays: number;
        byLeaveType: Map<string, { paidDays: number; unpaidDays: number; totalDays: number }>;
        leaveRequests: Array<{
          id: string;
          leaveType: string;
          startDate: Date;
          endDate: Date;
          totalDays: number;
          isPaid: boolean;
          status: string;
          submittedAt: Date;
        }>;
      }>();

      // Process requests asynchronously to calculate paid/unpaid correctly
      for (const request of filteredRequests) {
        const employeeId = request.userId;
        const requestStartDate = new Date(request.startDate);
        const requestEndDate = new Date(request.endDate);
        const employee = request.user;
        
        // Check if this leave overlaps with the selected year
        // A leave overlaps with the year if: startDate <= endOfYear AND endDate >= startOfYear
        const leaveOverlapsYear = requestStartDate <= endOfYear && requestEndDate >= startOfYear;
        
        // Calculate actual days within the selected year
        // If leave spans multiple years, only count days within the selected year
        const leaveStartInYear = requestStartDate < startOfYear ? startOfYear : requestStartDate;
        const leaveEndInYear = requestEndDate > endOfYear ? endOfYear : requestEndDate;
        
        // Calculate days within the year
        const daysInYear = Math.max(0, Math.ceil((leaveEndInYear.getTime() - leaveStartInYear.getTime()) / (1000 * 60 * 60 * 24)) + 1);
        const totalDays = parseFloat(request.totalDays.toString());
        
        // If leave overlaps with the year, calculate proportional days for statistics
        // If leave doesn't overlap, still include it in leaveRequests but with 0 days counted
        let daysToCount = 0;
        if (leaveOverlapsYear) {
          daysToCount = totalDays;
          if (requestStartDate < startOfYear || requestEndDate > endOfYear) {
            // Calculate proportion of leave days that fall within the selected year
            const totalLeaveDays = Math.ceil((requestEndDate.getTime() - requestStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            if (totalLeaveDays > 0) {
              daysToCount = (daysInYear / totalLeaveDays) * totalDays;
              daysToCount = Math.round(daysToCount * 100) / 100; // Round to 2 decimal places
            }
          }
        }
        
        // Calculate paid/unpaid days based on probation status and balance
        // Only calculate for leaves that overlap with the selected year
        let paidDays = 0;
        let unpaidDays = 0;
        
        if (daysToCount > 0 && leaveOverlapsYear) {
          unpaidDays = daysToCount;
          
          // Check if leave period overlaps with probation period
          // If ANY part of the leave falls within probation, it must be unpaid
          const leaveOverlapsProbation = this.doesLeaveOverlapProbation(
            requestStartDate,
            requestEndDate,
            employee.probationStatus,
            employee.probationStartDate,
            employee.probationEndDate
          );
          
          if (leaveOverlapsProbation) {
            // All leaves taken during probation period are unpaid
            paidDays = 0;
            unpaidDays = daysToCount;
          } else {
            // Employee completed probation - calculate based on available balance at leave time
            const balanceAtLeaveTime = await this.calculateBalanceAtDate(
              employeeId,
              request.leaveType,
              requestStartDate
            );
            
            // Split leave into paid and unpaid portions
            // Paid = min(leave days, available balance)
            // Unpaid = remaining days that exceed balance
            paidDays = Math.min(daysToCount, Math.max(0, balanceAtLeaveTime));
            unpaidDays = Math.max(0, daysToCount - balanceAtLeaveTime);
            
            // Round to 2 decimal places
            paidDays = Math.round(paidDays * 100) / 100;
            unpaidDays = Math.round(unpaidDays * 100) / 100;
          }
        }

        if (!employeeStatsMap.has(employeeId)) {
          employeeStatsMap.set(employeeId, {
            employeeId,
            employeeName: request.user.name,
            employeeEmail: request.user.email,
            department: request.user.department,
            totalPaidDays: 0,
            totalUnpaidDays: 0,
            totalDays: 0,
            byLeaveType: new Map(),
            leaveRequests: []
          });
        }

        const stats = employeeStatsMap.get(employeeId)!;
        
        // Update totals with calculated paid/unpaid days
        stats.totalPaidDays += paidDays;
        stats.totalUnpaidDays += unpaidDays;
        stats.totalDays += daysToCount;

        // Update by leave type
        // IMPORTANT: Include ALL leave types in the aggregation, even if they don't overlap with the selected year
        // This ensures all leave types are visible in the "By Leave Type" tab
        const leaveType = request.leaveType;
        if (!stats.byLeaveType.has(leaveType)) {
          stats.byLeaveType.set(leaveType, { paidDays: 0, unpaidDays: 0, totalDays: 0 });
        }
        const typeStats = stats.byLeaveType.get(leaveType)!;
        
        // For leaves that overlap with the selected year, add the calculated paid/unpaid days
        // For leaves outside the year, we still want to show them but with 0.0 for the year-filtered stats
        // However, we need to ensure the leave type is visible even if it has 0 days for the current year
        if (leaveOverlapsYear) {
          typeStats.paidDays += paidDays;
          typeStats.unpaidDays += unpaidDays;
          typeStats.totalDays += daysToCount;
        }
        // Note: Leaves outside the year will remain at 0.0, which is correct for year-filtered statistics
        // But the leave type will still be visible in the "By Leave Type" tab

        // Add to leave requests (store calculated paid/unpaid for display)
        // IMPORTANT: Add ALL approved leave requests, even if they don't overlap with the selected year
        // This ensures all leaves are visible in the UI, with proper paid/unpaid status for the year
        stats.leaveRequests.push({
          id: request.id,
          leaveType: request.leaveType,
          startDate: request.startDate,
          endDate: request.endDate,
          totalDays: leaveOverlapsYear ? daysToCount : totalDays, // Show days in year if overlaps, otherwise full days
          isPaid: paidDays > 0, // True if any paid days for the selected year, false if all unpaid or outside year
          status: request.status,
          submittedAt: request.submittedAt
        });
        
        console.log('🔍 getPaidUnpaidLeaveStats: Added leave request to stats:', {
          employeeId,
          employeeName: request.user.name,
          leaveRequestId: request.id,
          leaveType: request.leaveType,
          startDate: request.startDate,
          endDate: request.endDate,
          totalDays,
          daysToCount,
          leaveOverlapsYear,
          paidDays,
          unpaidDays,
          isPaid: paidDays > 0,
          totalLeaveRequestsForEmployee: stats.leaveRequests.length
        });
      }

      // Convert Map to Array and format byLeaveType
      const result = Array.from(employeeStatsMap.values()).map(stats => ({
        ...stats,
        byLeaveType: Array.from(stats.byLeaveType.entries()).map(([leaveType, typeStats]) => ({
          leaveType,
          ...typeStats
        }))
      }));

      // Sort by total days (descending)
      result.sort((a, b) => b.totalDays - a.totalDays);

      // Log final results for debugging
      console.log('🔍 getPaidUnpaidLeaveStats: Final results:', {
        totalEmployees: result.length,
        employeesWithLeaves: result.filter(s => s.leaveRequests.length > 0).length,
        totalLeaveRequests: result.reduce((sum, s) => sum + s.leaveRequests.length, 0),
        employeesBreakdown: result.map(s => ({
          employeeId: s.employeeId,
          employeeName: s.employeeName,
          leaveRequestCount: s.leaveRequests.length,
          leaveRequestIds: s.leaveRequests.map(r => r.id)
        }))
      });

      return result;
    } catch (error) {
      console.error('Error in getPaidUnpaidLeaveStats:', error);
      throw new Error('Failed to fetch paid/unpaid leave statistics');
    }
  }

  /**
   * Check if employee was in probation on a specific date
   */
  private static wasEmployeeInProbation(
    employee: { probationStatus: string | null; probationStartDate: Date | null; probationEndDate: Date | null },
    checkDate: Date
  ): boolean {
    // If no probation status, employee was not in probation
    if (!employee.probationStatus || employee.probationStatus === 'completed' || employee.probationStatus === 'terminated') {
      return false;
    }

    // If probation status is active or extended, check dates
    if (employee.probationStatus === 'active' || employee.probationStatus === 'extended') {
      const startDate = employee.probationStartDate ? new Date(employee.probationStartDate) : null;
      const endDate = employee.probationEndDate ? new Date(employee.probationEndDate) : null;
      
      if (startDate && endDate) {
        // Check if the date falls within probation period
        return checkDate >= startDate && checkDate <= endDate;
      } else if (startDate) {
        // If only start date exists, check if date is after start
        return checkDate >= startDate;
      }
    }

    return false;
  }

  /**
   * Check if leave dates overlap with probation period
   * Returns true if ANY part of the leave falls within the probation period
   */
  private static doesLeaveOverlapProbation(
    leaveStartDate: Date,
    leaveEndDate: Date,
    probationStatus: string | null | undefined,
    probationStartDate: Date | null | undefined,
    probationEndDate: Date | null | undefined
  ): boolean {
    // If no probation status or probation is completed/terminated, no overlap
    if (!probationStatus || probationStatus === 'completed' || probationStatus === 'terminated') {
      return false;
    }

    // If probation status is active or extended, check date overlap
    if (probationStatus === 'active' || probationStatus === 'extended') {
      if (!probationStartDate || !probationEndDate) {
        // If dates are missing but status is active/extended, assume overlap for safety
        return true;
      }

      const probStart = new Date(probationStartDate);
      const probEnd = new Date(probationEndDate);
      const leaveStart = new Date(leaveStartDate);
      const leaveEnd = new Date(leaveEndDate);

      // Check if leave dates overlap with probation period
      // Overlap occurs if: leaveStart <= probEnd AND leaveEnd >= probStart
      const overlaps = leaveStart <= probEnd && leaveEnd >= probStart;
      
      return overlaps;
    }

    return false;
  }

  /**
   * Calculate available leave balance at a specific date (before the leave was taken)
   */
  private static async calculateBalanceAtDate(
    employeeId: string,
    leaveType: string,
    asOfDate: Date
  ): Promise<number> {
    try {
      const year = asOfDate.getFullYear();
      
      // Get employee info including employeeType
      const employee = await prisma.user.findUnique({
        where: { id: employeeId },
        select: {
          joinDate: true,
          createdAt: true,
          employeeType: true
        }
      });

      if (!employee) {
        return 0;
      }

      // Calculate days served up to the leave date (not current date)
      const joinDate = employee.joinDate ? new Date(employee.joinDate) : new Date(employee.createdAt);
      const daysServed = this.calculateDaysServed(joinDate, asOfDate);

      // Get leave policy for this leave type and employeeType
      // Policies with employeeType null apply to both onshore and offshore
      const leavePolicy = await prisma.leavePolicy.findFirst({
        where: {
          leaveType,
          OR: [
            { employeeType: employee.employeeType }, // Policy specific to employee type
            { employeeType: null } // Policy applies to both types
          ],
          isActive: true
        },
        select: { totalDaysPerYear: true },
        orderBy: [
          // Prefer specific policy over generic (null) policy
          { employeeType: 'asc' } // null comes last, so specific policies come first
        ]
      });

      if (!leavePolicy) {
        return 0;
      }

      // Calculate accrued balance up to the leave date
      const dailyAccrual = leavePolicy.totalDaysPerYear / 365;
      const accruedBalance = Math.round(dailyAccrual * daysServed * 100) / 100;

      // Get all approved leave requests of this type BEFORE the leave start date
      const startOfYear = new Date(year, 0, 1);
      const requestsBeforeLeave = await prisma.leaveRequest.findMany({
        where: {
          userId: employeeId,
          leaveType: leaveType as any, // Cast to Prisma enum type
          status: 'approved',
          startDate: {
            gte: startOfYear,
            lt: asOfDate // Only leaves that started before this leave
          }
        },
        select: {
          totalDays: true
        }
      });

      // Calculate used days before this leave
      const usedDays = requestsBeforeLeave.reduce((sum, req) => {
        return sum + parseFloat(req.totalDays.toString());
      }, 0);

      // Available balance = accrued - used
      const availableBalance = Math.max(0, accruedBalance - usedDays);
      
      return Math.round(availableBalance * 100) / 100;
    } catch (error) {
      console.error('Error calculating balance at date:', error);
      return 0;
    }
  }

  /**
   * Calculate days served based on join date (for daily accrual)
   */
  private static calculateDaysServed(startDate: Date, currentDate: Date): number {
    const start = new Date(startDate);
    const current = new Date(currentDate);
    
    // Set time to midnight to calculate full days
    start.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    
    // Calculate difference in milliseconds
    const diffTime = current.getTime() - start.getTime();
    
    // Convert to days (including partial days)
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    // Return the actual days served (can be 0 on first day, 1 on second day, etc.)
    // Round to 2 decimal places for precision
    return Math.max(0, Math.round(diffDays * 100) / 100);
  }

  /**
   * Calculate months served based on join date (deprecated - kept for backward compatibility)
   * @deprecated Use calculateDaysServed for daily accrual instead
   */
  private static calculateMonthsServed(startDate: Date, currentDate: Date): number {
    const daysServed = this.calculateDaysServed(startDate, currentDate);
    // Convert days to months for backward compatibility
    return daysServed / 30.44; // Average days per month
  }

  /**
   * Get monthly paid and unpaid leave statistics for all employees
   */
  static async getMonthlyPaidUnpaidLeaveStats(filters?: {
    department?: string;
    year?: number;
    employeeId?: string;
    employeeIds?: string[]; // Optional list of employee IDs to filter by
  }): Promise<Array<{
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    department: string | null;
    monthlyStats: Array<{
      month: number;
      monthName: string;
      paidDays: number;
      unpaidDays: number;
      totalDays: number;
    }>;
    yearlyTotal: {
      paidDays: number;
      unpaidDays: number;
      totalDays: number;
    };
  }>> {
    try {
      const year = filters?.year || new Date().getFullYear();
      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59);

      // Build where clause
      const whereClause: any = {
        status: 'approved',
        OR: [
          {
            startDate: {
              gte: startOfYear,
              lte: endOfYear
            }
          },
          {
            endDate: {
              gte: startOfYear,
              lte: endOfYear
            }
          },
          {
            startDate: { lte: startOfYear },
            endDate: { gte: endOfYear }
          }
        ]
      };

      if (filters?.employeeId) {
        whereClause.userId = filters.employeeId;
      } else if (filters?.employeeIds && filters.employeeIds.length > 0) {
        whereClause.userId = { in: filters.employeeIds };
      }

      // Get all approved leave requests for the year
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              probationStatus: true,
              probationStartDate: true,
              probationEndDate: true,
              joinDate: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      // Filter by department if specified
      let filteredRequests = leaveRequests;
      if (filters?.department && filters.department !== 'all') {
        filteredRequests = leaveRequests.filter(req => req.user.department === filters.department);
      }

      // Initialize monthly stats for all 12 months
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      // Group by employee
      const employeeStatsMap = new Map<string, {
        employeeId: string;
        employeeName: string;
        employeeEmail: string;
        department: string | null;
        monthlyStats: Map<number, { paidDays: number; unpaidDays: number; totalDays: number }>;
      }>();

      // Initialize all employees with 12 months of zero stats
      const uniqueEmployees = new Map<string, typeof leaveRequests[0]['user']>();
      filteredRequests.forEach(req => {
        if (!uniqueEmployees.has(req.userId)) {
          uniqueEmployees.set(req.userId, req.user);
        }
      });

      // If employeeIds filter is provided, also include employees with no leaves
      if (filters?.employeeIds && filters.employeeIds.length > 0) {
        const employeesWithLeaves = Array.from(uniqueEmployees.keys());
        const employeesWithoutLeaves = filters.employeeIds.filter(id => !employeesWithLeaves.includes(id));
        
        // Fetch employee data for those without leaves
        if (employeesWithoutLeaves.length > 0) {
          const employeesData = await prisma.user.findMany({
            where: {
              id: { in: employeesWithoutLeaves }
            },
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
              probationStatus: true,
              probationStartDate: true,
              probationEndDate: true,
              joinDate: true,
              createdAt: true
            }
          });
          
          employeesData.forEach(user => {
            if (!uniqueEmployees.has(user.id)) {
              uniqueEmployees.set(user.id, user);
            }
          });
        }
      } else if (!filters?.employeeId) {
        // For admin view (no employeeIds filter), fetch all active employees
        // This ensures we show all employees even if they have no leaves
        const whereClause: any = {
          isActive: true,
          role: { in: ['employee', 'manager'] } // Only show employees and managers, not admins
        };
        
        if (filters?.department && filters.department !== 'all') {
          whereClause.department = filters.department;
        }
        
        const allEmployees = await prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            probationStatus: true,
            probationStartDate: true,
            probationEndDate: true,
            joinDate: true,
            createdAt: true
          }
        });
        
        // Add employees who don't have any leaves
        allEmployees.forEach(user => {
          if (!uniqueEmployees.has(user.id)) {
            uniqueEmployees.set(user.id, user);
          }
        });
      }

      uniqueEmployees.forEach((user, employeeId) => {
        const monthlyStats = new Map<number, { paidDays: number; unpaidDays: number; totalDays: number }>();
        for (let month = 1; month <= 12; month++) {
          monthlyStats.set(month, { paidDays: 0, unpaidDays: 0, totalDays: 0 });
        }
        employeeStatsMap.set(employeeId, {
          employeeId,
          employeeName: user.name,
          employeeEmail: user.email,
          department: user.department,
          monthlyStats
        });
      });

      // Process each leave request and distribute days across months
      for (const request of filteredRequests) {
        const employeeId = request.userId;
        const requestStartDate = new Date(request.startDate);
        const requestEndDate = new Date(request.endDate);
        const employee = request.user;
        const totalDays = parseFloat(request.totalDays.toString());

        // Calculate days for each month the leave spans
        const currentDate = new Date(requestStartDate);
        let remainingDays = totalDays;
        const daysPerDate = new Map<string, number>(); // Track days per date

        // Initialize all dates in the leave period
        while (currentDate <= requestEndDate) {
          const dateKey = currentDate.toISOString().split('T')[0];
          daysPerDate.set(dateKey, 0);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Distribute days across dates (handle half days)
        if (request.isHalfDay) {
          const dateKey = requestStartDate.toISOString().split('T')[0];
          daysPerDate.set(dateKey, 0.5);
        } else if (request.shortLeaveHours) {
          const dateKey = requestStartDate.toISOString().split('T')[0];
          const hoursToDays = request.shortLeaveHours / 8;
          daysPerDate.set(dateKey, hoursToDays);
        } else {
          // Full days - distribute evenly
          const totalDates = daysPerDate.size;
          const daysPerDateValue = totalDays / totalDates;
          daysPerDate.forEach((_, key) => {
            daysPerDate.set(key, daysPerDateValue);
          });
        }

        // Group days by month
        const daysByMonth = new Map<number, number>();
        daysPerDate.forEach((days, dateKey) => {
          const date = new Date(dateKey);
          const month = date.getMonth() + 1; // 1-12
          if (date.getFullYear() === year) {
            daysByMonth.set(month, (daysByMonth.get(month) || 0) + days);
          }
        });

        // Calculate paid/unpaid for each month
        // Process months in order to track balance correctly
        const sortedMonths = Array.from(daysByMonth.entries()).sort((a, b) => a[0] - b[0]);
        let runningBalance = 0;

        for (const [month, daysInMonth] of sortedMonths) {
          if (month < 1 || month > 12) continue;

          // Check if employee was in probation during this month
          const monthStart = new Date(year, month - 1, 1);
          const monthEnd = new Date(year, month, 0, 23, 59, 59);
          const wasInProbation = this.wasEmployeeInProbation(employee, monthStart) ||
                                this.wasEmployeeInProbation(employee, monthEnd);

          let paidDays = 0;
          let unpaidDays = daysInMonth;

          if (!wasInProbation) {
            // Calculate balance at the start of the month (before this leave)
            const balanceAtMonthStart = await this.calculateBalanceAtDate(
              employeeId,
              request.leaveType,
              monthStart
            );

            // Use the running balance if we've already processed earlier months of this leave
            // Otherwise use the calculated balance
            const availableBalance = runningBalance > 0 ? runningBalance : balanceAtMonthStart;

            // Split into paid and unpaid
            paidDays = Math.min(daysInMonth, Math.max(0, availableBalance));
            unpaidDays = Math.max(0, daysInMonth - availableBalance);

            // Update running balance for next month
            runningBalance = Math.max(0, availableBalance - daysInMonth);
          } else {
            // All unpaid during probation
            runningBalance = 0;
          }

          // Round to 2 decimal places
          paidDays = Math.round(paidDays * 100) / 100;
          unpaidDays = Math.round(unpaidDays * 100) / 100;

          // Update employee stats
          const stats = employeeStatsMap.get(employeeId);
          if (stats) {
            const monthStats = stats.monthlyStats.get(month)!;
            monthStats.paidDays += paidDays;
            monthStats.unpaidDays += unpaidDays;
            monthStats.totalDays += daysInMonth;
          }
        }
      }

      // Convert to result format
      const result = Array.from(employeeStatsMap.values()).map(stats => {
        const monthlyStatsArray = Array.from(stats.monthlyStats.entries())
          .map(([month, monthStats]) => ({
            month,
            monthName: monthNames[month - 1],
            ...monthStats
          }))
          .sort((a, b) => a.month - b.month);

        // Calculate yearly totals
        const yearlyTotal = monthlyStatsArray.reduce((acc, month) => ({
          paidDays: acc.paidDays + month.paidDays,
          unpaidDays: acc.unpaidDays + month.unpaidDays,
          totalDays: acc.totalDays + month.totalDays
        }), { paidDays: 0, unpaidDays: 0, totalDays: 0 });

        return {
          ...stats,
          monthlyStats: monthlyStatsArray,
          yearlyTotal
        };
      });

      // Sort by employee name
      result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

      return result;
    } catch (error) {
      console.error('Error in getMonthlyPaidUnpaidLeaveStats:', error);
      throw new Error('Failed to fetch monthly paid/unpaid leave statistics');
    }
  }
}