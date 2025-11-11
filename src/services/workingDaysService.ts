import prisma from '../lib/prisma';

export interface WorkingDaysResult {
  year: number;
  month: number;
  totalDays: number;
  workingDays: number;
  weekends: number;
  holidays: number;
  workingDaysList: Date[];
  weekendDaysList: Date[];
  holidayDaysList: Date[];
}

export interface MonthlyCalendar {
  year: number;
  month: number;
  calendar: Array<{
    date: Date;
    dayOfWeek: number; // 0 = Sunday, 6 = Saturday
    isWeekend: boolean;
    isHoliday: boolean;
    isWorkingDay: boolean;
    holidayName?: string;
  }>;
  summary: {
    totalDays: number;
    workingDays: number;
    weekends: number;
    holidays: number;
  };
}

export class WorkingDaysService {
  /**
   * Calculate working days for a specific month
   * Excludes weekends (Saturday, Sunday) and holidays
   */
  static async calculateWorkingDays(
    year: number,
    month: number, // 1-12
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5] // Monday-Friday by default
  ): Promise<WorkingDaysResult> {
    try {
      // Get start and end of month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of month

      // Get all holidays for this month
      const holidays = await prisma.holiday.findMany({
        where: {
          isActive: true,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          date: true,
          name: true,
        },
      });

      const holidayDates = new Set(
        holidays.map(h => {
          const d = new Date(h.date);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
      );

      const workingDaysList: Date[] = [];
      const weekendDaysList: Date[] = [];
      const holidayDaysList: Date[] = [];

      let workingDays = 0;
      let weekends = 0;
      let holidaysCount = 0;

      // Iterate through each day of the month
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
        const isHoliday = holidayDates.has(dateKey);

        // Check if it's a weekend (default: Saturday = 6, Sunday = 0)
        const isWeekend = !workingDaysPerWeek.includes(dayOfWeek);

        if (isHoliday) {
          holidaysCount++;
          holidayDaysList.push(new Date(currentDate));
        } else if (isWeekend) {
          weekends++;
          weekendDaysList.push(new Date(currentDate));
        } else {
          workingDays++;
          workingDaysList.push(new Date(currentDate));
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const totalDays = endDate.getDate();

      return {
        year,
        month,
        totalDays,
        workingDays,
        weekends,
        holidays: holidaysCount,
        workingDaysList,
        weekendDaysList,
        holidayDaysList,
      };
    } catch (error) {
      console.error('Error calculating working days:', error);
      throw error instanceof Error ? error : new Error('Failed to calculate working days');
    }
  }

  /**
   * Generate monthly calendar with working days, weekends, and holidays
   */
  static async generateMonthlyCalendar(
    year: number,
    month: number,
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5]
  ): Promise<MonthlyCalendar> {
    const result = await this.calculateWorkingDays(year, month, workingDaysPerWeek);

    // Get holidays with names
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const holidays = await prisma.holiday.findMany({
      where: {
        isActive: true,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        name: true,
      },
    });

    const holidayMap = new Map(
      holidays.map(h => {
        const d = new Date(h.date);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return [key, h.name];
      })
    );

    // Generate calendar array
    const calendar: MonthlyCalendar['calendar'] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
      const isWeekend = !workingDaysPerWeek.includes(dayOfWeek);
      const holidayName = holidayMap.get(dateKey);
      const isHoliday = !!holidayName;
      const isWorkingDay = !isWeekend && !isHoliday;

      calendar.push({
        date: new Date(currentDate),
        dayOfWeek,
        isWeekend,
        isHoliday,
        isWorkingDay,
        holidayName,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      year,
      month,
      calendar,
      summary: {
        totalDays: result.totalDays,
        workingDays: result.workingDays,
        weekends: result.weekends,
        holidays: result.holidays,
      },
    };
  }

  /**
   * Save working days calculation to database
   */
  static async saveWorkingDaysCalendar(
    year: number,
    month: number,
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5]
  ): Promise<void> {
    try {
      const result = await this.calculateWorkingDays(year, month, workingDaysPerWeek);

      // Check if record exists
      const existing = await prisma.workingDaysCalendar.findUnique({
        where: {
          year_month: {
            year,
            month,
          },
        },
      });

      const calendarData = {
        year,
        month,
        totalDays: result.totalDays,
        workingDays: result.workingDays,
        weekends: result.weekends,
        holidays: result.holidays,
        workingDaysList: result.workingDaysList.map(d => d.toISOString()),
        weekendDaysList: result.weekendDaysList.map(d => d.toISOString()),
        holidayDaysList: result.holidayDaysList.map(d => d.toISOString()),
        workingDaysPerWeek,
      };

      if (existing) {
        // Update existing record
        await prisma.workingDaysCalendar.update({
          where: {
            year_month: {
              year,
              month,
            },
          },
          data: calendarData,
        });
      } else {
        // Create new record
        await prisma.workingDaysCalendar.create({
          data: calendarData,
        });
      }
    } catch (error) {
      console.error('Error saving working days calendar:', error);
      throw error instanceof Error ? error : new Error('Failed to save working days calendar');
    }
  }

  /**
   * Get working days calendar from database
   */
  static async getWorkingDaysCalendar(
    year: number,
    month: number
  ): Promise<{
    year: number;
    month: number;
    totalDays: number;
    workingDays: number;
    weekends: number;
    holidays: number;
    workingDaysList: string[];
    weekendDaysList: string[];
    holidayDaysList: string[];
    workingDaysPerWeek: number[];
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    try {
      const calendar = await prisma.workingDaysCalendar.findUnique({
        where: {
          year_month: {
            year,
            month,
          },
        },
      });

      if (!calendar) {
        return null;
      }

      // Transform JsonValue fields to expected array types
      return {
        year: calendar.year,
        month: calendar.month,
        totalDays: calendar.totalDays,
        workingDays: calendar.workingDays,
        weekends: calendar.weekends,
        holidays: calendar.holidays,
        workingDaysList: Array.isArray(calendar.workingDaysList) 
          ? calendar.workingDaysList as string[] 
          : [],
        weekendDaysList: Array.isArray(calendar.weekendDaysList) 
          ? calendar.weekendDaysList as string[] 
          : [],
        holidayDaysList: Array.isArray(calendar.holidayDaysList) 
          ? calendar.holidayDaysList as string[] 
          : [],
        workingDaysPerWeek: Array.isArray(calendar.workingDaysPerWeek) 
          ? calendar.workingDaysPerWeek as number[] 
          : [],
        createdAt: calendar.createdAt,
        updatedAt: calendar.updatedAt,
      };
    } catch (error) {
      console.error('Error getting working days calendar:', error);
      throw error instanceof Error ? error : new Error('Failed to get working days calendar');
    }
  }

  /**
   * Calculate working days between two dates (excluding weekends and holidays)
   */
  static async calculateWorkingDaysBetween(
    startDate: Date,
    endDate: Date,
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5]
  ): Promise<number> {
    try {
      // Get all holidays in the date range
      const holidays = await prisma.holiday.findMany({
        where: {
          isActive: true,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          date: true,
        },
      });

      const holidayDates = new Set(
        holidays.map(h => {
          const d = new Date(h.date);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        })
      );

      let workingDays = 0;
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
        const isHoliday = holidayDates.has(dateKey);
        const isWeekend = !workingDaysPerWeek.includes(dayOfWeek);

        if (!isWeekend && !isHoliday) {
          workingDays++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return workingDays;
    } catch (error) {
      console.error('Error calculating working days between dates:', error);
      throw error instanceof Error ? error : new Error('Failed to calculate working days between dates');
    }
  }

  /**
   * Process working days calculation for a specific month
   */
  static async processMonthlyWorkingDays(
    year: number,
    month: number,
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5]
  ): Promise<WorkingDaysResult> {
    const result = await this.calculateWorkingDays(year, month, workingDaysPerWeek);
    await this.saveWorkingDaysCalendar(year, month, workingDaysPerWeek);
    return result;
  }

  /**
   * Process working days for current month
   */
  static async processCurrentMonth(
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5]
  ): Promise<WorkingDaysResult> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return this.processMonthlyWorkingDays(year, month, workingDaysPerWeek);
  }

  /**
   * Process working days for next month
   */
  static async processNextMonth(
    workingDaysPerWeek: number[] = [1, 2, 3, 4, 5]
  ): Promise<WorkingDaysResult> {
    const now = new Date();
    const year = now.getFullYear();
    let month = now.getMonth() + 2; // Next month
    let nextYear = year;

    if (month > 12) {
      month = 1;
      nextYear = year + 1;
    }

    return this.processMonthlyWorkingDays(nextYear, month, workingDaysPerWeek);
  }
}

