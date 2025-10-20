export interface PolicyEnforcementResult {
    isCompliant: boolean;
    violations: PolicyViolation[];
    warnings: PolicyWarning[];
    suggestions: string[];
}
export interface PolicyViolation {
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    code: string;
    message: string;
    field?: string;
    value?: any;
    expectedValue?: any;
}
export interface PolicyWarning {
    code: string;
    message: string;
    suggestion?: string;
}
export declare class PolicyEnforcementService {
    static enforceLeavePolicies(userId: string, leaveRequest: {
        leaveType: string;
        startDate: Date;
        endDate: Date;
        isHalfDay: boolean;
        halfDayPeriod?: string;
        reason: string;
        emergencyContact?: string;
        workHandover?: string;
    }): Promise<PolicyEnforcementResult>;
    private static enforceLeaveBalancePolicy;
    private static enforceNoticePeriodPolicy;
    private static enforceConsecutiveDaysPolicy;
    private static enforceHalfDayPolicy;
    private static enforceDocumentationPolicy;
    private static enforceApprovalPolicy;
    private static enforceEmergencyContactPolicy;
    private static enforceWorkHandoverPolicy;
    private static enforceHolidayPolicy;
    private static enforceOverlappingPolicy;
    private static enforceDepartmentPolicy;
    private static enforceRolePolicy;
    private static calculateLeaveDays;
    static getPolicyComplianceSummary(userId: string): Promise<{
        overallCompliance: number;
        policyViolations: number;
        policyWarnings: number;
        recommendations: string[];
    }>;
}
export default PolicyEnforcementService;
//# sourceMappingURL=policyEnforcementService.d.ts.map