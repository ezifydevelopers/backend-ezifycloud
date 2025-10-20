"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeDashboardController = void 0;
const dashboardService_1 = require("../services/dashboardService");
class EmployeeDashboardController {
    static async getDashboardStats(req, res) {
        try {
            const employeeId = req.user?.id;
            const { startDate, endDate } = req.query;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            } : undefined;
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId, dateRange);
            const response = {
                success: true,
                message: 'Employee dashboard statistics retrieved successfully',
                data: stats
            };
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getDashboardStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve employee dashboard statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getPersonalInfo(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId);
            const personalInfo = stats.personalInfo;
            const response = {
                success: true,
                message: 'Personal information retrieved successfully',
                data: personalInfo
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getPersonalInfo:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve personal information',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeaveBalance(req, res) {
        try {
            const employeeId = req.user?.id;
            const { startDate, endDate } = req.query;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            } : {
                startDate: new Date(new Date().getFullYear(), 0, 1),
                endDate: new Date()
            };
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId, dateRange);
            const leaveBalance = stats.leaveBalance;
            const response = {
                success: true,
                message: 'Leave balance retrieved successfully',
                data: leaveBalance
            };
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveBalance:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave balance',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getRecentLeaveRequests(req, res) {
        try {
            const employeeId = req.user?.id;
            const { limit = '5' } = req.query;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId);
            const recentRequests = stats.recentRequests.slice(0, parseInt(limit, 10));
            const response = {
                success: true,
                message: 'Recent leave requests retrieved successfully',
                data: recentRequests
            };
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getRecentLeaveRequests:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve recent leave requests',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getUpcomingHolidays(req, res) {
        try {
            const employeeId = req.user?.id;
            const { limit = '5' } = req.query;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId);
            const upcomingHolidays = stats.upcomingHolidays.slice(0, parseInt(limit, 10));
            const response = {
                success: true,
                message: 'Upcoming holidays retrieved successfully',
                data: upcomingHolidays
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getUpcomingHolidays:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve upcoming holidays',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamInfo(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId);
            const teamInfo = stats.teamInfo;
            const response = {
                success: true,
                message: 'Team information retrieved successfully',
                data: teamInfo
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamInfo:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team information',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getPerformanceMetrics(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId);
            const performance = stats.performance;
            const response = {
                success: true,
                message: 'Performance metrics retrieved successfully',
                data: performance
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getPerformanceMetrics:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve performance metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getNotifications(req, res) {
        try {
            const employeeId = req.user?.id;
            const { limit = '10' } = req.query;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId);
            const notifications = stats.notifications.slice(0, parseInt(limit, 10));
            const response = {
                success: true,
                message: 'Notifications retrieved successfully',
                data: notifications
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getNotifications:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve notifications',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getQuickStats(req, res) {
        try {
            const employeeId = req.user?.id;
            const { startDate, endDate } = req.query;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            } : {
                startDate: new Date(new Date().getFullYear(), 0, 1),
                endDate: new Date()
            };
            const stats = await dashboardService_1.EmployeeDashboardService.getDashboardStats(employeeId, dateRange);
            const quickStats = stats.quickStats;
            const response = {
                success: true,
                message: 'Quick statistics retrieved successfully',
                data: quickStats
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
}
exports.EmployeeDashboardController = EmployeeDashboardController;
//# sourceMappingURL=dashboardController.js.map