"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestController = void 0;
const leaveRequestService_1 = require("../services/leaveRequestService");
class LeaveRequestController {
    static async createLeaveRequest(req, res) {
        try {
            const managerId = req.user?.id;
            const formData = req.body;
            console.log('🔍 ManagerLeaveRequestController: Received data:', {
                managerId,
                formData,
                body: req.body,
                user: req.user
            });
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.createLeaveRequest(managerId, formData);
            const response = {
                success: true,
                message: 'Leave request created successfully',
                data: leaveRequest
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error in createLeaveRequest:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create leave request';
            const response = {
                success: false,
                message: errorMessage,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async getLeaveRequests(req, res) {
        try {
            const managerId = req.user?.id;
            const filters = {
                status: req.query.status,
                leaveType: req.query.leaveType,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const result = await leaveRequestService_1.LeaveRequestService.getLeaveRequests(managerId, filters);
            const response = {
                success: true,
                message: 'Leave requests retrieved successfully',
                data: result.leaveRequests,
                pagination: result.pagination
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveRequests:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave requests',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeaveRequestById(req, res) {
        try {
            const managerId = req.user?.id;
            const { id } = req.params;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.getLeaveRequestById(managerId, id);
            if (!leaveRequest) {
                const response = {
                    success: false,
                    message: 'Leave request not found',
                    error: 'Leave request does not exist or does not belong to this manager'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Leave request retrieved successfully',
                data: leaveRequest
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveRequestById:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave request',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateLeaveRequest(req, res) {
        try {
            const managerId = req.user?.id;
            const { id } = req.params;
            const updateData = req.body;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.updateLeaveRequest(managerId, id, updateData);
            if (!leaveRequest) {
                const response = {
                    success: false,
                    message: 'Leave request not found',
                    error: 'Leave request does not exist or does not belong to this manager'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Leave request updated successfully',
                data: leaveRequest
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateLeaveRequest:', error);
            const response = {
                success: false,
                message: 'Failed to update leave request',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async cancelLeaveRequest(req, res) {
        try {
            const managerId = req.user?.id;
            const { id } = req.params;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.cancelLeaveRequest(managerId, id);
            if (!leaveRequest) {
                const response = {
                    success: false,
                    message: 'Leave request not found',
                    error: 'Leave request does not exist or does not belong to this manager'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Leave request cancelled successfully',
                data: leaveRequest
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in cancelLeaveRequest:', error);
            const response = {
                success: false,
                message: 'Failed to cancel leave request',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeaveHistory(req, res) {
        try {
            const managerId = req.user?.id;
            const filters = {
                status: req.query.status,
                leaveType: req.query.leaveType,
                year: req.query.year ? parseInt(req.query.year) : undefined,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'submittedAt',
                sortOrder: req.query.sortOrder || 'desc'
            };
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const result = await leaveRequestService_1.LeaveRequestService.getLeaveHistory(managerId, filters);
            const response = {
                success: true,
                message: 'Leave history retrieved successfully',
                data: result.leaveHistory,
                pagination: result.pagination
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveHistory:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave history',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getRecentRequests(req, res) {
        try {
            const managerId = req.user?.id;
            const limit = parseInt(req.query.limit) || 5;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const recentRequests = await leaveRequestService_1.LeaveRequestService.getRecentRequests(managerId, limit);
            const response = {
                success: true,
                message: 'Recent leave requests retrieved successfully',
                data: recentRequests
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getRecentRequests:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve recent leave requests',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeaveBalance(req, res) {
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
            const leaveBalance = await leaveRequestService_1.LeaveRequestService.getLeaveBalance(managerId);
            const response = {
                success: true,
                message: 'Leave balance retrieved successfully',
                data: leaveBalance
            };
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
}
exports.LeaveRequestController = LeaveRequestController;
//# sourceMappingURL=leaveRequestController.js.map