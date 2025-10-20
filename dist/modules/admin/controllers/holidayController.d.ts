import { Request, Response } from 'express';
export declare class HolidayController {
    static getHolidays(req: Request, res: Response): Promise<void>;
    static getHolidayById(req: Request, res: Response): Promise<void>;
    static createHoliday(req: Request, res: Response): Promise<void>;
    static updateHoliday(req: Request, res: Response): Promise<void>;
    static deleteHoliday(req: Request, res: Response): Promise<void>;
    static toggleHolidayStatus(req: Request, res: Response): Promise<void>;
    static getHolidayStats(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=holidayController.d.ts.map