import { EmployeeDashboardStats, LeaveBalance, DateRange } from '../types';
export declare class EmployeeDashboardService {
    static getDashboardStats(employeeId: string, dateRange?: DateRange): Promise<EmployeeDashboardStats>;
    private static getPersonalInfo;
    static getDynamicLeaveBalance(employeeId: string): Promise<LeaveBalance>;
    private static getLeaveBalance;
    private static getRecentLeaveRequests;
    private static getUpcomingHolidays;
    private static getTeamInfo;
    private static getPerformanceMetrics;
    private static getNotifications;
    private static getQuickStats;
    private static determinePriority;
}
//# sourceMappingURL=dashboardService.d.ts.map