import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendanceService';
import { AttendanceFilters, AttendanceRecord } from '../types';
import { ApiResponse } from '../../../types';

export class AttendanceController {
  /**
   * Get all attendance records with filtering and pagination
   */
  static async getAttendanceRecords(req: Request, res: Response): Promise<void> {
    try {
      const filters: AttendanceFilters = {
        search: req.query.search as string,
        status: req.query.status as string,
        department: req.query.department as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'date',
        sortOrder: req.query.sortOrder as 'asc' | 'desc' || 'desc'
      };

      const result = await AttendanceService.getAttendanceRecords(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance records retrieved successfully',
        data: result.records,
        pagination: result.pagination
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getAttendanceRecords:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve attendance records',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get attendance statistics
   */
  static async getAttendanceStats(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const dateRange = startDate && endDate ? { startDate, endDate } : undefined;

      const stats = await AttendanceService.getAttendanceStats(dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getAttendanceStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve attendance statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get attendance record by ID
   */
  static async getAttendanceRecordById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Attendance record ID is required',
          error: 'Missing attendance record ID'
        };
        res.status(400).json(response);
        return;
      }

      const record = await AttendanceService.getAttendanceRecordById(id);

      if (!record) {
        const response: ApiResponse = {
          success: false,
          message: 'Attendance record not found',
          error: 'Attendance record does not exist'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Attendance record retrieved successfully',
        data: record
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getAttendanceRecordById:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve attendance record',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Create attendance record
   */
  static async createAttendanceRecord(req: Request, res: Response): Promise<void> {
    try {
      const recordData = req.body;

      // Validate required fields
      if (!recordData.userId || !recordData.date) {
        const response: ApiResponse = {
          success: false,
          message: 'User ID and date are required',
          error: 'Missing required fields'
        };
        res.status(400).json(response);
        return;
      }

      const record = await AttendanceService.createAttendanceRecord(recordData);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance record created successfully',
        data: record
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error in createAttendanceRecord:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to create attendance record',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update attendance record
   */
  static async updateAttendanceRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Attendance record ID is required',
          error: 'Missing attendance record ID'
        };
        res.status(400).json(response);
        return;
      }

      const record = await AttendanceService.updateAttendanceRecord(id, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Attendance record updated successfully',
        data: record
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateAttendanceRecord:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update attendance record',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Delete attendance record
   */
  static async deleteAttendanceRecord(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        const response: ApiResponse = {
          success: false,
          message: 'Attendance record ID is required',
          error: 'Missing attendance record ID'
        };
        res.status(400).json(response);
        return;
      }

      const success = await AttendanceService.deleteAttendanceRecord(id);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          message: 'Failed to delete attendance record',
          error: 'Attendance record could not be deleted'
        };
        res.status(500).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Attendance record deleted successfully',
        data: { deleted: true }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in deleteAttendanceRecord:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete attendance record',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get attendance records for a specific user
   */
  static async getUserAttendanceRecords(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User ID is required',
          error: 'Missing user ID'
        };
        res.status(400).json(response);
        return;
      }

      const dateRange = startDate && endDate ? { startDate, endDate } : undefined;

      const records = await AttendanceService.getUserAttendanceRecords(userId, dateRange);

      const response: ApiResponse = {
        success: true,
        message: 'User attendance records retrieved successfully',
        data: records
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUserAttendanceRecords:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve user attendance records',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
