import { Request, Response } from 'express';
export declare class ProfileController {
    static getProfile(req: Request, res: Response): Promise<void>;
    static updateProfile(req: Request, res: Response): Promise<void>;
    static updateAvatar(req: Request, res: Response): Promise<void>;
    static updatePassword(req: Request, res: Response): Promise<void>;
    static getNotificationPreferences(req: Request, res: Response): Promise<void>;
    static updateNotificationPreferences(req: Request, res: Response): Promise<void>;
    static getCalendarPreferences(req: Request, res: Response): Promise<void>;
    static updateCalendarPreferences(req: Request, res: Response): Promise<void>;
    static getPrivacySettings(req: Request, res: Response): Promise<void>;
    static updatePrivacySettings(req: Request, res: Response): Promise<void>;
    static getSecuritySettings(req: Request, res: Response): Promise<void>;
    static getPerformanceGoals(req: Request, res: Response): Promise<void>;
    static getAchievements(req: Request, res: Response): Promise<void>;
    static updateSecuritySettings(req: Request, res: Response): Promise<void>;
    static getAppPreferences(req: Request, res: Response): Promise<void>;
    static updateAppPreferences(req: Request, res: Response): Promise<void>;
    static exportUserData(req: Request, res: Response): Promise<void>;
    static deleteUserAccount(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=profileController.d.ts.map