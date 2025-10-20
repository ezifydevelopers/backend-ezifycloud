import { Request, Response } from 'express';
export declare class SalaryController {
    static getTeamSalaries(req: Request, res: Response): Promise<void>;
    static getTeamMonthlySalaries(req: Request, res: Response): Promise<void>;
    static generateTeamMonthlySalaries(req: Request, res: Response): Promise<void>;
    static approveTeamMonthlySalary(req: Request, res: Response): Promise<void>;
    static getTeamSalaryStatistics(req: Request, res: Response): Promise<void>;
    static calculateTeamMemberSalary(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=salaryController.d.ts.map