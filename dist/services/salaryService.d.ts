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
export declare class SalaryService {
    static getEmployeeSalaries(managerId?: string): Promise<EmployeeSalaryData[]>;
    static getMonthlySalaries(year: number, month?: number, managerId?: string): Promise<MonthlySalaryData[]>;
    static calculateMonthlySalary(userId: string, year: number, month: number): Promise<SalaryCalculationResult>;
    static generateMonthlySalaries(year: number, month: number, managerId?: string): Promise<MonthlySalaryData[]>;
    static approveMonthlySalary(salaryId: string, approvedBy: string, notes?: string): Promise<MonthlySalaryData>;
    static getSalaryStatistics(year: number, month?: number, managerId?: string): Promise<{
        totalEmployees: number;
        totalGrossSalary: number;
        totalDeductions: number;
        totalNetSalary: number;
        averageSalary: number;
        leaveDeductions: number;
        taxDeductions: number;
    }>;
}
export default SalaryService;
//# sourceMappingURL=salaryService.d.ts.map