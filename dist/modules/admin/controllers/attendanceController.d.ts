import { Request, Response } from 'express';
export declare class AttendanceController {
    static getAttendanceRecords(req: Request, res: Response): Promise<void>;
    static getAttendanceStats(req: Request, res: Response): Promise<void>;
    static getAttendanceRecordById(req: Request, res: Response): Promise<void>;
    static createAttendanceRecord(req: Request, res: Response): Promise<void>;
    static updateAttendanceRecord(req: Request, res: Response): Promise<void>;
    static deleteAttendanceRecord(req: Request, res: Response): Promise<void>;
    static getUserAttendanceRecords(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=attendanceController.d.ts.map