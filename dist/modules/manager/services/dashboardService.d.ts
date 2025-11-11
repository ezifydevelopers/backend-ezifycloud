import { ManagerDashboardStats, DateRange } from '../types';
export declare class ManagerDashboardService {
    static getDashboardStats(managerId: string, dateRange?: DateRange): Promise<ManagerDashboardStats>;
    private static getTeamLeaveBalance;
    private static calculateTeamUsedDays;
    private static getPendingRequests;
    private static getUpcomingLeaves;
    private static getRecentActivities;
    private static getTeamPerformanceMetrics;
    private static getManagerDepartmentStats;
    private static determinePriority;
    static getQuickStats(managerId: string): Promise<{
        teamSize: number;
        pendingApprovals: number;
        approvedThisWeek: number;
        rejectedThisWeek: number;
    }>;
    static getProfile(managerId: string): Promise<{
        email: string;
        name: string;
        department: string | null;
        id: string;
        phone: string | null;
        bio: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    static updateProfile(managerId: string, profileData: any): Promise<{
        email: string;
        name: string;
        department: string | null;
        id: string;
        phone: string | null;
        bio: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
//# sourceMappingURL=dashboardService.d.ts.map