import { Request, Response } from 'express';
export declare class SalaryController {
    static getEmployeeSalaries(req: Request, res: Response): Promise<void>;
    static getMonthlySalaries(req: Request, res: Response): Promise<void>;
    static generateMonthlySalaries(req: Request, res: Response): Promise<void>;
    static approveMonthlySalary(req: Request, res: Response): Promise<void>;
    static getSalaryStatistics(req: Request, res: Response): Promise<void>;
    static calculateEmployeeSalary(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=salaryController.d.ts.map