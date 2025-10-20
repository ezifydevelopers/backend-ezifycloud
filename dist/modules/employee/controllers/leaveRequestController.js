"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveRequestController = void 0;
const leaveRequestService_1 = require("../services/leaveRequestService");
class LeaveRequestController {
    static async createLeaveRequest(req, res) {
        try {
            const employeeId = req.user?.id;
            const formData = req.body;
            console.log('🔍 LeaveRequestController: Received data:', {
                employeeId,
                formData,
                body: req.body,
                user: req.user
            });
            console.log('🔍 LeaveRequestController: Validation details:', {
                leaveType: formData.leaveType,
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason,
                isHalfDay: formData.isHalfDay,
                halfDayPeriod: formData.halfDayPeriod,
                emergencyContact: formData.emergencyContact,
                workHandover: formData.workHandover,
                attachments: formData.attachments
            });
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.createLeaveRequest(employeeId, formData);
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
            const employeeId = req.user?.id;
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
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const result = await leaveRequestService_1.LeaveRequestService.getLeaveRequests(employeeId, filters);
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
            const employeeId = req.user?.id;
            const { id } = req.params;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            if (!id) {
                const response = {
                    success: false,
                    message: 'Leave request ID is required',
                    error: 'Missing leave request ID'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.getLeaveRequestById(employeeId, id);
            if (!leaveRequest) {
                const response = {
                    success: false,
                    message: 'Leave request not found',
                    error: 'Leave request with the given ID does not exist or does not belong to you'
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
            const employeeId = req.user?.id;
            const { id } = req.params;
            const updateData = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            if (!id) {
                const response = {
                    success: false,
                    message: 'Leave request ID is required',
                    error: 'Missing leave request ID'
                };
                res.status(400).json(response);
                return;
            }
            const leaveRequest = await leaveRequestService_1.LeaveRequestService.updateLeaveRequest(employeeId, id, updateData);
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
            res.status(400).json(response);
        }
    }
    static async cancelLeaveRequest(req, res) {
        try {
            const employeeId = req.user?.id;
            const { id } = req.params;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            if (!id) {
                const response = {
                    success: false,
                    message: 'Leave request ID is required',
                    error: 'Missing leave request ID'
                };
                res.status(400).json(response);
                return;
            }
            const success = await leaveRequestService_1.LeaveRequestService.cancelLeaveRequest(employeeId, id);
            if (!success) {
                const response = {
                    success: false,
                    message: 'Failed to cancel leave request',
                    error: 'Leave request could not be cancelled'
                };
                res.status(400).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Leave request cancelled successfully',
                data: { cancelled: true }
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
            res.status(400).json(response);
        }
    }
    static async getLeaveHistory(req, res) {
        try {
            const employeeId = req.user?.id;
            const filters = {
                year: req.query.year ? parseInt(req.query.year) : undefined,
                leaveType: req.query.leaveType,
                status: req.query.status,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const result = await leaveRequestService_1.LeaveRequestService.getLeaveHistory(employeeId, filters);
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
    static async getLeaveHistorySummary(req, res) {
        try {
            const employeeId = req.user?.id;
            const { year } = req.query;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const filters = {
                year: year ? parseInt(year) : undefined,
                page: 1,
                limit: 1
            };
            const result = await leaveRequestService_1.LeaveRequestService.getLeaveHistory(employeeId, filters);
            const response = {
                success: true,
                message: 'Leave history summary retrieved successfully',
                data: result.summary
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveHistorySummary:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave history summary',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.LeaveRequestController = LeaveRequestController;
//# sourceMappingURL=leaveRequestController.js.map