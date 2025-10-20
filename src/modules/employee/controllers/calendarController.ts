import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../../../types';

const prisma = new PrismaClient();

export class CalendarController {
  /**
   * Get employee calendar events
   */
  static async getCalendarEvents(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Authentication required'
        };
        res.status(401).json(response);
        return;
      }

      // Get leave requests for the user
      const leaveRequests = await prisma.leaveRequest.findMany({
        where: {
          userId,
          startDate: {
            gte: startDate ? new Date(startDate as string) : new Date(),
            lte: endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
          }
        },
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          status: true,
          reason: true,
          isHalfDay: true,
          halfDayPeriod: true
        }
      });

      // Transform leave requests into calendar events
      const events = leaveRequests.map(request => ({
        id: request.id,
        title: `${request.leaveType} Leave`,
        start: request.startDate,
        end: request.endDate,
        type: 'leave',
        status: request.status,
        description: request.reason,
        isHalfDay: request.isHalfDay,
        halfDayPeriod: request.halfDayPeriod
      }));

      const response: ApiResponse = {
        success: true,
        message: 'Calendar events retrieved successfully',
        data: events
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getCalendarEvents:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve calendar events',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get upcoming events
   */
  static async getUpcomingEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Authentication required'
        };
        res.status(401).json(response);
        return;
      }

      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      const upcomingEvents = await prisma.leaveRequest.findMany({
        where: {
          userId,
          startDate: {
            gte: today,
            lte: nextWeek
          }
        },
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          status: true,
          reason: true
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      const response: ApiResponse = {
        success: true,
        message: 'Upcoming events retrieved successfully',
        data: upcomingEvents
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getUpcomingEvents:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve upcoming events',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get calendar statistics
   */
  static async getCalendarStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Authentication required'
        };
        res.status(401).json(response);
        return;
      }

      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);
      const endOfYear = new Date(currentYear, 11, 31);

      // Get leave statistics for current year
      const leaveStats = await prisma.leaveRequest.groupBy({
        by: ['leaveType', 'status'],
        where: {
          userId,
          startDate: {
            gte: startOfYear,
            lte: endOfYear
          }
        },
        _count: {
          id: true
        }
      });

      // Get total days taken
      const totalDaysTaken = await prisma.leaveRequest.aggregate({
        where: {
          userId,
          startDate: {
            gte: startOfYear,
            lte: endOfYear
          },
          status: {
            in: ['approved', 'pending']
          }
        },
        _sum: {
          totalDays: true
        }
      });

      const stats = {
        totalDaysTaken: totalDaysTaken._sum.totalDays || 0,
        leaveBreakdown: leaveStats,
        currentYear
      };

      const response: ApiResponse = {
        success: true,
        message: 'Calendar statistics retrieved successfully',
        data: stats
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getCalendarStats:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve calendar statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get current month events
   */
  static async getCurrentMonthEvents(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Authentication required'
        };
        res.status(401).json(response);
        return;
      }

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const currentMonthEvents = await prisma.leaveRequest.findMany({
        where: {
          userId,
          startDate: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          status: true,
          reason: true,
          isHalfDay: true,
          halfDayPeriod: true
        },
        orderBy: {
          startDate: 'asc'
        }
      });

      // Transform leave requests into calendar events
      const events = currentMonthEvents.map(request => ({
        id: request.id,
        title: `${request.leaveType} Leave`,
        start: request.startDate,
        end: request.endDate,
        type: 'leave',
        status: request.status,
        description: request.reason,
        isHalfDay: request.isHalfDay,
        halfDayPeriod: request.halfDayPeriod
      }));

      const response: ApiResponse = {
        success: true,
        message: 'Current month events retrieved successfully',
        data: {
          events,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
          totalEvents: events.length
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getCurrentMonthEvents:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve current month events',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
