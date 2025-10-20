import { Request, Response } from 'express';
export declare class DashboardController {
    static getDashboardStats(req: Request, res: Response): Promise<void>;
    static getQuickStats(req: Request, res: Response): Promise<void>;
    static getDepartmentStats(req: Request, res: Response): Promise<void>;
    static getRecentActivities(req: Request, res: Response): Promise<void>;
    static getMonthlyLeaveTrend(req: Request, res: Response): Promise<void>;
    static getSystemOverview(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=dashboardController.d.ts.map