"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
class EmployeeService {
    static async getEmployees(filters) {
        try {
            const { search = '', department = '', role = '', status = 'all', page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
            const skip = (page - 1) * limit;
            const where = {};
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
            const totalCount = await prisma.user.count({ where });
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
            const transformedEmployees = await Promise.all(employees.map(async (emp) => {
                const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(emp.id);
                return {
                    id: emp.id,
                    name: emp.name,
                    email: emp.email,
                    phone: undefined,
                    department: emp.department || 'Unassigned',
                    position: 'Employee',
                    role: emp.role,
                    managerId: emp.managerId || undefined,
                    managerName: emp.manager?.name,
                    isActive: emp.isActive,
                    joinDate: emp.createdAt,
                    lastLogin: undefined,
                    leaveBalance,
                    avatar: emp.profilePicture || undefined,
                    bio: undefined,
                    createdAt: emp.createdAt,
                    updatedAt: emp.updatedAt
                };
            }));
            const totalPages = Math.ceil(totalCount / limit);
            const pagination = {
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
        }
        catch (error) {
            console.error('Error fetching employees:', error);
            throw new Error('Failed to fetch employees');
        }
    }
    static async getEmployeeById(id) {
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
                phone: undefined,
                department: employee.department || 'Unassigned',
                position: 'Employee',
                role: employee.role,
                managerId: employee.managerId || undefined,
                managerName: employee.manager?.name,
                isActive: employee.isActive,
                joinDate: employee.createdAt,
                lastLogin: undefined,
                leaveBalance,
                avatar: employee.profilePicture || undefined,
                bio: undefined,
                createdAt: employee.createdAt,
                updatedAt: employee.updatedAt
            };
        }
        catch (error) {
            console.error('Error fetching employee by ID:', error);
            throw new Error('Failed to fetch employee');
        }
    }
    static async createEmployee(employeeData) {
        try {
            console.log('🔍 EmployeeService: Creating employee with data:', employeeData);
            console.log('🔍 EmployeeService: Required fields check:', {
                name: !!employeeData.name,
                email: !!employeeData.email,
                department: !!employeeData.department,
                role: !!employeeData.role,
                password: !!employeeData.password
            });
            const existingEmployee = await prisma.user.findUnique({
                where: { email: employeeData.email }
            });
            if (existingEmployee) {
                throw new Error('Employee with this email already exists');
            }
            const hashedPassword = await bcryptjs_1.default.hash(employeeData.password, 12);
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
                }
                else {
                    console.log(`⚠️ No manager found in ${employeeData.department} department for new employee`);
                }
            }
            const employee = await prisma.user.create({
                data: {
                    name: employeeData.name,
                    email: employeeData.email,
                    passwordHash: hashedPassword,
                    role: employeeData.role,
                    department: employeeData.department,
                    managerId: assignedManagerId,
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
            const leaveBalance = await EmployeeService.getEmployeeLeaveBalance(employee.id);
            return {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                phone: undefined,
                department: employee.department || 'Unassigned',
                position: 'Employee',
                role: employee.role,
                managerId: employee.managerId || undefined,
                managerName: employee.manager?.name,
                isActive: employee.isActive,
                joinDate: employee.createdAt,
                lastLogin: undefined,
                leaveBalance,
                avatar: employee.profilePicture || undefined,
                bio: undefined,
                createdAt: employee.createdAt,
                updatedAt: employee.updatedAt
            };
        }
        catch (error) {
            console.error('Error creating employee:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to create employee');
        }
    }
    static async updateEmployee(id, updateData) {
        try {
            const existingEmployee = await prisma.user.findUnique({
                where: { id }
            });
            if (!existingEmployee) {
                throw new Error('Employee not found');
            }
            if (updateData.email && updateData.email !== existingEmployee.email) {
                const emailExists = await prisma.user.findUnique({
                    where: { email: updateData.email }
                });
                if (emailExists) {
                    throw new Error('Employee with this email already exists');
                }
            }
            const employee = await prisma.user.update({
                where: { id },
                data: {
                    name: updateData.name,
                    email: updateData.email,
                    role: updateData.role,
                    department: updateData.department,
                    managerId: updateData.managerId,
                    profilePicture: updateData.avatar || undefined
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
                phone: undefined,
                department: employee.department || 'Unassigned',
                position: 'Employee',
                role: employee.role,
                managerId: employee.managerId || undefined,
                managerName: employee.manager?.name,
                isActive: employee.isActive,
                joinDate: employee.createdAt,
                lastLogin: undefined,
                leaveBalance,
                avatar: employee.profilePicture || undefined,
                bio: undefined,
                createdAt: employee.createdAt,
                updatedAt: employee.updatedAt
            };
        }
        catch (error) {
            console.error('Error updating employee:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to update employee');
        }
    }
    static async deleteEmployee(id) {
        try {
            console.log(`🔍 EmployeeService: Starting delete process for employee ID: ${id}`);
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
        }
        catch (error) {
            console.error('❌ EmployeeService: Error deleting employee:', error);
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to deactivate employee'
            };
        }
    }
    static async toggleEmployeeStatus(id, isActive) {
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
                phone: undefined,
                department: employee.department || 'Unassigned',
                position: 'Employee',
                role: employee.role,
                managerId: employee.managerId || undefined,
                managerName: employee.manager?.name,
                isActive: employee.isActive,
                joinDate: employee.createdAt,
                lastLogin: undefined,
                leaveBalance,
                avatar: employee.profilePicture || undefined,
                bio: undefined,
                createdAt: employee.createdAt,
                updatedAt: employee.updatedAt
            };
        }
        catch (error) {
            console.error('Error toggling employee status:', error);
            throw new Error('Failed to toggle employee status');
        }
    }
    static async bulkUpdateEmployeeStatus(employeeIds, isActive) {
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
                }
                catch (error) {
                    console.error(`Error updating employee ${id}:`, error);
                    failed++;
                }
            }
            return { updated, failed };
        }
        catch (error) {
            console.error('Error bulk updating employee status:', error);
            throw new Error('Failed to bulk update employee status');
        }
    }
    static async bulkDeleteEmployees(employeeIds) {
        try {
            let deleted = 0;
            let failed = 0;
            for (const id of employeeIds) {
                try {
                    const employee = await prisma.user.findUnique({
                        where: { id }
                    });
                    if (!employee) {
                        console.error(`Employee ${id} not found`);
                        failed++;
                        continue;
                    }
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
                    await prisma.user.update({
                        where: { id },
                        data: {
                            isActive: false
                        }
                    });
                    console.log(`Employee ${employee.name} (${employee.email}) has been deactivated`);
                    deleted++;
                }
                catch (error) {
                    console.error(`Error deactivating employee ${id}:`, error);
                    failed++;
                }
            }
            return { deleted, failed };
        }
        catch (error) {
            console.error('Error bulk deactivating employees:', error);
            throw new Error('Failed to bulk deactivate employees');
        }
    }
    static async bulkUpdateEmployeeDepartment(employeeIds, department) {
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
                }
                catch (error) {
                    console.error(`Error updating employee ${id}:`, error);
                    failed++;
                }
            }
            return { updated, failed };
        }
        catch (error) {
            console.error('Error bulk updating employee department:', error);
            throw new Error('Failed to bulk update employee department');
        }
    }
    static async exportEmployeesToCSV() {
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
            const rows = employees.map(employee => [
                employee.id,
                employee.name,
                employee.email,
                employee.phone || '',
                employee.department || '',
                employee.role,
                employee.manager?.name || '',
                employee.isActive ? 'Active' : 'Inactive',
                employee.createdAt.toISOString().split('T')[0],
                employee.updatedAt.toISOString().split('T')[0]
            ]);
            const csvContent = [headers, ...rows]
                .map(row => row.map(field => `"${field}"`).join(','))
                .join('\n');
            return csvContent;
        }
        catch (error) {
            console.error('Error exporting employees to CSV:', error);
            throw new Error('Failed to export employees to CSV');
        }
    }
    static async getDepartments() {
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
            return departments.map(dept => dept.department).filter(Boolean);
        }
        catch (error) {
            console.error('Error fetching departments:', error);
            return [];
        }
    }
    static async getManagers() {
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
        }
        catch (error) {
            console.error('Error fetching managers:', error);
            return [];
        }
    }
    static async getEmployeeLeaveBalance(employeeId, year) {
        try {
            const currentYear = year ? parseInt(year) : new Date().getFullYear();
            console.log('🔍 EmployeeService: getEmployeeLeaveBalance called with:', { employeeId, year, currentYear });
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
            const leaveBalance = await prisma.leaveBalance.findUnique({
                where: {
                    userId_year: {
                        userId: employeeId,
                        year: currentYear
                    }
                }
            });
            const leavePolicies = await prisma.leavePolicy.findMany({
                where: {
                    isActive: true
                },
                select: {
                    leaveType: true,
                    totalDaysPerYear: true
                }
            });
            const policyMap = new Map();
            leavePolicies.forEach(policy => {
                policyMap.set(policy.leaveType, policy.totalDaysPerYear);
            });
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
            const usedDays = {};
            const pendingDays = {};
            console.log('🔍 EmployeeService: Processing leave requests:', allRequests.length);
            allRequests.forEach(request => {
                const days = Number(request.totalDays);
                console.log(`🔍 EmployeeService: Request - Type: ${request.leaveType}, Days: ${days}, Status: ${request.status}`);
                if (request.status === 'approved') {
                    usedDays[request.leaveType] = (usedDays[request.leaveType] || 0) + days;
                }
                else if (request.status === 'pending') {
                    pendingDays[request.leaveType] = (pendingDays[request.leaveType] || 0) + days;
                }
            });
            console.log('🔍 EmployeeService: Calculated used days:', usedDays);
            console.log('🔍 EmployeeService: Calculated pending days:', pendingDays);
            const dynamicLeaveBalance = {};
            let totalDays = 0;
            let totalUsedDays = 0;
            let totalRemainingDays = 0;
            let totalPendingDays = 0;
            for (const [leaveType, totalFromPolicy] of policyMap) {
                const used = usedDays[leaveType] || 0;
                const pending = pendingDays[leaveType] || 0;
                const actualRemaining = Math.max(0, totalFromPolicy - used - pending);
                dynamicLeaveBalance[leaveType] = {
                    total: totalFromPolicy,
                    used: used,
                    remaining: actualRemaining,
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
        }
        catch (error) {
            console.error('❌ EmployeeService: Error fetching employee leave balance:', error);
            throw new Error('Failed to fetch employee leave balance');
        }
    }
}
exports.EmployeeService = EmployeeService;
//# sourceMappingURL=employeeService.js.map