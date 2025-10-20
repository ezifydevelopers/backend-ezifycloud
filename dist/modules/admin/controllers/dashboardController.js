"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboardService_1 = require("../services/dashboardService");
class DashboardController {
    static async getDashboardStats(req, res) {
        try {
            const { startDate, endDate, department } = req.query;
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            } : undefined;
            const stats = await dashboardService_1.DashboardService.getDashboardStats(dateRange);
            const response = {
                success: true,
                message: 'Dashboard statistics retrieved successfully',
                data: stats
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getDashboardStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve dashboard statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getQuickStats(req, res) {
        try {
            const stats = await dashboardService_1.DashboardService.getQuickStats();
            const response = {
                success: true,
                message: 'Quick statistics retrieved successfully',
                data: stats
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getQuickStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve quick statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getDepartmentStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            } : {
                startDate: new Date(new Date().getFullYear(), 0, 1),
                endDate: new Date()
            };
            const stats = await dashboardService_1.DashboardService.getDashboardStats(dateRange);
            const response = {
                success: true,
                message: 'Department statistics retrieved successfully',
                data: stats.departmentStats
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getDepartmentStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve department statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getRecentActivities(req, res) {
        try {
            const { limit = '10' } = req.query;
            const limitNum = parseInt(limit, 10);
            const stats = await dashboardService_1.DashboardService.getDashboardStats();
            const activities = stats.recentActivities.slice(0, limitNum);
            const response = {
                success: true,
                message: 'Recent activities retrieved successfully',
                data: activities
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getRecentActivities:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve recent activities',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getMonthlyLeaveTrend(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            } : {
                startDate: new Date(new Date().getFullYear(), 0, 1),
                endDate: new Date()
            };
            const stats = await dashboardService_1.DashboardService.getDashboardStats(dateRange);
            const response = {
                success: true,
                message: 'Monthly leave trend retrieved successfully',
                data: stats.monthlyLeaveTrend
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getMonthlyLeaveTrend:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve monthly leave trend',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getSystemOverview(req, res) {
        try {
            const stats = await dashboardService_1.DashboardService.getDashboardStats();
            const overview = {
                employees: {
                    total: stats.totalEmployees,
                    active: stats.activeEmployees,
                    inactive: stats.totalEmployees - stats.activeEmployees
                },
                leaveRequests: {
                    total: stats.pendingLeaveRequests + stats.approvedLeaveRequests + stats.rejectedLeaveRequests,
                    pending: stats.pendingLeaveRequests,
                    approved: stats.approvedLeaveRequests,
                    rejected: stats.rejectedLeaveRequests
                },
                leaveDays: {
                    total: stats.totalLeaveDays,
                    used: stats.usedLeaveDays,
                    remaining: stats.totalLeaveDays - stats.usedLeaveDays
                },
                upcomingHolidays: stats.upcomingHolidays
            };
            const response = {
                success: true,
                message: 'System overview retrieved successfully',
                data: overview
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getSystemOverview:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve system overview',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=dashboardController.js.map