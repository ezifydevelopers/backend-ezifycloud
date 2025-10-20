"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryService = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
const library_1 = require("@prisma/client/runtime/library");
class SalaryService {
    static async getEmployeeSalaries(managerId) {
        try {
            const whereClause = managerId
                ? { user: { managerId } }
                : {};
            const salaries = await prisma_1.default.employeeSalary.findMany({
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
        }
        catch (error) {
            console.error('Error fetching employee salaries:', error);
            throw new Error('Failed to fetch employee salaries');
        }
    }
    static async getMonthlySalaries(year, month, managerId) {
        try {
            const whereClause = { year };
            if (month) {
                whereClause.month = month;
            }
            if (managerId) {
                whereClause.user = { managerId };
            }
            const salaries = await prisma_1.default.monthlySalary.findMany({
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
                status: salary.status,
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
                    type: deduction.type,
                    description: deduction.description,
                    amount: Number(deduction.amount),
                    leaveRequestId: deduction.leaveRequestId || undefined,
                    isTaxable: deduction.isTaxable,
                    createdAt: deduction.createdAt
                }))
            }));
        }
        catch (error) {
            console.error('Error fetching monthly salaries:', error);
            throw new Error('Failed to fetch monthly salaries');
        }
    }
    static async calculateMonthlySalary(userId, year, month) {
        try {
            console.log(`🔍 SalaryService: Calculating salary for user ${userId}, ${year}-${month}`);
            const employeeSalary = await prisma_1.default.employeeSalary.findFirst({
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
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const leaveRequests = await prisma_1.default.leaveRequest.findMany({
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
            let totalLeaveDeductions = 0;
            const dailyRate = baseSalary / 30;
            const leaveDeductionDetails = [];
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
            const taxDeductions = baseSalary * 0.20;
            const otherDeductions = 0;
            const bonuses = 0;
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
        }
        catch (error) {
            console.error('Error calculating monthly salary:', error);
            throw new Error('Failed to calculate monthly salary');
        }
    }
    static async generateMonthlySalaries(year, month, managerId) {
        try {
            console.log(`🔍 SalaryService: Generating salaries for ${year}-${month}`);
            const whereClause = managerId
                ? { managerId, isActive: true }
                : { isActive: true };
            const employees = await prisma_1.default.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true
                }
            });
            console.log(`👥 Found ${employees.length} employees`);
            const generatedSalaries = [];
            for (const employee of employees) {
                try {
                    const existingSalary = await prisma_1.default.monthlySalary.findUnique({
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
                    const calculation = await this.calculateMonthlySalary(employee.id, year, month);
                    const employeeSalary = await prisma_1.default.employeeSalary.findFirst({
                        where: {
                            userId: employee.id,
                            isActive: true
                        }
                    });
                    if (!employeeSalary) {
                        console.log(`⚠️ No salary record found for ${employee.name}`);
                        continue;
                    }
                    const monthlySalary = await prisma_1.default.monthlySalary.create({
                        data: {
                            employeeSalaryId: employeeSalary.id,
                            userId: employee.id,
                            year,
                            month,
                            baseSalary: new library_1.Decimal(calculation.baseSalary),
                            grossSalary: new library_1.Decimal(calculation.grossSalary),
                            totalDeductions: new library_1.Decimal(calculation.totalDeductions),
                            netSalary: new library_1.Decimal(calculation.netSalary),
                            status: 'calculated',
                            calculatedAt: new Date()
                        }
                    });
                    for (const leaveRequest of calculation.leaveRequests) {
                        await prisma_1.default.salaryDeduction.create({
                            data: {
                                monthlySalaryId: monthlySalary.id,
                                type: 'leave_deduction',
                                description: `${leaveRequest.leaveType} leave deduction`,
                                amount: new library_1.Decimal(leaveRequest.deductionAmount),
                                leaveRequestId: leaveRequest.id,
                                isTaxable: false
                            }
                        });
                    }
                    if (calculation.deductions.taxDeductions > 0) {
                        await prisma_1.default.salaryDeduction.create({
                            data: {
                                monthlySalaryId: monthlySalary.id,
                                type: 'tax_deduction',
                                description: 'Income tax deduction',
                                amount: new library_1.Decimal(calculation.deductions.taxDeductions),
                                isTaxable: false
                            }
                        });
                    }
                    const createdSalary = await prisma_1.default.monthlySalary.findUnique({
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
                            status: createdSalary.status,
                            calculatedAt: createdSalary.calculatedAt || undefined,
                            user: {
                                id: createdSalary.user.id,
                                name: createdSalary.user.name,
                                email: createdSalary.user.email,
                                department: createdSalary.user.department || undefined
                            },
                            deductions: createdSalary.deductions.map(d => ({
                                id: d.id,
                                type: d.type,
                                description: d.description,
                                amount: Number(d.amount),
                                leaveRequestId: d.leaveRequestId || undefined,
                                isTaxable: d.isTaxable,
                                createdAt: d.createdAt
                            }))
                        });
                    }
                    console.log(`✅ Generated salary for ${employee.name}: $${calculation.netSalary.toFixed(2)}`);
                }
                catch (error) {
                    console.error(`❌ Error generating salary for ${employee.name}:`, error);
                }
            }
            return generatedSalaries;
        }
        catch (error) {
            console.error('Error generating monthly salaries:', error);
            throw new Error('Failed to generate monthly salaries');
        }
    }
    static async approveMonthlySalary(salaryId, approvedBy, notes) {
        try {
            const updatedSalary = await prisma_1.default.monthlySalary.update({
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
                status: updatedSalary.status,
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
                    type: d.type,
                    description: d.description,
                    amount: Number(d.amount),
                    leaveRequestId: d.leaveRequestId || undefined,
                    isTaxable: d.isTaxable,
                    createdAt: d.createdAt
                }))
            };
        }
        catch (error) {
            console.error('Error approving monthly salary:', error);
            throw new Error('Failed to approve monthly salary');
        }
    }
    static async getSalaryStatistics(year, month, managerId) {
        try {
            const whereClause = { year };
            if (month) {
                whereClause.month = month;
            }
            if (managerId) {
                whereClause.user = { managerId };
            }
            const salaries = await prisma_1.default.monthlySalary.findMany({
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
        }
        catch (error) {
            console.error('Error fetching salary statistics:', error);
            throw new Error('Failed to fetch salary statistics');
        }
    }
}
exports.SalaryService = SalaryService;
exports.default = SalaryService;
//# sourceMappingURL=salaryService.js.map