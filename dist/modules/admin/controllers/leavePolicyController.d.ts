import { Request, Response } from 'express';
export declare class LeavePolicyController {
    static getLeavePolicies(req: Request, res: Response): Promise<void>;
    static getLeavePolicyById(req: Request, res: Response): Promise<void>;
    static createLeavePolicy(req: Request, res: Response): Promise<void>;
    static updateLeavePolicy(req: Request, res: Response): Promise<void>;
    static deleteLeavePolicy(req: Request, res: Response): Promise<void>;
    static getLeavePolicyStats(req: Request, res: Response): Promise<void>;
    static getLeavePolicyTypes(req: Request, res: Response): Promise<void>;
    static toggleLeavePolicyStatus(req: Request, res: Response): Promise<void>;
    static bulkUpdateLeavePolicies(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=leavePolicyController.d.ts.map