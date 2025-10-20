import { Request, Response } from 'express';
export declare class SettingsController {
    static getAllSettings(req: Request, res: Response): Promise<void>;
    static updateSettings(req: Request, res: Response): Promise<void>;
    static getNotificationSettings(req: Request, res: Response): Promise<void>;
    static updateNotificationSettings(req: Request, res: Response): Promise<void>;
    static getSystemInfo(req: Request, res: Response): Promise<void>;
    static resetSettings(req: Request, res: Response): Promise<void>;
    static getSettings(req: Request, res: Response): Promise<void>;
    static getCompanySettings(req: Request, res: Response): Promise<void>;
    static updateCompanySettings(req: Request, res: Response): Promise<void>;
    static getLeaveSettings(req: Request, res: Response): Promise<void>;
    static updateLeaveSettings(req: Request, res: Response): Promise<void>;
    static getSecuritySettings(req: Request, res: Response): Promise<void>;
    static updateSecuritySettings(req: Request, res: Response): Promise<void>;
    static getSystemConfigSettings(req: Request, res: Response): Promise<void>;
    static updateSystemConfigSettings(req: Request, res: Response): Promise<void>;
    static resetSettingsToDefault(req: Request, res: Response): Promise<void>;
    static exportSettings(req: Request, res: Response): Promise<void>;
    static importSettings(req: Request, res: Response): Promise<void>;
    static getSettingsHistory(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=settingsController.d.ts.map