import { LeavePolicy } from '../../../types';
import { LeavePolicyCreateData, LeavePolicyUpdateData } from '../types';
export interface PolicyFilters {
    status?: string;
    limit?: number;
    page?: number;
}
export declare class PolicyService {
    static getPolicies(filters?: PolicyFilters): Promise<LeavePolicy[]>;
    static createPolicy(policyData: LeavePolicyCreateData): Promise<LeavePolicy>;
    static getPolicyById(id: string): Promise<LeavePolicy | null>;
    static updatePolicy(id: string, updateData: LeavePolicyUpdateData): Promise<LeavePolicy | null>;
    static deletePolicy(id: string): Promise<boolean>;
}
//# sourceMappingURL=policyService.d.ts.map