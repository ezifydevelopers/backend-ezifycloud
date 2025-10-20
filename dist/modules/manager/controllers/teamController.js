"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamController = void 0;
const teamService_1 = require("../services/teamService");
class TeamController {
    static async getTeamMembers(req, res) {
        try {
            const managerId = req.user?.id;
            console.log('🔍 TeamController: getTeamMembers called');
            console.log('🔍 TeamController: req.user:', req.user);
            console.log('🔍 TeamController: managerId extracted:', managerId);
            const filters = {
                search: req.query.search && req.query.search !== 'undefined' ? req.query.search : '',
                department: req.query.department && req.query.department !== 'undefined' ? req.query.department : '',
                role: req.query.role && req.query.role !== 'undefined' ? req.query.role : '',
                status: req.query.status && req.query.status !== 'undefined' ? req.query.status : 'all',
                performance: req.query.performance && req.query.performance !== 'undefined' ? req.query.performance : 'all',
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            };
            console.log('🔍 TeamController: filters after processing:', filters);
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const result = await teamService_1.TeamService.getTeamMembers(managerId, filters);
            const response = {
                success: true,
                message: 'Team members retrieved successfully',
                data: result.teamMembers,
                pagination: result.pagination
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamMembers:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team members',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamMemberById(req, res) {
        try {
            const managerId = req.user?.id;
            const { id } = req.params;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            if (!id) {
                const response = {
                    success: false,
                    message: 'Team member ID is required',
                    error: 'Missing team member ID'
                };
                res.status(400).json(response);
                return;
            }
            const teamMember = await teamService_1.TeamService.getTeamMemberById(managerId, id);
            if (!teamMember) {
                const response = {
                    success: false,
                    message: 'Team member not found',
                    error: 'Team member with the given ID does not exist or is not under your management'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Team member retrieved successfully',
                data: teamMember
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamMemberById:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team member',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async addTeamMember(req, res) {
        try {
            const managerId = req.user?.id;
            const memberData = req.body;
            console.log('🔍 TeamController: addTeamMember called');
            console.log('🔍 TeamController: managerId:', managerId);
            console.log('🔍 TeamController: memberData:', memberData);
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const result = await teamService_1.TeamService.addTeamMember(managerId, memberData);
            const response = {
                success: true,
                message: 'Team member added successfully',
                data: result
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('❌ TeamController: Error adding team member:', error);
            const response = {
                success: false,
                message: 'Failed to add team member',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateTeamMember(req, res) {
        try {
            const managerId = req.user?.id;
            const { id } = req.params;
            const updateData = req.body;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            if (!id) {
                const response = {
                    success: false,
                    message: 'Team member ID is required',
                    error: 'Missing team member ID'
                };
                res.status(400).json(response);
                return;
            }
            const teamMember = await teamService_1.TeamService.updateTeamMember(managerId, id, updateData);
            const response = {
                success: true,
                message: 'Team member updated successfully',
                data: teamMember
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateTeamMember:', error);
            const response = {
                success: false,
                message: 'Failed to update team member',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async toggleTeamMemberStatus(req, res) {
        try {
            const managerId = req.user?.id;
            const { id } = req.params;
            const { isActive } = req.body;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            if (!id) {
                const response = {
                    success: false,
                    message: 'Team member ID is required',
                    error: 'Missing team member ID'
                };
                res.status(400).json(response);
                return;
            }
            if (typeof isActive !== 'boolean') {
                const response = {
                    success: false,
                    message: 'isActive must be a boolean value',
                    error: 'Invalid isActive value'
                };
                res.status(400).json(response);
                return;
            }
            const teamMember = await teamService_1.TeamService.toggleTeamMemberStatus(managerId, id, isActive);
            const response = {
                success: true,
                message: `Team member ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: teamMember
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in toggleTeamMemberStatus:', error);
            const response = {
                success: false,
                message: 'Failed to toggle team member status',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async getTeamStats(req, res) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const stats = await teamService_1.TeamService.getTeamStats(managerId);
            const response = {
                success: true,
                message: 'Team statistics retrieved successfully',
                data: stats
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamStats:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamDepartments(req, res) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const departments = await teamService_1.TeamService.getTeamDepartments(managerId);
            const response = {
                success: true,
                message: 'Team departments retrieved successfully',
                data: departments
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamDepartments:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team departments',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamMemberPerformance(req, res) {
        try {
            const managerId = req.user?.id;
            const { id } = req.params;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            if (!id) {
                const response = {
                    success: false,
                    message: 'Team member ID is required',
                    error: 'Missing team member ID'
                };
                res.status(400).json(response);
                return;
            }
            const teamMember = await teamService_1.TeamService.getTeamMemberById(managerId, id);
            if (!teamMember) {
                const response = {
                    success: false,
                    message: 'Team member not found',
                    error: 'Team member with the given ID does not exist or is not under your management'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Team member performance retrieved successfully',
                data: teamMember.performance
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamMemberPerformance:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team member performance',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamMemberRecentLeaves(req, res) {
        try {
            const managerId = req.user?.id;
            const { id } = req.params;
            const { limit = '5' } = req.query;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            if (!id) {
                const response = {
                    success: false,
                    message: 'Team member ID is required',
                    error: 'Missing team member ID'
                };
                res.status(400).json(response);
                return;
            }
            const teamMember = await teamService_1.TeamService.getTeamMemberById(managerId, id);
            if (!teamMember) {
                const response = {
                    success: false,
                    message: 'Team member not found',
                    error: 'Team member with the given ID does not exist or is not under your management'
                };
                res.status(404).json(response);
                return;
            }
            const recentLeaves = teamMember.recentLeaves.slice(0, parseInt(limit, 10));
            const response = {
                success: true,
                message: 'Team member recent leaves retrieved successfully',
                data: recentLeaves
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamMemberRecentLeaves:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team member recent leaves',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamMemberLeaveBalance(req, res) {
        try {
            const managerId = req.user?.id;
            const memberId = req.params.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            if (!memberId) {
                const response = {
                    success: false,
                    message: 'Member ID is required',
                    error: 'Missing member ID'
                };
                res.status(400).json(response);
                return;
            }
            const leaveBalance = await teamService_1.TeamService.getTeamMemberLeaveBalance(managerId, memberId);
            const response = {
                success: true,
                message: 'Team member leave balance retrieved successfully',
                data: leaveBalance
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamMemberLeaveBalance:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team member leave balance',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamPerformance(req, res) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const performanceMetrics = await teamService_1.TeamService.getTeamPerformanceMetrics(managerId);
            const response = {
                success: true,
                message: 'Team performance metrics retrieved successfully',
                data: performanceMetrics
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamPerformance:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team performance metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamCapacity(req, res) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                const response = {
                    success: false,
                    message: 'Manager ID is required',
                    error: 'Missing manager information'
                };
                res.status(400).json(response);
                return;
            }
            const capacityMetrics = await teamService_1.TeamService.getTeamCapacityMetrics(managerId);
            const response = {
                success: true,
                message: 'Team capacity metrics retrieved successfully',
                data: capacityMetrics
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamCapacity:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve team capacity metrics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.TeamController = TeamController;
//# sourceMappingURL=teamController.js.map