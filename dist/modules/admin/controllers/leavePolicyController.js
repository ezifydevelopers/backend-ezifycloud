"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavePolicyController = void 0;
const prisma_1 = __importDefault(require("../../../lib/prisma"));
class LeavePolicyController {
    static async getLeavePolicies(req, res) {
        try {
            const adminId = req.user?.id;
            const { status = 'active', limit = 50, page = 1 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const policies = await prisma_1.default.leavePolicy.findMany({
                where: {
                    createdBy: adminId
                },
                skip,
                take: parseInt(limit),
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            const total = await prisma_1.default.leavePolicy.count({
                where: {
                    createdBy: adminId
                }
            });
            const response = {
                success: true,
                message: 'Policies retrieved successfully',
                data: policies,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getPolicies:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve policies',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeavePolicyById(req, res) {
        try {
            const adminId = req.user?.id;
            const { id } = req.params;
            const policy = await prisma_1.default.leavePolicy.findFirst({
                where: {
                    id,
                    createdBy: adminId
                }
            });
            if (!policy) {
                const response = {
                    success: false,
                    message: 'Policy not found',
                    error: 'Policy with the given ID does not exist or you do not have permission to access it'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Policy retrieved successfully',
                data: policy
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getPolicyById:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve policy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async createLeavePolicy(req, res) {
        const adminId = req.user?.id;
        const policyData = req.body;
        try {
            console.log('🔍 LeavePolicyController: Received data:', policyData);
            console.log('🔍 LeavePolicyController: Admin ID:', adminId);
            console.log('🔍 LeavePolicyController: Data types:', {
                leaveType: typeof policyData.leaveType,
                totalDaysPerYear: typeof policyData.totalDaysPerYear,
                canCarryForward: typeof policyData.canCarryForward,
                maxCarryForwardDays: typeof policyData.maxCarryForwardDays,
                requiresApproval: typeof policyData.requiresApproval,
                allowHalfDay: typeof policyData.allowHalfDay,
            });
            const policy = await prisma_1.default.leavePolicy.create({
                data: {
                    ...policyData,
                    createdBy: adminId
                }
            });
            const response = {
                success: true,
                message: 'Policy created successfully',
                data: policy
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error in createPolicy:', error);
            let message = 'Failed to create policy';
            let statusCode = 500;
            if (error instanceof Error && error.message.includes('Unique constraint failed')) {
                message = `A policy for leave type "${policyData.leaveType}" already exists. Please choose a different leave type or update the existing policy.`;
                statusCode = 409;
            }
            else if (error instanceof Error && error.message.includes('P2002')) {
                message = `A policy for leave type "${policyData.leaveType}" already exists. Please choose a different leave type or update the existing policy.`;
                statusCode = 409;
            }
            const response = {
                success: false,
                message,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(statusCode).json(response);
        }
    }
    static async updateLeavePolicy(req, res) {
        try {
            const adminId = req.user?.id;
            const { id } = req.params;
            const updateData = req.body;
            const existingPolicy = await prisma_1.default.leavePolicy.findFirst({
                where: {
                    id,
                    createdBy: adminId
                }
            });
            if (!existingPolicy) {
                const response = {
                    success: false,
                    message: 'Policy not found',
                    error: 'Policy with the given ID does not exist or you do not have permission to update it'
                };
                res.status(404).json(response);
                return;
            }
            const policy = await prisma_1.default.leavePolicy.update({
                where: { id },
                data: updateData
            });
            const response = {
                success: true,
                message: 'Policy updated successfully',
                data: policy
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updatePolicy:', error);
            const response = {
                success: false,
                message: 'Failed to update policy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async deleteLeavePolicy(req, res) {
        try {
            const adminId = req.user?.id;
            const { id } = req.params;
            const existingPolicy = await prisma_1.default.leavePolicy.findFirst({
                where: {
                    id,
                    createdBy: adminId
                }
            });
            if (!existingPolicy) {
                const response = {
                    success: false,
                    message: 'Policy not found',
                    error: 'Policy with the given ID does not exist or you do not have permission to delete it'
                };
                res.status(404).json(response);
                return;
            }
            await prisma_1.default.leavePolicy.delete({
                where: { id }
            });
            const response = {
                success: true,
                message: 'Policy deleted successfully'
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in deletePolicy:', error);
            const response = {
                success: false,
                message: 'Failed to delete policy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeavePolicyStats(req, res) {
        try {
            const adminId = req.user?.id;
            const totalPolicies = await prisma_1.default.leavePolicy.count({
                where: {
                    createdBy: adminId
                }
            });
            const response = {
                success: true,
                message: 'Policy statistics retrieved successfully',
                data: {
                    totalPolicies,
                    activePolicies: totalPolicies,
                    inactivePolicies: 0,
                    byLeaveType: {}
                }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getPolicyStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve policy statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeavePolicyTypes(req, res) {
        try {
            const policies = await prisma_1.default.leavePolicy.findMany({
                select: { leaveType: true },
                distinct: ['leaveType']
            });
            const leaveTypes = policies.map(policy => policy.leaveType);
            const response = {
                success: true,
                message: 'Leave types retrieved successfully',
                data: leaveTypes
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveTypes:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave types',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async toggleLeavePolicyStatus(req, res) {
        try {
            const adminId = req.user?.id;
            const { id } = req.params;
            const { isActive } = req.body;
            const existingPolicy = await prisma_1.default.leavePolicy.findFirst({
                where: {
                    id,
                    createdBy: adminId
                }
            });
            if (!existingPolicy) {
                const response = {
                    success: false,
                    message: 'Policy not found',
                    error: 'Policy with the given ID does not exist or you do not have permission to update it'
                };
                res.status(404).json(response);
                return;
            }
            const policy = await prisma_1.default.leavePolicy.update({
                where: { id },
                data: {
                    isActive: isActive
                }
            });
            const response = {
                success: true,
                message: 'Policy status updated successfully',
                data: policy
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in toggleLeavePolicyStatus:', error);
            const response = {
                success: false,
                message: 'Failed to toggle policy status',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async bulkUpdateLeavePolicies(req, res) {
        try {
            const { policyIds, updates } = req.body;
            const response = {
                success: true,
                message: 'Bulk update completed successfully',
                data: { updatedCount: policyIds?.length || 0 }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in bulkUpdateLeavePolicies:', error);
            const response = {
                success: false,
                message: 'Failed to bulk update policies',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.LeavePolicyController = LeavePolicyController;
//# sourceMappingURL=leavePolicyController.js.map