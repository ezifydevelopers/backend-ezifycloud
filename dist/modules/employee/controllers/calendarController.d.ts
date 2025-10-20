import { Request, Response } from 'express';
export declare class CalendarController {
    static getCalendarEvents(req: Request, res: Response): Promise<void>;
    static getUpcomingEvents(req: Request, res: Response): Promise<void>;
    static getCalendarStats(req: Request, res: Response): Promise<void>;
    static getCurrentMonthEvents(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=calendarController.d.ts.map