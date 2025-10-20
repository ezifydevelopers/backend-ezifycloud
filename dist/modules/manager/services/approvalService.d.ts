import { LeaveApproval, ApprovalFilters, ApprovalListResponse, ApprovalAction, BulkApprovalAction } from '../types';
export declare class ApprovalService {
    static getLeaveApprovals(managerId: string, filters: ApprovalFilters): Promise<ApprovalListResponse>;
    static getLeaveApprovalById(managerId: string, approvalId: string): Promise<LeaveApproval | null>;
    static processApprovalAction(managerId: string, action: ApprovalAction): Promise<LeaveApproval>;
    static processBulkApprovalAction(managerId: string, action: BulkApprovalAction): Promise<{
        updated: number;
        failed: number;
        results: LeaveApproval[];
    }>;
    static getApprovalStats(managerId: string, dateRange?: {
        startDate: Date;
        endDate: Date;
    }): Promise<{
        totalRequests: number;
        pendingRequests: number;
        approvedRequests: number;
        rejectedRequests: number;
        averageProcessingTime: number;
        approvalRate: number;
        byLeaveType: {
            [key: string]: number;
        };
        byPriority: {
            [key: string]: number;
        };
        byEmployee: Array<{
            employeeId: string;
            employeeName: string;
            requestCount: number;
        }>;
    }>;
    static getPendingCount(managerId: string): Promise<number>;
    static getUrgentApprovals(managerId: string): Promise<LeaveApproval[]>;
    private static updateLeaveBalance;
    private static determinePriority;
}
//# sourceMappingURL=approvalService.d.ts.map