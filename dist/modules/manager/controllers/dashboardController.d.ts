import { Request, Response } from 'express';
export declare class ManagerDashboardController {
    static getDashboardStats(req: Request, res: Response): Promise<void>;
    static getQuickStats(req: Request, res: Response): Promise<void>;
    static getTeamPerformance(req: Request, res: Response): Promise<void>;
    static getUpcomingLeaves(req: Request, res: Response): Promise<void>;
    static getRecentActivities(req: Request, res: Response): Promise<void>;
    static getTeamLeaveBalance(req: Request, res: Response): Promise<void>;
    static getDepartmentStats(req: Request, res: Response): Promise<void>;
    static getProfile(req: Request, res: Response): Promise<void>;
    static updateProfile(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=dashboardController.d.ts.map