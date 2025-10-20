import { Request, Response } from 'express';
export declare class EmployeeController {
    static getEmployees(req: Request, res: Response): Promise<void>;
    static getEmployeeById(req: Request, res: Response): Promise<void>;
    static createEmployee(req: Request, res: Response): Promise<void>;
    static updateEmployee(req: Request, res: Response): Promise<void>;
    static deleteEmployee(req: Request, res: Response): Promise<void>;
    static toggleEmployeeStatus(req: Request, res: Response): Promise<void>;
    static bulkUpdateEmployeeStatus(req: Request, res: Response): Promise<void>;
    static bulkDeleteEmployees(req: Request, res: Response): Promise<void>;
    static bulkUpdateEmployeeDepartment(req: Request, res: Response): Promise<void>;
    static exportEmployeesToCSV(req: Request, res: Response): Promise<void>;
    static getDepartments(req: Request, res: Response): Promise<void>;
    static getManagers(req: Request, res: Response): Promise<void>;
    static getEmployeeStats(req: Request, res: Response): Promise<void>;
    static getEmployeeLeaveBalance(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=employeeController.d.ts.map