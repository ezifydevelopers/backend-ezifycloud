"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyController = void 0;
const policyService_1 = require("../services/policyService");
class PolicyController {
    static async getPolicies(req, res) {
        try {
            const { status, limit = 50, page = 1 } = req.query;
            const policies = await policyService_1.PolicyService.getPolicies({
                status: status,
                limit: parseInt(limit),
                page: parseInt(page)
            });
            const response = {
                success: true,
                message: 'Policies retrieved successfully',
                data: policies
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
    static async createPolicy(req, res) {
        try {
            const policyData = req.body;
            const policy = await policyService_1.PolicyService.createPolicy(policyData);
            const response = {
                success: true,
                message: 'Policy created successfully',
                data: policy
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error in createPolicy:', error);
            const response = {
                success: false,
                message: 'Failed to create policy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getPolicyById(req, res) {
        try {
            const { id } = req.params;
            const policy = await policyService_1.PolicyService.getPolicyById(id);
            if (!policy) {
                const response = {
                    success: false,
                    message: 'Policy not found',
                    error: 'Policy with the given ID does not exist'
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
    static async updatePolicy(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const policy = await policyService_1.PolicyService.updatePolicy(id, updateData);
            if (!policy) {
                const response = {
                    success: false,
                    message: 'Policy not found',
                    error: 'Policy with the given ID does not exist'
                };
                res.status(404).json(response);
                return;
            }
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
    static async deletePolicy(req, res) {
        try {
            const { id } = req.params;
            const success = await policyService_1.PolicyService.deletePolicy(id);
            if (!success) {
                const response = {
                    success: false,
                    message: 'Policy not found',
                    error: 'Policy with the given ID does not exist'
                };
                res.status(404).json(response);
                return;
            }
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
}
exports.PolicyController = PolicyController;
//# sourceMappingURL=policyController.js.map