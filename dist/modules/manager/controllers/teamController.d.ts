import { Request, Response } from 'express';
export declare class TeamController {
    static getTeamMembers(req: Request, res: Response): Promise<void>;
    static getTeamMemberById(req: Request, res: Response): Promise<void>;
    static addTeamMember(req: Request, res: Response): Promise<void>;
    static updateTeamMember(req: Request, res: Response): Promise<void>;
    static toggleTeamMemberStatus(req: Request, res: Response): Promise<void>;
    static getTeamStats(req: Request, res: Response): Promise<void>;
    static getTeamDepartments(req: Request, res: Response): Promise<void>;
    static getTeamMemberPerformance(req: Request, res: Response): Promise<void>;
    static getTeamMemberRecentLeaves(req: Request, res: Response): Promise<void>;
    static getTeamMemberLeaveBalance(req: Request, res: Response): Promise<void>;
    static getTeamPerformance(req: Request, res: Response): Promise<void>;
    static getTeamCapacity(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=teamController.d.ts.map