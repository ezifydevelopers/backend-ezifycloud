import { Request, Response } from 'express';
import prisma from '../../../lib/prisma';
import { ApiResponse } from '../../../types';

export class HolidayController {
  // Get upcoming holidays for employees
  static async getUpcomingHolidays(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      const today = new Date();
      
      const holidays = await prisma.holiday.findMany({
        where: {
          isActive: true,
          date: {
            gte: today
          }
        },
        take: parseInt(limit as string),
        orderBy: { date: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          date: true,
          type: true,
          isRecurring: true
        }
      });
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Upcoming holidays fetched successfully',
        data: holidays
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching upcoming holidays:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to fetch upcoming holidays',
        data: null
      };
      res.status(500).json(response);
    }
  }

  // Get holidays for a specific year
  static async getHolidaysByYear(req: Request, res: Response): Promise<void> {
    try {
      const { year = new Date().getFullYear().toString() } = req.query;
      
      const startDate = new Date(parseInt(year as string), 0, 1);
      const endDate = new Date(parseInt(year as string), 11, 31);
      
      const holidays = await prisma.holiday.findMany({
        where: {
          isActive: true,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          date: true,
          type: true,
          isRecurring: true
        }
      });
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Holidays fetched successfully',
        data: holidays
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching holidays by year:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to fetch holidays',
        data: null
      };
      res.status(500).json(response);
    }
  }

  // Get holidays by type
  static async getHolidaysByType(req: Request, res: Response): Promise<void> {
    try {
      const { type, year = new Date().getFullYear().toString() } = req.query;
      
      if (!type) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Holiday type is required',
          data: null
        };
        res.status(400).json(response);
        return;
      }
      
      const startDate = new Date(parseInt(year as string), 0, 1);
      const endDate = new Date(parseInt(year as string), 11, 31);
      
      const holidays = await prisma.holiday.findMany({
        where: {
          isActive: true,
          type: type as any,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          date: true,
          type: true,
          isRecurring: true
        }
      });
      
      const response: ApiResponse<any> = {
        success: true,
        message: 'Holidays by type fetched successfully',
        data: holidays
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching holidays by type:', error);
      const response: ApiResponse<null> = {
        success: false,
        message: 'Failed to fetch holidays',
        data: null
      };
      res.status(500).json(response);
    }
  }
}
