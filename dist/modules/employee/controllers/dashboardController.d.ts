import { Request, Response } from 'express';
export declare class EmployeeDashboardController {
    static getDashboardStats(req: Request, res: Response): Promise<void>;
    static getPersonalInfo(req: Request, res: Response): Promise<void>;
    static getLeaveBalance(req: Request, res: Response): Promise<void>;
    static getRecentLeaveRequests(req: Request, res: Response): Promise<void>;
    static getUpcomingHolidays(req: Request, res: Response): Promise<void>;
    static getTeamInfo(req: Request, res: Response): Promise<void>;
    static getPerformanceMetrics(req: Request, res: Response): Promise<void>;
    static getNotifications(req: Request, res: Response): Promise<void>;
    static getQuickStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=dashboardController.d.ts.map