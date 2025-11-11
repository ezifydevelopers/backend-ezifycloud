import prisma from '../lib/prisma';
import { LeavePolicy } from '@prisma/client';

export interface AccrualResult {
  success: boolean;
  message: string;
  accruals: Array<{
    leaveType: string;
    daysAccrued: number;
    previousTotal: number;
    newTotal: number;
    previousRemaining: number;
    newRemaining: number;
  }>;
}

export class LeaveAccrualService {
  /**
   * Calculate monthly leave accrual for an employee based on their joining date
   * Example: If employee joins on June 1st, they get leave credited on the 1st of each month
   */
  static async processMonthlyAccrual(
    userId: string,
    accrualDate: Date = new Date()
  ): Promise<AccrualResult> {
    try {
      // Get user with join date
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          joinDate: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('Cannot accrue leave for inactive employee');
      }

      if (!user.joinDate) {
        throw new Error('Employee join date is not set. Please set join date before processing accrual.');
      }

      // Check if accrual date matches the employee's joining date (day of month)
      const joinDate = new Date(user.joinDate);
      const joinDay = joinDate.getDate();
      const accrualDay = accrualDate.getDate();

      // Only process if it's the accrual day (same day of month as joining date)
      if (joinDay !== accrualDay) {
        return {
          success: false,
          message: `Accrual date (${accrualDay}) does not match employee joining date (${joinDay}). Accrual will be processed on the ${joinDay} of each month.`,
          accruals: [],
        };
      }

      // Check if accrual already processed for this month
      const currentYear = accrualDate.getFullYear();
      const currentMonth = accrualDate.getMonth() + 1; // 1-12

      const existingAccrual = await prisma.leaveAccrual.findFirst({
        where: {
          userId,
          year: currentYear,
          month: currentMonth,
        },
      });

      if (existingAccrual) {
        return {
          success: false,
          message: `Leave accrual already processed for ${currentMonth}/${currentYear}`,
          accruals: [],
        };
      }

      // Get active leave policies
      const policies = await prisma.leavePolicy.findMany({
        where: { isActive: true },
      });

      if (policies.length === 0) {
        throw new Error('No active leave policies found');
      }

      // Get or create leave balance for current year
      let leaveBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_year: {
            userId,
            year: currentYear,
          },
        },
      });

      if (!leaveBalance) {
        // Create initial leave balance with default values
        leaveBalance = await prisma.leaveBalance.create({
          data: {
            userId,
            year: currentYear,
            annualTotal: 0,
            annualUsed: 0,
            annualRemaining: 0,
            sickTotal: 0,
            sickUsed: 0,
            sickRemaining: 0,
            casualTotal: 0,
            casualUsed: 0,
            casualRemaining: 0,
            maternityTotal: 0,
            maternityUsed: 0,
            maternityRemaining: 0,
            paternityTotal: 0,
            paternityUsed: 0,
            paternityRemaining: 0,
            emergencyTotal: 0,
            emergencyUsed: 0,
            emergencyRemaining: 0,
          },
        });
      }

      const accruals: AccrualResult['accruals'] = [];
      const balanceFieldMap: { [key: string]: { total: string; remaining: string } } = {
        annual: { total: 'annualTotal', remaining: 'annualRemaining' },
        sick: { total: 'sickTotal', remaining: 'sickRemaining' },
        casual: { total: 'casualTotal', remaining: 'casualRemaining' },
        maternity: { total: 'maternityTotal', remaining: 'maternityRemaining' },
        paternity: { total: 'paternityTotal', remaining: 'paternityRemaining' },
        emergency: { total: 'emergencyTotal', remaining: 'emergencyRemaining' },
      };

      // Calculate monthly accrual for each policy
      // Monthly accrual = totalDaysPerYear / 12
      for (const policy of policies) {
        const leaveType = policy.leaveType.toLowerCase();
        const fields = balanceFieldMap[leaveType];

        if (!fields) {
          console.warn(`Unknown leave type: ${leaveType}`);
          continue;
        }

        // Calculate monthly accrual (divide annual by 12)
        const monthlyAccrual = policy.totalDaysPerYear / 12;
        const daysAccrued = Math.round(monthlyAccrual * 100) / 100; // Round to 2 decimal places

        // Get current values
        const currentTotal = (leaveBalance as any)[fields.total] || 0;
        const currentRemaining = (leaveBalance as any)[fields.remaining] || 0;

        // Calculate new values
        const newTotal = Math.round((currentTotal + monthlyAccrual) * 100) / 100;
        const newRemaining = Math.round((currentRemaining + monthlyAccrual) * 100) / 100;

        // Update leave balance
        await prisma.leaveBalance.update({
          where: {
            userId_year: {
              userId,
              year: currentYear,
            },
          },
          data: {
            [fields.total]: Math.round(newTotal),
            [fields.remaining]: Math.round(newRemaining),
          },
        });

        // Create accrual record
        await prisma.leaveAccrual.create({
          data: {
            userId,
            accrualDate,
            leaveType: policy.leaveType,
            daysAccrued: daysAccrued.toString(),
            previousTotal: currentTotal,
            newTotal: Math.round(newTotal),
            previousRemaining: currentRemaining,
            newRemaining: Math.round(newRemaining),
            year: currentYear,
            month: currentMonth,
            notes: `Monthly accrual based on joining date (${joinDay} of month)`,
          },
        });

        accruals.push({
          leaveType: policy.leaveType,
          daysAccrued,
          previousTotal: currentTotal,
          newTotal: Math.round(newTotal),
          previousRemaining: currentRemaining,
          newRemaining: Math.round(newRemaining),
        });
      }

      // Create audit log
      const adminUser = await prisma.user.findFirst({
        where: { role: 'admin', isActive: true },
        select: { id: true, name: true },
      });

      if (adminUser) {
        await prisma.auditLog.create({
          data: {
            userId: adminUser.id,
            userName: adminUser.name,
            action: 'LEAVE_ACCRUAL',
            targetId: userId,
            targetType: 'user',
            details: {
              accrualDate: accrualDate.toISOString(),
              year: currentYear,
              month: currentMonth,
              accruals: accruals.map(a => ({
                leaveType: a.leaveType,
                daysAccrued: a.daysAccrued,
              })),
            } as any,
          },
        });
      }

      return {
        success: true,
        message: `Successfully processed monthly leave accrual for ${user.name}. ${accruals.length} leave types accrued.`,
        accruals,
      };
    } catch (error) {
      console.error('Error processing leave accrual:', error);
      throw error instanceof Error ? error : new Error('Failed to process leave accrual');
    }
  }

  /**
   * Process accrual for all employees whose joining date matches today's date
   */
  static async processAllEligibleAccruals(accrualDate: Date = new Date()): Promise<{
    processed: number;
    skipped: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    const today = accrualDate;
    const dayOfMonth = today.getDate();

    // Find all active employees whose joining date matches today's day of month
    const employees = await prisma.user.findMany({
      where: {
        isActive: true,
        joinDate: {
          not: null,
        },
        role: {
          in: ['employee', 'manager'], // Only employees and managers get leave accrual
        },
      },
      select: {
        id: true,
        name: true,
        joinDate: true,
      },
    });

    // Filter employees whose joining date day matches today's day
    const eligibleEmployees = employees.filter((emp) => {
      if (!emp.joinDate) return false;
      const joinDate = new Date(emp.joinDate);
      return joinDate.getDate() === dayOfMonth;
    });

    let processed = 0;
    let skipped = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const employee of eligibleEmployees) {
      try {
        const result = await this.processMonthlyAccrual(employee.id, accrualDate);
        if (result.success) {
          processed++;
        } else {
          skipped++;
        }
      } catch (error) {
        skipped++;
        errors.push({
          userId: employee.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { processed, skipped, errors };
  }

  /**
   * Get accrual history for an employee
   */
  static async getAccrualHistory(
    userId: string,
    year?: number
  ): Promise<Array<{
    id: string;
    accrualDate: Date;
    leaveType: string;
    daysAccrued: number;
    previousTotal: number;
    newTotal: number;
    previousRemaining: number;
    newRemaining: number;
    year: number;
    month: number;
    notes?: string;
    createdAt: Date;
  }>> {
    const currentYear = year || new Date().getFullYear();

    const accruals = await prisma.leaveAccrual.findMany({
      where: {
        userId,
        year: currentYear,
      },
      orderBy: {
        accrualDate: 'desc',
      },
    });

    return accruals.map((accrual) => ({
      id: accrual.id,
      accrualDate: accrual.accrualDate,
      leaveType: accrual.leaveType,
      daysAccrued: Number(accrual.daysAccrued),
      previousTotal: accrual.previousTotal,
      newTotal: accrual.newTotal,
      previousRemaining: accrual.previousRemaining,
      newRemaining: accrual.newRemaining,
      year: accrual.year,
      month: accrual.month,
      notes: accrual.notes || undefined,
      createdAt: accrual.createdAt,
    }));
  }

  /**
   * Get next accrual date for an employee
   */
  static async getNextAccrualDate(userId: string): Promise<Date | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { joinDate: true },
    });

    if (!user || !user.joinDate) {
      return null;
    }

    const joinDate = new Date(user.joinDate);
    const joinDay = joinDate.getDate();
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // Calculate next accrual date
    let nextAccrualDate: Date;

    if (currentDay < joinDay) {
      // Accrual date is later this month
      nextAccrualDate = new Date(currentYear, currentMonth, joinDay);
    } else if (currentDay === joinDay) {
      // Today is the accrual date, next one is next month
      nextAccrualDate = new Date(currentYear, currentMonth + 1, joinDay);
    } else {
      // Accrual date has passed this month, next one is next month
      nextAccrualDate = new Date(currentYear, currentMonth + 1, joinDay);
    }

    return nextAccrualDate;
  }
}

