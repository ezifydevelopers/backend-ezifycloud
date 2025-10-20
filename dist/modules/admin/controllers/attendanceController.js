"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceController = void 0;
const attendanceService_1 = require("../services/attendanceService");
class AttendanceController {
    static async getAttendanceRecords(req, res) {
        try {
            const filters = {
                search: req.query.search,
                status: req.query.status,
                department: req.query.department,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'date',
                sortOrder: req.query.sortOrder || 'desc'
            };
            const result = await attendanceService_1.AttendanceService.getAttendanceRecords(filters);
            const response = {
                success: true,
                message: 'Attendance records retrieved successfully',
                data: result.records,
                pagination: result.pagination
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getAttendanceRecords:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve attendance records',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getAttendanceStats(req, res) {
        try {
            const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
            const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
            const stats = await attendanceService_1.AttendanceService.getAttendanceStats(dateRange);
            const response = {
                success: true,
                message: 'Attendance statistics retrieved successfully',
                data: stats
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getAttendanceStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve attendance statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getAttendanceRecordById(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                const response = {
                    success: false,
                    message: 'Attendance record ID is required',
                    error: 'Missing attendance record ID'
                };
                res.status(400).json(response);
                return;
            }
            const record = await attendanceService_1.AttendanceService.getAttendanceRecordById(id);
            if (!record) {
                const response = {
                    success: false,
                    message: 'Attendance record not found',
                    error: 'Attendance record does not exist'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Attendance record retrieved successfully',
                data: record
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getAttendanceRecordById:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve attendance record',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async createAttendanceRecord(req, res) {
        try {
            const recordData = req.body;
            if (!recordData.userId || !recordData.date) {
                const response = {
                    success: false,
                    message: 'User ID and date are required',
                    error: 'Missing required fields'
                };
                res.status(400).json(response);
                return;
            }
            const record = await attendanceService_1.AttendanceService.createAttendanceRecord(recordData);
            const response = {
                success: true,
                message: 'Attendance record created successfully',
                data: record
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error in createAttendanceRecord:', error);
            const response = {
                success: false,
                message: 'Failed to create attendance record',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateAttendanceRecord(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            if (!id) {
                const response = {
                    success: false,
                    message: 'Attendance record ID is required',
                    error: 'Missing attendance record ID'
                };
                res.status(400).json(response);
                return;
            }
            const record = await attendanceService_1.AttendanceService.updateAttendanceRecord(id, updateData);
            const response = {
                success: true,
                message: 'Attendance record updated successfully',
                data: record
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateAttendanceRecord:', error);
            const response = {
                success: false,
                message: 'Failed to update attendance record',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async deleteAttendanceRecord(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                const response = {
                    success: false,
                    message: 'Attendance record ID is required',
                    error: 'Missing attendance record ID'
                };
                res.status(400).json(response);
                return;
            }
            const success = await attendanceService_1.AttendanceService.deleteAttendanceRecord(id);
            if (!success) {
                const response = {
                    success: false,
                    message: 'Failed to delete attendance record',
                    error: 'Attendance record could not be deleted'
                };
                res.status(500).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Attendance record deleted successfully',
                data: { deleted: true }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in deleteAttendanceRecord:', error);
            const response = {
                success: false,
                message: 'Failed to delete attendance record',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getUserAttendanceRecords(req, res) {
        try {
            const { userId } = req.params;
            const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
            const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
            if (!userId) {
                const response = {
                    success: false,
                    message: 'User ID is required',
                    error: 'Missing user ID'
                };
                res.status(400).json(response);
                return;
            }
            const dateRange = startDate && endDate ? { startDate, endDate } : undefined;
            const records = await attendanceService_1.AttendanceService.getUserAttendanceRecords(userId, dateRange);
            const response = {
                success: true,
                message: 'User attendance records retrieved successfully',
                data: records
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getUserAttendanceRecords:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve user attendance records',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.AttendanceController = AttendanceController;
//# sourceMappingURL=attendanceController.js.map