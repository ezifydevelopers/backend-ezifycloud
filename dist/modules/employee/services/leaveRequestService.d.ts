import { LeaveRequestFormData, LeaveRequestResponse, LeaveRequestFilters, LeaveRequestListResponse, LeaveHistoryFilters, LeaveHistoryResponse } from '../types';
export declare class LeaveRequestService {
    static createLeaveRequest(employeeId: string, formData: LeaveRequestFormData): Promise<LeaveRequestResponse>;
    static getLeaveRequests(employeeId: string, filters: LeaveRequestFilters): Promise<LeaveRequestListResponse>;
    static getLeaveRequestById(employeeId: string, requestId: string): Promise<LeaveRequestResponse | null>;
    static updateLeaveRequest(employeeId: string, requestId: string, updateData: Partial<LeaveRequestFormData>): Promise<LeaveRequestResponse>;
    static cancelLeaveRequest(employeeId: string, requestId: string): Promise<boolean>;
    static getLeaveHistory(employeeId: string, filters: LeaveHistoryFilters): Promise<LeaveHistoryResponse>;
    private static getLeaveHistorySummary;
    private static determinePriority;
    private static createSalaryDeductionRecord;
}
//# sourceMappingURL=leaveRequestService.d.ts.map