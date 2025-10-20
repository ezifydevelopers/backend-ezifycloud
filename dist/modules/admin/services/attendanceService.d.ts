import { AttendanceRecord, AttendanceStats, AttendanceFilters, AttendanceListResponse, DateRange } from '../types';
export declare class AttendanceService {
    static getAttendanceRecords(filters: AttendanceFilters): Promise<AttendanceListResponse>;
    static getAttendanceStats(dateRange?: DateRange): Promise<AttendanceStats>;
    static getAttendanceRecordById(id: string): Promise<AttendanceRecord | null>;
    static updateAttendanceRecord(id: string, updateData: Partial<AttendanceRecord>): Promise<AttendanceRecord>;
    static createAttendanceRecord(recordData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AttendanceRecord>;
    static deleteAttendanceRecord(id: string): Promise<boolean>;
    static getUserAttendanceRecords(userId: string, dateRange?: DateRange): Promise<AttendanceRecord[]>;
}
//# sourceMappingURL=attendanceService.d.ts.map