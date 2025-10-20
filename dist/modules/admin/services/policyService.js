"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PolicyService {
    static async getPolicies(filters = {}) {
        try {
            const { status, limit = 50, page = 1 } = filters;
            const skip = (page - 1) * limit;
            const where = {};
            const policies = await prisma.leavePolicy.findMany({
                where,
                skip,
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
    static async createPolicy(policyData) {
        try {
            const policy = await prisma.leavePolicy.create({
                data: {
                    leaveType: policyData.leaveType,
                    totalDaysPerYear: policyData.maxDays,
                    canCarryForward: (policyData.carryForwardDays || 0) > 0,
                    maxCarryForwardDays: policyData.carryForwardDays,
                    requiresApproval: policyData.requiresApproval,
                    allowHalfDay: true,
                    description: policyData.description
                }
            });
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
            console.error('Error in PolicyService.createPolicy:', error);
            throw new Error('Failed to create policy');
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
    static async updatePolicy(id, updateData) {
        try {
            const policy = await prisma.leavePolicy.update({
                where: { id },
                data: {
                    leaveType: updateData.leaveType,
                    totalDaysPerYear: updateData.maxDays,
                    canCarryForward: (updateData.carryForwardDays || 0) > 0,
                    maxCarryForwardDays: updateData.carryForwardDays,
                    requiresApproval: updateData.requiresApproval,
                    allowHalfDay: updateData.allowHalfDay,
                    description: updateData.description
                }
            });
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
            console.error('Error in PolicyService.updatePolicy:', error);
            if (error instanceof Error && error.message.includes('Record to update not found')) {
                return null;
            }
            throw new Error('Failed to update policy');
        }
    }
    static async deletePolicy(id) {
        try {
            await prisma.leavePolicy.delete({
                where: { id }
            });
            return true;
        }
        catch (error) {
            console.error('Error in PolicyService.deletePolicy:', error);
            if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
                return false;
            }
            throw new Error('Failed to delete policy');
        }
    }
}
exports.PolicyService = PolicyService;
//# sourceMappingURL=policyService.js.map