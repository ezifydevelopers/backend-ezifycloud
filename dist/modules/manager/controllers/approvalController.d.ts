import { Request, Response } from 'express';
export declare class ApprovalController {
    static getLeaveApprovals(req: Request, res: Response): Promise<void>;
    static getLeaveApprovalById(req: Request, res: Response): Promise<void>;
    static processApprovalAction(req: Request, res: Response): Promise<void>;
    static processBulkApprovalAction(req: Request, res: Response): Promise<void>;
    static getApprovalStats(req: Request, res: Response): Promise<void>;
    static getPendingCount(req: Request, res: Response): Promise<void>;
    static getUrgentApprovals(req: Request, res: Response): Promise<void>;
    static getApprovalHistory(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=approvalController.d.ts.map