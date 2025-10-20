"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeavePolicyController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class LeavePolicyController {
    static async getLeavePolicies(req, res) {
        try {
            const { status = 'active', limit = 50, page = 1 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const policies = await prisma.leavePolicy.findMany({
                where: {
                    isActive: true
                },
                skip,
                take: parseInt(limit),
                orderBy: {
                    createdAt: 'desc'
                }
            });
            const total = await prisma.leavePolicy.count({
                where: {
                    isActive: true
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
            console.error('Error in getLeavePolicies:', error);
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
            const { id } = req.params;
            const policy = await prisma.leavePolicy.findFirst({
                where: {
                    id,
                    isActive: true
                }
            });
            if (!policy) {
                const response = {
                    success: false,
                    message: 'Policy not found',
                    error: 'Policy with the given ID does not exist or is not active'
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
            console.error('Error in getLeavePolicyById:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve policy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeavePolicyStats(req, res) {
        try {
            const activePolicies = await prisma.leavePolicy.count({
                where: {
                    isActive: true
                }
            });
            const totalPolicies = await prisma.leavePolicy.count();
            const inactivePolicies = totalPolicies - activePolicies;
            const response = {
                success: true,
                message: 'Policy statistics retrieved successfully',
                data: {
                    totalPolicies,
                    activePolicies,
                    inactivePolicies,
                    byLeaveType: {}
                }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeavePolicyStats:', error);
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
            const policies = await prisma.leavePolicy.findMany({
                where: {
                    isActive: true
                },
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
            console.error('Error in getLeavePolicyTypes:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave types',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.LeavePolicyController = LeavePolicyController;
//# sourceMappingURL=leavePolicyController.js.map