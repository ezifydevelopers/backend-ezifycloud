"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryController = void 0;
const salaryService_1 = __importDefault(require("../../../services/salaryService"));
const prisma_1 = __importDefault(require("../../../lib/prisma"));
class SalaryController {
    static async getTeamSalaries(req, res) {
        try {
            const managerId = req.user?.id;
            console.log('🔍 ManagerSalaryController: getTeamSalaries called by manager:', managerId);
            const salaries = await salaryService_1.default.getEmployeeSalaries(managerId);
            const response = {
                success: true,
                message: 'Team salaries fetched successfully',
                data: salaries
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamSalaries:', error);
            const response = {
                success: false,
                message: 'Failed to fetch team salaries',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamMonthlySalaries(req, res) {
        try {
            const managerId = req.user?.id;
            const { year, month } = req.query;
            console.log('🔍 ManagerSalaryController: getTeamMonthlySalaries called', { managerId, year, month });
            const yearNum = year ? parseInt(year) : new Date().getFullYear();
            const monthNum = month ? parseInt(month) : undefined;
            const salaries = await salaryService_1.default.getMonthlySalaries(yearNum, monthNum, managerId);
            const response = {
                success: true,
                message: 'Team monthly salaries fetched successfully',
                data: salaries
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamMonthlySalaries:', error);
            const response = {
                success: false,
                message: 'Failed to fetch team monthly salaries',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async generateTeamMonthlySalaries(req, res) {
        try {
            const managerId = req.user?.id;
            const { year, month } = req.body;
            console.log('🔍 ManagerSalaryController: generateTeamMonthlySalaries called', { managerId, year, month });
            if (!year || !month) {
                const response = {
                    success: false,
                    message: 'Year and month are required',
                    error: 'Missing required parameters'
                };
                res.status(400).json(response);
                return;
            }
            const generatedSalaries = await salaryService_1.default.generateMonthlySalaries(year, month, managerId);
            const response = {
                success: true,
                message: `Team monthly salaries generated successfully for ${generatedSalaries.length} employees`,
                data: generatedSalaries
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error in generateTeamMonthlySalaries:', error);
            const response = {
                success: false,
                message: 'Failed to generate team monthly salaries',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async approveTeamMonthlySalary(req, res) {
        try {
            const managerId = req.user?.id;
            const { salaryId } = req.params;
            const { notes } = req.body;
            console.log('🔍 ManagerSalaryController: approveTeamMonthlySalary called', { managerId, salaryId });
            const approvedSalary = await salaryService_1.default.approveMonthlySalary(salaryId, managerId, notes);
            const response = {
                success: true,
                message: 'Team monthly salary approved successfully',
                data: approvedSalary
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in approveTeamMonthlySalary:', error);
            const response = {
                success: false,
                message: 'Failed to approve team monthly salary',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getTeamSalaryStatistics(req, res) {
        try {
            const managerId = req.user?.id;
            const { year, month } = req.query;
            console.log('🔍 ManagerSalaryController: getTeamSalaryStatistics called', { managerId, year, month });
            const yearNum = year ? parseInt(year) : new Date().getFullYear();
            const monthNum = month ? parseInt(month) : undefined;
            const statistics = await salaryService_1.default.getSalaryStatistics(yearNum, monthNum, managerId);
            const response = {
                success: true,
                message: 'Team salary statistics fetched successfully',
                data: statistics
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getTeamSalaryStatistics:', error);
            const response = {
                success: false,
                message: 'Failed to fetch team salary statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async calculateTeamMemberSalary(req, res) {
        try {
            const managerId = req.user?.id;
            const { userId } = req.params;
            const { year, month } = req.query;
            console.log('🔍 ManagerSalaryController: calculateTeamMemberSalary called', { managerId, userId, year, month });
            const user = await prisma_1.default.user.findFirst({
                where: {
                    id: userId,
                    managerId: managerId
                }
            });
            if (!user) {
                const response = {
                    success: false,
                    message: 'User not found in your team',
                    error: 'Unauthorized access'
                };
                res.status(403).json(response);
                return;
            }
            const yearNum = year ? parseInt(year) : new Date().getFullYear();
            const monthNum = month ? parseInt(month) : new Date().getMonth() + 1;
            const calculation = await salaryService_1.default.calculateMonthlySalary(userId, yearNum, monthNum);
            const response = {
                success: true,
                message: 'Team member salary calculation completed successfully',
                data: calculation
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in calculateTeamMemberSalary:', error);
            const response = {
                success: false,
                message: 'Failed to calculate team member salary',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.SalaryController = SalaryController;
//# sourceMappingURL=salaryController.js.map