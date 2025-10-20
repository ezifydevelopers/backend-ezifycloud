"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PolicyService {
    static async getPolicies(filters = {}) {
        try {
            const { status = 'active', limit = 50 } = filters;
            const where = {};
            const policies = await prisma.leavePolicy.findMany({
                where,
                take: limit,
                orderBy: {
                    createdAt: 'desc'
                }
            });
            return policies.map(policy => ({
                id: policy.id,
                leave_type: policy.leaveType,
                total_days_per_year: policy.totalDaysPerYear,
                can_carry_forward: policy.canCarryForward,
                max_carry_forward_days: policy.maxCarryForwardDays || undefined,
                requires_approval: policy.requiresApproval,
                allow_half_day: policy.allowHalfDay,
                description: policy.description || ''
            }));
        }
        catch (error) {
            console.error('Error in PolicyService.getPolicies:', error);
            throw new Error('Failed to retrieve policies');
        }
    }
    static async getPolicyById(id) {
        try {
            const policy = await prisma.leavePolicy.findUnique({
                where: { id }
            });
            if (!policy) {
                return null;
            }
            return {
                id: policy.id,
                leave_type: policy.leaveType,
                total_days_per_year: policy.totalDaysPerYear,
                can_carry_forward: policy.canCarryForward,
                max_carry_forward_days: policy.maxCarryForwardDays || undefined,
                requires_approval: policy.requiresApproval,
                allow_half_day: policy.allowHalfDay,
                description: policy.description || ''
            };
        }
        catch (error) {
            console.error('Error in PolicyService.getPolicyById:', error);
            throw new Error('Failed to retrieve policy');
        }
    }
}
exports.PolicyService = PolicyService;
//# sourceMappingURL=policyService.js.map