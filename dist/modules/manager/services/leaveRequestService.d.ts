import { LeaveRequestFormData, LeaveRequestResponse, LeaveRequestFilters, LeaveRequestListResponse, LeaveHistoryFilters, LeaveHistoryResponse } from '../types';
export declare class LeaveRequestService {
    static createLeaveRequest(managerId: string, formData: LeaveRequestFormData): Promise<LeaveRequestResponse>;
    static getLeaveRequests(managerId: string, filters: LeaveRequestFilters): Promise<LeaveRequestListResponse>;
    static getLeaveRequestById(managerId: string, requestId: string): Promise<LeaveRequestResponse | null>;
    static updateLeaveRequest(managerId: string, requestId: string, updateData: Partial<LeaveRequestFormData>): Promise<LeaveRequestResponse>;
    static cancelLeaveRequest(managerId: string, requestId: string): Promise<boolean>;
    static getLeaveHistory(managerId: string, filters: LeaveHistoryFilters): Promise<LeaveHistoryResponse>;
    static getRecentRequests(managerId: string, limit?: number): Promise<LeaveRequestResponse[]>;
    static getLeaveBalance(managerId: string): Promise<Record<string, unknown>>;
    private static getLeaveHistorySummary;
    private static determinePriority;
}
//# sourceMappingURL=leaveRequestService.d.ts.map