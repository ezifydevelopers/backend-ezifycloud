import { Employee, EmployeeFilters, EmployeeListResponse } from '../types';
export declare class EmployeeService {
    static getEmployees(filters: EmployeeFilters): Promise<EmployeeListResponse>;
    static getEmployeeById(id: string): Promise<Employee | null>;
    static createEmployee(employeeData: {
        name: string;
        email: string;
        phone?: string;
        department: string;
        role: 'admin' | 'manager' | 'employee';
        managerId?: string;
        password: string;
        bio?: string;
    }): Promise<Employee>;
    static updateEmployee(id: string, updateData: {
        name?: string;
        email?: string;
        phone?: string;
        department?: string;
        position?: string;
        role?: 'admin' | 'manager' | 'employee';
        managerId?: string;
        bio?: string;
        avatar?: string;
    }): Promise<Employee>;
    static deleteEmployee(id: string): Promise<{
        success: boolean;
        message: string;
        employee?: any;
    }>;
    static toggleEmployeeStatus(id: string, isActive: boolean): Promise<Employee>;
    static bulkUpdateEmployeeStatus(employeeIds: string[], isActive: boolean): Promise<{
        updated: number;
        failed: number;
    }>;
    static bulkDeleteEmployees(employeeIds: string[]): Promise<{
        deleted: number;
        failed: number;
    }>;
    static bulkUpdateEmployeeDepartment(employeeIds: string[], department: string): Promise<{
        updated: number;
        failed: number;
    }>;
    static exportEmployeesToCSV(): Promise<string>;
    static getDepartments(): Promise<string[]>;
    static getManagers(): Promise<{
        id: string;
        name: string;
        department: string;
    }[]>;
    static getEmployeeLeaveBalance(employeeId: string, year?: string): Promise<any>;
}
//# sourceMappingURL=employeeService.d.ts.map