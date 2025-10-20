import prisma from '../lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

export interface EmployeeSalaryData {
  id: string;
  userId: string;
  baseSalary: number;
  hourlyRate?: number;
  currency: string;
  effectiveDate: Date;
  endDate?: Date;
  isActive: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
}

export interface MonthlySalaryData {
  id: string;
  userId: string;
  year: number;
  month: number;
  baseSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: 'draft' | 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculatedAt?: Date;
  approvedAt?: Date;
  paidAt?: Date;
  approvedBy?: string;
  notes?: string;
  user: {
    id: string;
    name: string;
    email: string;
    department?: string;
  };
  deductions: SalaryDeductionData[];
}

export interface SalaryDeductionData {
  id: string;
  type: 'leave_deduction' | 'tax_deduction' | 'other_deduction' | 'bonus' | 'overtime';
  description: string;
  amount: number;
  leaveRequestId?: string;
  isTaxable: boolean;
  createdAt: Date;
}

export interface SalaryCalculationResult {
  baseSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  deductions: {
    leaveDeductions: number;
    taxDeductions: number;
    otherDeductions: number;
    bonuses: number;
    overtime: number;
  };
  leaveRequests: Array<{
    id: string;
    leaveType: string;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    deductionAmount: number;
  }>;
}

export class SalaryService {
  /**
   * Get all employee salaries
   */
  static async getEmployeeSalaries(managerId?: string): Promise<EmployeeSalaryData[]> {
    try {
      const whereClause = managerId 
        ? { user: { managerId } }
        : {};

      const salaries = await prisma.employeeSalary.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return salaries.map(salary => ({
        id: salary.id,
        userId: salary.userId,
        baseSalary: Number(salary.baseSalary),
        hourlyRate: salary.hourlyRate ? Number(salary.hourlyRate) : undefined,
        currency: salary.currency,
        effectiveDate: salary.effectiveDate,
        endDate: salary.endDate || undefined,
        isActive: salary.isActive,
        user: {
          id: salary.user.id,
          name: salary.user.name,
          email: salary.user.email,
          department: salary.user.department || undefined
        }
      }));
    } catch (error) {
      console.error('Error fetching employee salaries:', error);
      throw new Error('Failed to fetch employee salaries');
    }
  }

  /**
   * Get monthly salaries for a specific period
   */
  static async getMonthlySalaries(
    year: number,
    month?: number,
    managerId?: string
  ): Promise<MonthlySalaryData[]> {
    try {
      const whereClause: any = { year };
      
      if (month) {
        whereClause.month = month;
      }
      
      if (managerId) {
        whereClause.user = { managerId };
      }

      const salaries = await prisma.monthlySalary.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          },
          deductions: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' },
          { user: { name: 'asc' } }
        ]
      });

      return salaries.map(salary => ({
        id: salary.id,
        userId: salary.userId,
        year: salary.year,
        month: salary.month,
        baseSalary: Number(salary.baseSalary),
        grossSalary: Number(salary.grossSalary),
        totalDeductions: Number(salary.totalDeductions),
        netSalary: Number(salary.netSalary),
        status: salary.status as any,
        calculatedAt: salary.calculatedAt || undefined,
        approvedAt: salary.approvedAt || undefined,
        paidAt: salary.paidAt || undefined,
        approvedBy: salary.approvedBy || undefined,
        notes: salary.notes || undefined,
        user: {
          id: salary.user.id,
          name: salary.user.name,
          email: salary.user.email,
          department: salary.user.department || undefined
        },
        deductions: salary.deductions.map(deduction => ({
          id: deduction.id,
          type: deduction.type as any,
          description: deduction.description,
          amount: Number(deduction.amount),
          leaveRequestId: deduction.leaveRequestId || undefined,
          isTaxable: deduction.isTaxable,
          createdAt: deduction.createdAt
        }))
      }));
    } catch (error) {
      console.error('Error fetching monthly salaries:', error);
      throw new Error('Failed to fetch monthly salaries');
    }
  }

  /**
   * Calculate monthly salary for an employee
   */
  static async calculateMonthlySalary(
    userId: string,
    year: number,
    month: number
  ): Promise<SalaryCalculationResult> {
    try {
      console.log(`🔍 SalaryService: Calculating salary for user ${userId}, ${year}-${month}`);

      // Get employee's current salary
      const employeeSalary = await prisma.employeeSalary.findFirst({
        where: {
          userId,
          isActive: true,
          effectiveDate: {
            lte: new Date(year, month - 1, 1)
          }
        },
        orderBy: {
          effectiveDate: 'desc'
        }
      });

      if (!employeeSalary) {
        throw new Error('No active salary found for employee');
      }

      const baseSalary = Number(employeeSalary.baseSalary);
      console.log(`💰 Base salary: $${baseSalary}`);

      // Get approved leave requests for the month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const leaveRequests = await prisma.leaveRequest.findMany({
        where: {
          userId,
          status: 'approved',
          startDate: { lte: endDate },
          endDate: { gte: startDate }
        },
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          totalDays: true
        }
      });

      console.log(`📅 Found ${leaveRequests.length} approved leave requests`);

      // Calculate leave deductions
      let totalLeaveDeductions = 0;
      const dailyRate = baseSalary / 30; // Assuming 30 days per month
      const leaveDeductionDetails: Array<{
        id: string;
        leaveType: string;
        startDate: Date;
        endDate: Date;
        totalDays: number;
        deductionAmount: number;
      }> = [];

      for (const request of leaveRequests) {
        const totalDays = Number(request.totalDays);
        const deductionAmount = totalDays * dailyRate;
        totalLeaveDeductions += deductionAmount;

        leaveDeductionDetails.push({
          id: request.id,
          leaveType: request.leaveType,
          startDate: request.startDate,
          endDate: request.endDate,
          totalDays,
          deductionAmount
        });

        console.log(`📝 Leave deduction: ${request.leaveType} - ${totalDays} days = $${deductionAmount.toFixed(2)}`);
      }

      // Calculate tax deductions (simplified - 20% of gross)
      const taxDeductions = baseSalary * 0.20;

      // Calculate other deductions (placeholder)
      const otherDeductions = 0;

      // Calculate bonuses (placeholder)
      const bonuses = 0;

      // Calculate overtime (placeholder)
      const overtime = 0;

      const totalDeductions = totalLeaveDeductions + taxDeductions + otherDeductions;
      const netSalary = baseSalary - totalDeductions;

      console.log(`💰 Final calculation: Base $${baseSalary} - Deductions $${totalDeductions.toFixed(2)} = Net $${netSalary.toFixed(2)}`);

      return {
        baseSalary,
        grossSalary: baseSalary,
        totalDeductions,
        netSalary,
        deductions: {
          leaveDeductions: totalLeaveDeductions,
          taxDeductions,
          otherDeductions,
          bonuses,
          overtime
        },
        leaveRequests: leaveDeductionDetails
      };
    } catch (error) {
      console.error('Error calculating monthly salary:', error);
      throw new Error('Failed to calculate monthly salary');
    }
  }

  /**
   * Generate monthly salary records for all employees
   */
  static async generateMonthlySalaries(
    year: number,
    month: number,
    managerId?: string
  ): Promise<MonthlySalaryData[]> {
    try {
      console.log(`🔍 SalaryService: Generating salaries for ${year}-${month}`);

      // Get all active employees
      const whereClause = managerId 
        ? { managerId, isActive: true }
        : { isActive: true };

      const employees = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          department: true
        }
      });

      console.log(`👥 Found ${employees.length} employees`);

      const generatedSalaries: MonthlySalaryData[] = [];

      for (const employee of employees) {
        try {
          // Check if salary already exists
          const existingSalary = await prisma.monthlySalary.findUnique({
            where: {
              userId_year_month: {
                userId: employee.id,
                year,
                month
              }
            }
          });

          if (existingSalary) {
            console.log(`⚠️ Salary already exists for ${employee.name}`);
            continue;
          }

          // Calculate salary
          const calculation = await this.calculateMonthlySalary(employee.id, year, month);

          // Get employee's salary record
          const employeeSalary = await prisma.employeeSalary.findFirst({
            where: {
              userId: employee.id,
              isActive: true
            }
          });

          if (!employeeSalary) {
            console.log(`⚠️ No salary record found for ${employee.name}`);
            continue;
          }

          // Create monthly salary record
          const monthlySalary = await prisma.monthlySalary.create({
            data: {
              employeeSalaryId: employeeSalary.id,
              userId: employee.id,
              year,
              month,
              baseSalary: new Decimal(calculation.baseSalary),
              grossSalary: new Decimal(calculation.grossSalary),
              totalDeductions: new Decimal(calculation.totalDeductions),
              netSalary: new Decimal(calculation.netSalary),
              status: 'calculated',
              calculatedAt: new Date()
            }
          });

          // Create salary deductions
          for (const leaveRequest of calculation.leaveRequests) {
            await prisma.salaryDeduction.create({
              data: {
                monthlySalaryId: monthlySalary.id,
                type: 'leave_deduction',
                description: `${leaveRequest.leaveType} leave deduction`,
                amount: new Decimal(leaveRequest.deductionAmount),
                leaveRequestId: leaveRequest.id,
                isTaxable: false
              }
            });
          }

          // Add tax deduction
          if (calculation.deductions.taxDeductions > 0) {
            await prisma.salaryDeduction.create({
              data: {
                monthlySalaryId: monthlySalary.id,
                type: 'tax_deduction',
                description: 'Income tax deduction',
                amount: new Decimal(calculation.deductions.taxDeductions),
                isTaxable: false
              }
            });
          }

          // Fetch the created salary with relations
          const createdSalary = await prisma.monthlySalary.findUnique({
            where: { id: monthlySalary.id },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  department: true
                }
              },
              deductions: true
            }
          });

          if (createdSalary) {
            generatedSalaries.push({
              id: createdSalary.id,
              userId: createdSalary.userId,
              year: createdSalary.year,
              month: createdSalary.month,
              baseSalary: Number(createdSalary.baseSalary),
              grossSalary: Number(createdSalary.grossSalary),
              totalDeductions: Number(createdSalary.totalDeductions),
              netSalary: Number(createdSalary.netSalary),
              status: createdSalary.status as any,
              calculatedAt: createdSalary.calculatedAt || undefined,
              user: {
                id: createdSalary.user.id,
                name: createdSalary.user.name,
                email: createdSalary.user.email,
                department: createdSalary.user.department || undefined
              },
              deductions: createdSalary.deductions.map(d => ({
                id: d.id,
                type: d.type as any,
                description: d.description,
                amount: Number(d.amount),
                leaveRequestId: d.leaveRequestId || undefined,
                isTaxable: d.isTaxable,
                createdAt: d.createdAt
              }))
            });
          }

          console.log(`✅ Generated salary for ${employee.name}: $${calculation.netSalary.toFixed(2)}`);
        } catch (error) {
          console.error(`❌ Error generating salary for ${employee.name}:`, error);
        }
      }

      return generatedSalaries;
    } catch (error) {
      console.error('Error generating monthly salaries:', error);
      throw new Error('Failed to generate monthly salaries');
    }
  }

  /**
   * Approve monthly salary
   */
  static async approveMonthlySalary(
    salaryId: string,
    approvedBy: string,
    notes?: string
  ): Promise<MonthlySalaryData> {
    try {
      const updatedSalary = await prisma.monthlySalary.update({
        where: { id: salaryId },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy,
          notes
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          },
          deductions: true
        }
      });

      return {
        id: updatedSalary.id,
        userId: updatedSalary.userId,
        year: updatedSalary.year,
        month: updatedSalary.month,
        baseSalary: Number(updatedSalary.baseSalary),
        grossSalary: Number(updatedSalary.grossSalary),
        totalDeductions: Number(updatedSalary.totalDeductions),
        netSalary: Number(updatedSalary.netSalary),
        status: updatedSalary.status as any,
        calculatedAt: updatedSalary.calculatedAt || undefined,
        approvedAt: updatedSalary.approvedAt || undefined,
        paidAt: updatedSalary.paidAt || undefined,
        approvedBy: updatedSalary.approvedBy || undefined,
        notes: updatedSalary.notes || undefined,
        user: {
          id: updatedSalary.user.id,
          name: updatedSalary.user.name,
          email: updatedSalary.user.email,
          department: updatedSalary.user.department || undefined
        },
        deductions: updatedSalary.deductions.map(d => ({
          id: d.id,
          type: d.type as any,
          description: d.description,
          amount: Number(d.amount),
          leaveRequestId: d.leaveRequestId || undefined,
          isTaxable: d.isTaxable,
          createdAt: d.createdAt
        }))
      };
    } catch (error) {
      console.error('Error approving monthly salary:', error);
      throw new Error('Failed to approve monthly salary');
    }
  }

  /**
   * Get salary statistics
   */
  static async getSalaryStatistics(
    year: number,
    month?: number,
    managerId?: string
  ): Promise<{
    totalEmployees: number;
    totalGrossSalary: number;
    totalDeductions: number;
    totalNetSalary: number;
    averageSalary: number;
    leaveDeductions: number;
    taxDeductions: number;
  }> {
    try {
      const whereClause: any = { year };
      
      if (month) {
        whereClause.month = month;
      }
      
      if (managerId) {
        whereClause.user = { managerId };
      }

      const salaries = await prisma.monthlySalary.findMany({
        where: whereClause,
        include: {
          deductions: true
        }
      });

      const totalEmployees = salaries.length;
      const totalGrossSalary = salaries.reduce((sum, s) => sum + Number(s.grossSalary), 0);
      const totalDeductions = salaries.reduce((sum, s) => sum + Number(s.totalDeductions), 0);
      const totalNetSalary = salaries.reduce((sum, s) => sum + Number(s.netSalary), 0);
      const averageSalary = totalEmployees > 0 ? totalNetSalary / totalEmployees : 0;

      const leaveDeductions = salaries.reduce((sum, salary) => {
        return sum + salary.deductions
          .filter(d => d.type === 'leave_deduction')
          .reduce((deductionSum, d) => deductionSum + Number(d.amount), 0);
      }, 0);

      const taxDeductions = salaries.reduce((sum, salary) => {
        return sum + salary.deductions
          .filter(d => d.type === 'tax_deduction')
          .reduce((deductionSum, d) => deductionSum + Number(d.amount), 0);
      }, 0);

      return {
        totalEmployees,
        totalGrossSalary,
        totalDeductions,
        totalNetSalary,
        averageSalary,
        leaveDeductions,
        taxDeductions
      };
    } catch (error) {
      console.error('Error fetching salary statistics:', error);
      throw new Error('Failed to fetch salary statistics');
    }
  }

  /**
   * Create new employee salary
   */
  static async createEmployeeSalary(salaryData: {
    userId: string;
    baseSalary: number;
    hourlyRate?: number;
    currency: string;
    effectiveDate: Date;
    endDate?: Date;
    isActive: boolean;
  }): Promise<any> {
    try {
      console.log('🔍 SalaryService: Creating employee salary:', salaryData);

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: salaryData.userId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has an active salary
      const existingSalary = await prisma.employeeSalary.findFirst({
        where: {
          userId: salaryData.userId,
          isActive: true
        }
      });

      if (existingSalary) {
        throw new Error('User already has an active salary record');
      }

      // Create new salary record
      const salary = await prisma.employeeSalary.create({
        data: {
          userId: salaryData.userId,
          baseSalary: salaryData.baseSalary,
          hourlyRate: salaryData.hourlyRate,
          currency: salaryData.currency,
          effectiveDate: salaryData.effectiveDate,
          endDate: salaryData.endDate,
          isActive: salaryData.isActive
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          }
        }
      });

      console.log('✅ SalaryService: Employee salary created successfully:', salary.id);
      return salary;
    } catch (error) {
      console.error('Error creating employee salary:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create employee salary');
    }
  }

  /**
   * Update employee salary
   */
  static async updateEmployeeSalary(salaryId: string, updateData: {
    baseSalary?: number;
    hourlyRate?: number;
    currency?: string;
    effectiveDate?: Date;
    endDate?: Date;
    isActive?: boolean;
  }): Promise<any> {
    try {
      console.log('🔍 SalaryService: Updating employee salary:', salaryId, updateData);

      // Check if salary exists
      const existingSalary = await prisma.employeeSalary.findUnique({
        where: { id: salaryId }
      });

      if (!existingSalary) {
        throw new Error('Salary record not found');
      }

      // Update salary record
      const salary = await prisma.employeeSalary.update({
        where: { id: salaryId },
        data: {
          ...updateData,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          }
        }
      });

      console.log('✅ SalaryService: Employee salary updated successfully:', salary.id);
      return salary;
    } catch (error) {
      console.error('Error updating employee salary:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update employee salary');
    }
  }
}

export default SalaryService;
