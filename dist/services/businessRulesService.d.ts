export interface BusinessRuleResult {
    isValid: boolean;
    message?: string;
    warnings?: string[];
    suggestions?: string[];
    salaryDeduction?: {
        days: number;
        amount: number;
    };
}
export interface LeaveRequestValidationResult extends BusinessRuleResult {
    canSubmit: boolean;
    requiresApproval: boolean;
    estimatedApprovalTime?: string;
    conflictWithHolidays?: string[];
    conflictWithOtherRequests?: string[];
}
export interface ManagerAssignmentResult extends BusinessRuleResult {
    assignedManagerId?: string;
    assignmentReason?: string;
    fallbackOptions?: Array<{
        managerId: string;
        managerName: string;
        reason: string;
    }>;
}
export declare class BusinessRulesService {
    static validateLeaveRequest(userId: string, leaveRequest: {
        leaveType: string;
        startDate: Date;
        endDate: Date;
        isHalfDay: boolean;
        halfDayPeriod?: string;
        reason: string;
    }): Promise<LeaveRequestValidationResult>;
    static autoAssignManager(employeeData: {
        role: string;
        department?: string;
        managerId?: string;
    }): Promise<ManagerAssignmentResult>;
    static calculateLeaveBalance(userId: string, year?: number): Promise<{
        [leaveType: string]: {
            total: number;
            used: number;
            remaining: number;
            pending: number;
        };
    }>;
    private static validateLeaveBalance;
    private static calculateSalaryDeduction;
    private static validateNoticePeriod;
    private static checkHolidayConflicts;
    private static checkOverlappingRequests;
    private static validateMaxConsecutiveDays;
    private static estimateApprovalTime;
    private static validateEmergencyLeave;
    private static validateParentalLeave;
    private static calculateLeaveDays;
}
export default BusinessRulesService;
//# sourceMappingURL=businessRulesService.d.ts.map