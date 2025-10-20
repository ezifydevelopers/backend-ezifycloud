"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalController = void 0;
const approvalService_1 = require("../services/approvalService");
class ApprovalController {
    static async getLeaveApprovals(req, res) {
        try {
            const managerId = req.user?.id;
            const filters = {
                search: req.query.search,
                status: req.query.status,
                leaveType: req.query.leaveType,
                priority: req.query.priority,
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
            const result = await approvalService_1.ApprovalService.getLeaveApprovals(managerId, filters);
            const response = {
                success: true,
                message: 'Leave approvals retrieved successfully',
                data: result.approvals,
                pagination: result.pagination
            };
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveApprovals:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave approvals',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeaveApprovalById(req, res) {
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
            if (!id) {
                const response = {
                    success: false,
                    message: 'Approval ID is required',
                    error: 'Missing approval ID'
                };
                res.status(400).json(response);
                return;
            }
            const approval = await approvalService_1.ApprovalService.getLeaveApprovalById(managerId, id);
            if (!approval) {
                const response = {
                    success: false,
                    message: 'Leave approval not found',
                    error: 'Leave approval with the given ID does not exist or is not under your management'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Leave approval retrieved successfully',
                data: approval
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveApprovalById:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave approval',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async processApprovalAction(req, res) {
        try {
            const managerId = req.user?.id;
            const action = req.body;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            if (!action.requestId || !action.action) {
                const response = {
                    success: false,
                    message: 'Request ID and action are required',
                    error: 'Missing required fields'
                };
                res.status(400).json(response);
                return;
            }
            if (!['approve', 'reject'].includes(action.action)) {
                const response = {
                    success: false,
                    message: 'Action must be either approve or reject',
                    error: 'Invalid action value'
                };
                res.status(400).json(response);
                return;
            }
            const approval = await approvalService_1.ApprovalService.processApprovalAction(managerId, action);
            const response = {
                success: true,
                message: `Leave request ${action.action}d successfully`,
                data: approval
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in processApprovalAction:', error);
            const response = {
                success: false,
                message: 'Failed to process approval action',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async processBulkApprovalAction(req, res) {
        try {
            const managerId = req.user?.id;
            const action = req.body;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            if (!action.requestIds || !Array.isArray(action.requestIds) || action.requestIds.length === 0) {
                const response = {
                    success: false,
                    message: 'Request IDs array is required',
                    error: 'Missing or invalid request IDs'
                };
                res.status(400).json(response);
                return;
            }
            if (!action.action || !['approve', 'reject'].includes(action.action)) {
                const response = {
                    success: false,
                    message: 'Action must be either approve or reject',
                    error: 'Invalid action value'
                };
                res.status(400).json(response);
                return;
            }
            const result = await approvalService_1.ApprovalService.processBulkApprovalAction(managerId, action);
            const response = {
                success: true,
                message: `Bulk ${action.action} completed: ${result.updated} updated, ${result.failed} failed`,
                data: result
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in processBulkApprovalAction:', error);
            const response = {
                success: false,
                message: 'Failed to process bulk approval action',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async getApprovalStats(req, res) {
        try {
            console.log('🔍 getApprovalStats: Starting...');
            const managerId = req.user?.id;
            const { startDate, endDate } = req.query;
            console.log('🔍 getApprovalStats: managerId:', managerId);
            console.log('🔍 getApprovalStats: query params:', { startDate, endDate });
            if (!managerId) {
                console.log('❌ getApprovalStats: No manager ID found');
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
            const stats = await approvalService_1.ApprovalService.getApprovalStats(managerId, dateRange);
            const response = {
                success: true,
                message: 'Approval statistics retrieved successfully',
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
            console.error('Error in getApprovalStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve approval statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getPendingCount(req, res) {
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
            const count = await approvalService_1.ApprovalService.getPendingCount(managerId);
            const response = {
                success: true,
                message: 'Pending count retrieved successfully',
                data: { pendingCount: count }
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
    static async getUrgentApprovals(req, res) {
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
            const urgentApprovals = await approvalService_1.ApprovalService.getUrgentApprovals(managerId);
            const response = {
                success: true,
                message: 'Urgent approvals retrieved successfully',
                data: urgentApprovals
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getUrgentApprovals:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve urgent approvals',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getApprovalHistory(req, res) {
        try {
            const managerId = req.user?.id;
            const { page = '1', limit = '10' } = req.query;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const filters = {
                status: 'all',
                page: parseInt(page),
                limit: parseInt(limit),
                sortBy: 'approvedAt',
                sortOrder: 'desc'
            };
            const result = await approvalService_1.ApprovalService.getLeaveApprovals(managerId, filters);
            const response = {
                success: true,
                message: 'Approval history retrieved successfully',
                data: result.approvals,
                pagination: result.pagination
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getApprovalHistory:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve approval history',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.ApprovalController = ApprovalController;
//# sourceMappingURL=approvalController.js.map