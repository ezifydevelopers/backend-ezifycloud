import { LeaveRequest, LeaveRequestFilters, LeaveRequestListResponse } from '../types';
export declare class LeaveRequestService {
    static getLeaveRequests(filters: LeaveRequestFilters): Promise<LeaveRequestListResponse>;
    static getLeaveRequestById(id: string): Promise<LeaveRequest | null>;
    static updateLeaveRequestStatus(id: string, status: 'approved' | 'rejected', reviewerId: string, comments?: string): Promise<LeaveRequest>;
    static bulkUpdateLeaveRequests(requestIds: string[], status: 'approved' | 'rejected', reviewerId: string, comments?: string): Promise<{
        updated: number;
        failed: number;
    }>;
    static getLeaveRequestStats(dateRange?: {
        startDate: Date;
        endDate: Date;
    }): Promise<{
        total: number;
        pending: number;
        approved: number;
        rejected: number;
        byLeaveType: {
            [key: string]: number;
        };
        byDepartment: {
            [key: string]: number;
        };
    }>;
    static getLeaveTypes(): Promise<string[]>;
    private static determinePriority;
    static getRecentLeaveRequests(limit?: number): Promise<LeaveRequest[]>;
}
//# sourceMappingURL=leaveRequestService.d.ts.map