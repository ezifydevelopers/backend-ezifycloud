import { Request, Response } from 'express';
export declare class LeaveRequestController {
    static getLeaveRequests(req: Request, res: Response): Promise<void>;
    static getLeaveRequestById(req: Request, res: Response): Promise<void>;
    static updateLeaveRequestStatus(req: Request, res: Response): Promise<void>;
    static bulkUpdateLeaveRequests(req: Request, res: Response): Promise<void>;
    static getLeaveRequestStats(req: Request, res: Response): Promise<void>;
    static getLeaveTypes(req: Request, res: Response): Promise<void>;
    static getRecentLeaveRequests(req: Request, res: Response): Promise<void>;
    static getPendingCount(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=leaveRequestController.d.ts.map