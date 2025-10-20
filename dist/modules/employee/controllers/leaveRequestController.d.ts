import { Request, Response } from 'express';
export declare class LeaveRequestController {
    static createLeaveRequest(req: Request, res: Response): Promise<void>;
    static getLeaveRequests(req: Request, res: Response): Promise<void>;
    static getLeaveRequestById(req: Request, res: Response): Promise<void>;
    static updateLeaveRequest(req: Request, res: Response): Promise<void>;
    static cancelLeaveRequest(req: Request, res: Response): Promise<void>;
    static getLeaveHistory(req: Request, res: Response): Promise<void>;
    static getLeaveHistorySummary(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=leaveRequestController.d.ts.map