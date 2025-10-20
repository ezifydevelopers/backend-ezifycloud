"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestController = void 0;
const leaveRequestService_1 = require("../services/leaveRequestService");
class LeaveRequestController {
    static async getLeaveRequests(req, res) {
        try {
            const filters = {
                search: req.query.search,
                status: req.query.status,
                leaveType: req.query.leaveType,
                department: req.query.department,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };
            const result = await leaveRequestService_1.LeaveRequestService.getLeaveRequests(filters);
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
            const { id } = req.params;
            if (!id) {
                const response = {
                    success: false,
                    message: 'Leave request ID is required',
                    error: 'Missing leave request ID'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.getLeaveRequestById(id);
            if (!leaveRequest) {
                const response = {
                    success: false,
                    message: 'Leave request not found',
                    error: 'Leave request with the given ID does not exist'
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
    static async updateLeaveRequestStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, comments } = req.body;
            const reviewerId = req.user?.id;
            if (!id) {
                const response = {
                    success: false,
                    message: 'Leave request ID is required',
                    error: 'Missing leave request ID'
                };
                res.status(400).json(response);
                return;
            }
            if (!status || !['approved', 'rejected'].includes(status)) {
                const response = {
                    success: false,
                    message: 'Valid status is required (approved or rejected)',
                    error: 'Invalid status value'
                };
                res.status(400).json(response);
                return;
            }
            if (!reviewerId) {
                const response = {
                    success: false,
                    message: 'Reviewer ID is required',
                    error: 'Missing reviewer information'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.updateLeaveRequestStatus(id, status, reviewerId, comments);
            const response = {
                success: true,
                message: `Leave request ${status} successfully`,
                data: leaveRequest
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateLeaveRequestStatus:', error);
            const response = {
                success: false,
                message: 'Failed to update leave request status',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async bulkUpdateLeaveRequests(req, res) {
        try {
            const { requestIds, status, comments } = req.body;
            const reviewerId = req.user?.id;
            if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
                const response = {
                    success: false,
                    message: 'Request IDs array is required',
                    error: 'Missing or invalid request IDs'
                };
                res.status(400).json(response);
                return;
            }
            if (!status || !['approved', 'rejected'].includes(status)) {
                const response = {
                    success: false,
                    message: 'Valid status is required (approved or rejected)',
                    error: 'Invalid status value'
                };
                res.status(400).json(response);
                return;
            }
            if (!reviewerId) {
                const response = {
                    success: false,
                    message: 'Reviewer ID is required',
                    error: 'Missing reviewer information'
                };
                res.status(400).json(response);
                return;
            }
            const result = await leaveRequestService_1.LeaveRequestService.bulkUpdateLeaveRequests(requestIds, status, reviewerId, comments);
            const response = {
                success: true,
                message: `Bulk update completed: ${result.updated} updated, ${result.failed} failed`,
                data: result
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in bulkUpdateLeaveRequests:', error);
            const response = {
                success: false,
                message: 'Failed to bulk update leave requests',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async getLeaveRequestStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const dateRange = startDate && endDate ? {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            } : undefined;
            const stats = await leaveRequestService_1.LeaveRequestService.getLeaveRequestStats(dateRange);
            const response = {
                success: true,
                message: 'Leave request statistics retrieved successfully',
                data: stats
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveRequestStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave request statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeaveTypes(req, res) {
        try {
            const leaveTypes = await leaveRequestService_1.LeaveRequestService.getLeaveTypes();
            const response = {
                success: true,
                message: 'Leave types retrieved successfully',
                data: leaveTypes
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveTypes:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave types',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getRecentLeaveRequests(req, res) {
        try {
            const { limit = '5' } = req.query;
            const limitNum = parseInt(limit, 10);
            const leaveRequests = await leaveRequestService_1.LeaveRequestService.getRecentLeaveRequests(limitNum);
            const response = {
                success: true,
                message: 'Recent leave requests retrieved successfully',
                data: leaveRequests
            };
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
    static async getPendingCount(req, res) {
        try {
            const stats = await leaveRequestService_1.LeaveRequestService.getLeaveRequestStats();
            const pendingCount = stats.pending;
            const response = {
                success: true,
                message: 'Pending count retrieved successfully',
                data: { pendingCount }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getPendingCount:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve pending count',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.LeaveRequestController = LeaveRequestController;
//# sourceMappingURL=leaveRequestController.js.map