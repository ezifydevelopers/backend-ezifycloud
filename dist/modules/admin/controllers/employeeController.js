"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const employeeService_1 = require("../services/employeeService");
class EmployeeController {
    static async getEmployees(req, res) {
        try {
            const filters = {
                search: req.query.search,
                department: req.query.department,
                role: req.query.role,
                status: req.query.status,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };
            const result = await employeeService_1.EmployeeService.getEmployees(filters);
            const response = {
                success: true,
                message: 'Employees retrieved successfully',
                data: result.employees,
                pagination: result.pagination
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getEmployees:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve employees',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getEmployeeById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee ID'
                };
                res.status(400).json(response);
                return;
            }
            const employee = await employeeService_1.EmployeeService.getEmployeeById(id);
            if (!employee) {
                const response = {
                    success: false,
                    message: 'Employee not found',
                    error: 'Employee with the given ID does not exist'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Employee retrieved successfully',
                data: employee
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getEmployeeById:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve employee',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async createEmployee(req, res) {
        try {
            const employeeData = req.body;
            console.log('🔍 EmployeeController: Received employee data:', employeeData);
            console.log('🔍 EmployeeController: Request body keys:', Object.keys(employeeData));
            const employee = await employeeService_1.EmployeeService.createEmployee(employeeData);
            const response = {
                success: true,
                message: 'Employee created successfully',
                data: employee
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error in createEmployee:', error);
            const response = {
                success: false,
                message: 'Failed to create employee',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async updateEmployee(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            if (!id) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee ID'
                };
                res.status(400).json(response);
                return;
            }
            const employee = await employeeService_1.EmployeeService.updateEmployee(id, updateData);
            const response = {
                success: true,
                message: 'Employee updated successfully',
                data: employee
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateEmployee:', error);
            const response = {
                success: false,
                message: 'Failed to update employee',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async deleteEmployee(req, res) {
        try {
            const { id } = req.params;
            const adminId = req.user?.id;
            console.log(`🔍 EmployeeController: Delete employee request - ID: ${id}, Admin ID: ${adminId}`);
            if (!id) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee ID'
                };
                res.status(400).json(response);
                return;
            }
            if (!adminId) {
                const response = {
                    success: false,
                    message: 'Authentication required',
                    error: 'Admin user not found'
                };
                res.status(401).json(response);
                return;
            }
            const result = await employeeService_1.EmployeeService.deleteEmployee(id);
            if (result.success) {
                const response = {
                    success: true,
                    message: result.message,
                    data: result.employee
                };
                res.status(200).json(response);
            }
            else {
                const response = {
                    success: false,
                    message: result.message,
                    error: result.message
                };
                res.status(400).json(response);
            }
        }
        catch (error) {
            console.error('❌ EmployeeController: Error in deleteEmployee:', error);
            const response = {
                success: false,
                message: 'Failed to deactivate employee',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async toggleEmployeeStatus(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            if (!id) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee ID'
                };
                res.status(400).json(response);
                return;
            }
            if (typeof isActive !== 'boolean') {
                const response = {
                    success: false,
                    message: 'isActive must be a boolean value',
                    error: 'Invalid isActive value'
                };
                res.status(400).json(response);
                return;
            }
            const employee = await employeeService_1.EmployeeService.toggleEmployeeStatus(id, isActive);
            const response = {
                success: true,
                message: `Employee ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: employee
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in toggleEmployeeStatus:', error);
            const response = {
                success: false,
                message: 'Failed to toggle employee status',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async bulkUpdateEmployeeStatus(req, res) {
        try {
            const { employeeIds, isActive } = req.body;
            if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
                const response = {
                    success: false,
                    message: 'Employee IDs array is required',
                    error: 'Missing or invalid employee IDs'
                };
                res.status(400).json(response);
                return;
            }
            if (typeof isActive !== 'boolean') {
                const response = {
                    success: false,
                    message: 'isActive must be a boolean value',
                    error: 'Invalid isActive value'
                };
                res.status(400).json(response);
                return;
            }
            const result = await employeeService_1.EmployeeService.bulkUpdateEmployeeStatus(employeeIds, isActive);
            const response = {
                success: true,
                message: `Bulk status update completed: ${result.updated} updated, ${result.failed} failed`,
                data: result
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in bulkUpdateEmployeeStatus:', error);
            const response = {
                success: false,
                message: 'Failed to bulk update employee status',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async bulkDeleteEmployees(req, res) {
        try {
            const { employeeIds } = req.body;
            if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
                const response = {
                    success: false,
                    message: 'Employee IDs array is required',
                    error: 'Missing or invalid employee IDs'
                };
                res.status(400).json(response);
                return;
            }
            const result = await employeeService_1.EmployeeService.bulkDeleteEmployees(employeeIds);
            const response = {
                success: true,
                message: `Bulk deactivation completed: ${result.deleted} deactivated, ${result.failed} failed`,
                data: result
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in bulkDeleteEmployees:', error);
            const response = {
                success: false,
                message: 'Failed to bulk deactivate employees',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async bulkUpdateEmployeeDepartment(req, res) {
        try {
            const { employeeIds, department } = req.body;
            if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
                const response = {
                    success: false,
                    message: 'Employee IDs array is required',
                    error: 'Missing or invalid employee IDs'
                };
                res.status(400).json(response);
                return;
            }
            if (!department || typeof department !== 'string') {
                const response = {
                    success: false,
                    message: 'Department is required',
                    error: 'Missing or invalid department'
                };
                res.status(400).json(response);
                return;
            }
            const result = await employeeService_1.EmployeeService.bulkUpdateEmployeeDepartment(employeeIds, department);
            const response = {
                success: true,
                message: `Bulk department update completed: ${result.updated} updated, ${result.failed} failed`,
                data: result
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in bulkUpdateEmployeeDepartment:', error);
            const response = {
                success: false,
                message: 'Failed to bulk update employee department',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async exportEmployeesToCSV(req, res) {
        try {
            const csvContent = await employeeService_1.EmployeeService.exportEmployeesToCSV();
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="employees.csv"');
            res.status(200).send(csvContent);
        }
        catch (error) {
            console.error('Error in exportEmployeesToCSV:', error);
            const response = {
                success: false,
                message: 'Failed to export employees to CSV',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getDepartments(req, res) {
        try {
            const departments = await employeeService_1.EmployeeService.getDepartments();
            const response = {
                success: true,
                message: 'Departments retrieved successfully',
                data: departments
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getDepartments:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve departments',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getManagers(req, res) {
        try {
            const managers = await employeeService_1.EmployeeService.getManagers();
            const response = {
                success: true,
                message: 'Managers retrieved successfully',
                data: managers
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getManagers:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve managers',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getEmployeeStats(req, res) {
        try {
            const { department } = req.query;
            const filters = {
                department: department,
                status: 'active'
            };
            const result = await employeeService_1.EmployeeService.getEmployees(filters);
            const stats = {
                totalEmployees: result.totalCount,
                byDepartment: result.employees.reduce((acc, emp) => {
                    acc[emp.department] = (acc[emp.department] || 0) + 1;
                    return acc;
                }, {}),
                byRole: result.employees.reduce((acc, emp) => {
                    acc[emp.role] = (acc[emp.role] || 0) + 1;
                    return acc;
                }, {})
            };
            const response = {
                success: true,
                message: 'Employee statistics retrieved successfully',
                data: stats
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getEmployeeStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve employee statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getEmployeeLeaveBalance(req, res) {
        try {
            const employeeId = req.params.id;
            const year = req.query.year || new Date().getFullYear().toString();
            console.log('🔍 Admin Controller: getEmployeeLeaveBalance called with:', { employeeId, year });
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee ID'
                };
                res.status(400).json(response);
                return;
            }
            const leaveBalance = await employeeService_1.EmployeeService.getEmployeeLeaveBalance(employeeId, year);
            console.log('🔍 Admin Controller: Service returned:', leaveBalance);
            const response = {
                success: true,
                message: 'Employee leave balance retrieved successfully',
                data: leaveBalance
            };
            console.log('🔍 Admin Controller: Sending response:', response);
            res.status(200).json(response);
        }
        catch (error) {
            console.error('❌ Admin Controller: Error in getEmployeeLeaveBalance:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve employee leave balance',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.EmployeeController = EmployeeController;
//# sourceMappingURL=employeeController.js.map