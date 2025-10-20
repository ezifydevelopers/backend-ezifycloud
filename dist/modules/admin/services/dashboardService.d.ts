import { AdminDashboardStats, DateRange } from '../types';
export declare class DashboardService {
    static getDashboardStats(dateRange?: DateRange): Promise<AdminDashboardStats>;
    private static getDepartmentStats;
    private static getRecentActivities;
    private static getMonthlyLeaveTrend;
    private static calculateTotalLeaveDays;
    private static calculateUsedLeaveDays;
    private static getUpcomingHolidaysCount;
    static getQuickStats(): Promise<{
        totalEmployees: number;
        pendingRequests: number;
        approvedRequests: number;
        rejectedRequests: number;
    }>;
}
//# sourceMappingURL=dashboardService.d.ts.map