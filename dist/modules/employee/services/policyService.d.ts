import { LeavePolicy } from '../../../types';
export interface PolicyFilters {
    status?: string;
    limit?: number;
}
export declare class PolicyService {
    static getPolicies(filters?: PolicyFilters): Promise<LeavePolicy[]>;
    static getPolicyById(id: string): Promise<LeavePolicy | null>;
}
//# sourceMappingURL=policyService.d.ts.map