"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalaryController = void 0;
const salaryService_1 = __importDefault(require("../../../services/salaryService"));
class SalaryController {
    static async getEmployeeSalaries(req, res) {
        try {
            const adminId = req.user?.id;
            console.log('🔍 SalaryController: getEmployeeSalaries called by admin:', adminId);
            const salaries = await salaryService_1.default.getEmployeeSalaries();
            const response = {
                success: true,
                message: 'Employee salaries fetched successfully',
                data: salaries
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getEmployeeSalaries:', error);
            const response = {
                success: false,
                message: 'Failed to fetch employee salaries',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getMonthlySalaries(req, res) {
        try {
            const adminId = req.user?.id;
            const { year, month } = req.query;
            console.log('🔍 SalaryController: getMonthlySalaries called', { adminId, year, month });
            const yearNum = year ? parseInt(year) : new Date().getFullYear();
            const monthNum = month ? parseInt(month) : undefined;
            const salaries = await salaryService_1.default.getMonthlySalaries(yearNum, monthNum);
            const response = {
                success: true,
                message: 'Monthly salaries fetched successfully',
                data: salaries
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getMonthlySalaries:', error);
            const response = {
                success: false,
                message: 'Failed to fetch monthly salaries',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async generateMonthlySalaries(req, res) {
        try {
            const adminId = req.user?.id;
            const { year, month } = req.body;
            console.log('🔍 SalaryController: generateMonthlySalaries called', { adminId, year, month });
            if (!year || !month) {
                const response = {
                    success: false,
                    message: 'Year and month are required',
                    error: 'Missing required parameters'
                };
                res.status(400).json(response);
                return;
            }
            const generatedSalaries = await salaryService_1.default.generateMonthlySalaries(year, month);
            const response = {
                success: true,
                message: `Monthly salaries generated successfully for ${generatedSalaries.length} employees`,
                data: generatedSalaries
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error in generateMonthlySalaries:', error);
            const response = {
                success: false,
                message: 'Failed to generate monthly salaries',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async approveMonthlySalary(req, res) {
        try {
            const adminId = req.user?.id;
            const { salaryId } = req.params;
            const { notes } = req.body;
            console.log('🔍 SalaryController: approveMonthlySalary called', { adminId, salaryId });
            const approvedSalary = await salaryService_1.default.approveMonthlySalary(salaryId, adminId, notes);
            const response = {
                success: true,
                message: 'Monthly salary approved successfully',
                data: approvedSalary
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in approveMonthlySalary:', error);
            const response = {
                success: false,
                message: 'Failed to approve monthly salary',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getSalaryStatistics(req, res) {
        try {
            const adminId = req.user?.id;
            const { year, month } = req.query;
            console.log('🔍 SalaryController: getSalaryStatistics called', { adminId, year, month });
            const yearNum = year ? parseInt(year) : new Date().getFullYear();
            const monthNum = month ? parseInt(month) : undefined;
            const statistics = await salaryService_1.default.getSalaryStatistics(yearNum, monthNum);
            const response = {
                success: true,
                message: 'Salary statistics fetched successfully',
                data: statistics
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getSalaryStatistics:', error);
            const response = {
                success: false,
                message: 'Failed to fetch salary statistics',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async calculateEmployeeSalary(req, res) {
        try {
            const adminId = req.user?.id;
            const { userId } = req.params;
            const { year, month } = req.query;
            console.log('🔍 SalaryController: calculateEmployeeSalary called', { adminId, userId, year, month });
            const yearNum = year ? parseInt(year) : new Date().getFullYear();
            const monthNum = month ? parseInt(month) : new Date().getMonth() + 1;
            const calculation = await salaryService_1.default.calculateMonthlySalary(userId, yearNum, monthNum);
            const response = {
                success: true,
                message: 'Salary calculation completed successfully',
                data: calculation
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in calculateEmployeeSalary:', error);
            const response = {
                success: false,
                message: 'Failed to calculate employee salary',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.SalaryController = SalaryController;
//# sourceMappingURL=salaryController.js.map