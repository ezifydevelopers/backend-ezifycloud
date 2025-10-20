"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManagerDashboardController = void 0;
const dashboardService_1 = require("../services/dashboardService");
class ManagerDashboardController {
    static async getDashboardStats(req, res) {
        try {
            const managerId = req.user?.id;
            const { startDate, endDate, department } = req.query;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            } : undefined;
            const stats = await dashboardService_1.ManagerDashboardService.getDashboardStats(managerId, dateRange);
            const response = {
                success: true,
                message: 'Manager dashboard statistics retrieved successfully',
                data: stats
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getDashboardStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve manager dashboard statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getQuickStats(req, res) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.ManagerDashboardService.getQuickStats(managerId);
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
    static async getTeamPerformance(req, res) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.ManagerDashboardService.getDashboardStats(managerId);
            const performance = stats.teamPerformance;
            const response = {
                success: true,
                message: 'Team performance metrics retrieved successfully',
                data: performance
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamPerformance:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team performance metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getUpcomingLeaves(req, res) {
        try {
            const managerId = req.user?.id;
            const { limit = '5' } = req.query;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.ManagerDashboardService.getDashboardStats(managerId);
            const upcomingLeaves = stats.upcomingLeaves.slice(0, parseInt(limit, 10));
            const response = {
                success: true,
                message: 'Upcoming leaves retrieved successfully',
                data: upcomingLeaves
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getUpcomingLeaves:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve upcoming leaves',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getRecentActivities(req, res) {
        try {
            const managerId = req.user?.id;
            const { limit = '10' } = req.query;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.ManagerDashboardService.getDashboardStats(managerId);
            const activities = stats.recentActivities.slice(0, parseInt(limit, 10));
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
    static async getTeamLeaveBalance(req, res) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await dashboardService_1.ManagerDashboardService.getDashboardStats(managerId);
            const leaveBalance = stats.teamLeaveBalance;
            const response = {
                success: true,
                message: 'Team leave balance retrieved successfully',
                data: leaveBalance
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamLeaveBalance:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team leave balance',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getDepartmentStats(req, res) {
        try {
            const managerId = req.user?.id;
            const { startDate, endDate } = req.query;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
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
            const stats = await dashboardService_1.ManagerDashboardService.getDashboardStats(managerId, dateRange);
            const departmentStats = stats.departmentStats;
            const response = {
                success: true,
                message: 'Department statistics retrieved successfully',
                data: departmentStats
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
    static async getProfile(req, res) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const profile = await dashboardService_1.ManagerDashboardService.getProfile(managerId);
            const response = {
                success: true,
                message: 'Profile retrieved successfully',
                data: profile
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getProfile:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateProfile(req, res) {
        try {
            const managerId = req.user?.id;
            const profileData = req.body;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const updatedProfile = await dashboardService_1.ManagerDashboardService.updateProfile(managerId, profileData);
            const response = {
                success: true,
                message: 'Profile updated successfully',
                data: updatedProfile
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateProfile:', error);
            const response = {
                success: false,
                message: 'Failed to update profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.ManagerDashboardController = ManagerDashboardController;
//# sourceMappingURL=dashboardController.js.map