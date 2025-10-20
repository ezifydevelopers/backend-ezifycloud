import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import { ApiResponse, PaginatedResponse } from '../../../types';

export class HolidayController {
  // Get all holidays with pagination and filtering
  static async getHolidays(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { 
        type = 'all', 
        year = new Date().getFullYear().toString(),
        limit = 50, 
        page = 1 
      } = req.query;
      
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      
      // Build where clause - admins can see all holidays
      const where: any = {};
      
      if (type !== 'all') {
        where.type = type;
      }
      
      if (year && year !== 'all') {
        const startDate = new Date(parseInt(year as string), 0, 1);
        const endDate = new Date(parseInt(year as string), 11, 31);
        where.date = {
          gte: startDate,
          lte: endDate
        };
      }
      
      const holidays = await prisma.holiday.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { date: 'asc' },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      const total = await prisma.holiday.count({ where });
      
      const response: PaginatedResponse<any> = {
        success: true,
        message: 'Holidays fetched successfully',
        data: holidays,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to fetch holidays',
        data: null
      };
      res.status(500).json(response);
    }
  }

  // Get holiday by ID
  static async getHolidayById(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { id } = req.params;
      
      const holiday = await prisma.holiday.findFirst({
        where: { id },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      if (!holiday) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Holiday not found',
          data: null
        };
        res.status(404).json(response);
        return;
      }
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Holiday fetched successfully',
        data: holiday
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching holiday:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to fetch holiday',
        data: null
      };
      res.status(500).json(response);
    }
  }

  // Create new holiday
  static async createHoliday(req: Request, res: Response): Promise<void> {
    const adminId = (req as any).user?.id;
    const holidayData = req.body;
    
    try {
      console.log('🔍 HolidayController: Creating holiday:', holidayData);
      
      // Check if holiday with same name and date already exists
      const existingHoliday = await prisma.holiday.findFirst({
        where: {
          name: holidayData.name,
          date: new Date(holidayData.date)
        }
      });
      
      if (existingHoliday) {
        const response: ApiResponse<null> = {
          success: false,
          message: `A holiday with the name "${holidayData.name}" on ${new Date(holidayData.date).toLocaleDateString()} already exists. Please use a different name or date.`,
          data: null
        };
        res.status(400).json(response);
        return;
      }
      
      const holiday = await prisma.holiday.create({
        data: {
          ...holidayData,
          createdBy: adminId
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Holiday created successfully',
        data: holiday
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Error creating holiday:', error);
      console.error('❌ Holiday data received:', holidayData);
      console.error('❌ Admin ID:', adminId);
      
      const response: ApiResponse<null> = {
        success: false,
        message: `Failed to create holiday: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null
      };
      res.status(500).json(response);
    }
  }

  // Update holiday
  static async updateHoliday(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { id } = req.params;
      const updateData = req.body;
      
      // Check if holiday exists
      const existingHoliday = await prisma.holiday.findFirst({
        where: { id }
      });
      
      if (!existingHoliday) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Holiday not found',
          data: null
        };
        res.status(404).json(response);
        return;
      }
      
      const holiday = await prisma.holiday.update({
        where: { id },
        data: updateData,
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Holiday updated successfully',
        data: holiday
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error updating holiday:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to update holiday',
        data: null
      };
      res.status(500).json(response);
    }
  }

  // Delete holiday
  static async deleteHoliday(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { id } = req.params;
      
      // Check if holiday exists
      const existingHoliday = await prisma.holiday.findFirst({
        where: { id }
      });
      
      if (!existingHoliday) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Holiday not found',
          data: null
        };
        res.status(404).json(response);
        return;
      }
      
      await prisma.holiday.delete({
        where: { id }
      });
      
      const response: ApiResponse<null> = {
        success: true,
        message: 'Holiday deleted successfully',
        data: null
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error deleting holiday:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to delete holiday',
        data: null
      };
      res.status(500).json(response);
    }
  }

  // Toggle holiday status
  static async toggleHolidayStatus(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { id } = req.params;
      const { isActive } = req.body;
      
      // Check if holiday exists
      const existingHoliday = await prisma.holiday.findFirst({
        where: { id }
      });
      
      if (!existingHoliday) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Holiday not found',
          data: null
        };
        res.status(404).json(response);
        return;
      }
      
      const holiday = await prisma.holiday.update({
        where: { id },
        data: { isActive: isActive },
        include: {
          creator: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      const response: ApiResponse<any> = {
        success: true,
        message: `Holiday ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: holiday
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error toggling holiday status:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to toggle holiday status',
        data: null
      };
      res.status(500).json(response);
    }
  }

  // Get holiday statistics
  static async getHolidayStats(req: Request, res: Response): Promise<void> {
    try {
      const adminId = (req as any).user?.id;
      const { year = 'all' } = req.query;
      
      const where: any = {};
      
      if (year && year !== 'all') {
        const startDate = new Date(parseInt(year as string), 0, 1);
        const endDate = new Date(parseInt(year as string), 11, 31);
        where.date = {
          gte: startDate,
          lte: endDate
        };
      }
      
      const totalHolidays = await prisma.holiday.count({ where });
      const activeHolidays = await prisma.holiday.count({ 
        where: { ...where, isActive: true } 
      });
      const publicHolidays = await prisma.holiday.count({ 
        where: { ...where, type: 'public' } 
      });
      const companyHolidays = await prisma.holiday.count({ 
        where: { ...where, type: 'company' } 
      });
      
      const stats = {
        totalHolidays,
        activeHolidays,
        publicHolidays,
        companyHolidays,
        inactiveHolidays: totalHolidays - activeHolidays
      };
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Holiday statistics fetched successfully',
        data: stats
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching holiday stats:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to fetch holiday statistics',
        data: null
      };
      res.status(500).json(response);
    }
  }
}
