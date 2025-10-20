"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayController = void 0;
const prisma_1 = __importDefault(require("../../../lib/prisma"));
class HolidayController {
    static async getUpcomingHolidays(req, res) {
        try {
            const { limit = 10 } = req.query;
            const today = new Date();
            const holidays = await prisma_1.default.holiday.findMany({
                where: {
                    isActive: true,
                    date: {
                        gte: today
                    }
                },
                take: parseInt(limit),
                orderBy: { date: 'asc' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    date: true,
                    type: true,
                    isRecurring: true
                }
            });
            const response = {
                success: true,
                message: 'Upcoming holidays fetched successfully',
                data: holidays
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching upcoming holidays:', error);
            const response = {
                success: false,
                message: 'Failed to fetch upcoming holidays',
                data: null
            };
            res.status(500).json(response);
        }
    }
    static async getHolidaysByYear(req, res) {
        try {
            const { year = new Date().getFullYear().toString() } = req.query;
            const startDate = new Date(parseInt(year), 0, 1);
            const endDate = new Date(parseInt(year), 11, 31);
            const holidays = await prisma_1.default.holiday.findMany({
                where: {
                    isActive: true,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: { date: 'asc' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    date: true,
                    type: true,
                    isRecurring: true
                }
            });
            const response = {
                success: true,
                message: 'Holidays fetched successfully',
                data: holidays
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching holidays by year:', error);
            const response = {
                success: false,
                message: 'Failed to fetch holidays',
                data: null
            };
            res.status(500).json(response);
        }
    }
    static async getHolidaysByType(req, res) {
        try {
            const { type, year = new Date().getFullYear().toString() } = req.query;
            if (!type) {
                const response = {
                    success: false,
                    message: 'Holiday type is required',
                    data: null
                };
                res.status(400).json(response);
                return;
            }
            const startDate = new Date(parseInt(year), 0, 1);
            const endDate = new Date(parseInt(year), 11, 31);
            const holidays = await prisma_1.default.holiday.findMany({
                where: {
                    isActive: true,
                    type: type,
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: { date: 'asc' },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    date: true,
                    type: true,
                    isRecurring: true
                }
            });
            const response = {
                success: true,
                message: 'Holidays by type fetched successfully',
                data: holidays
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching holidays by type:', error);
            const response = {
                success: false,
                message: 'Failed to fetch holidays',
                data: null
            };
            res.status(500).json(response);
        }
    }
}
exports.HolidayController = HolidayController;
//# sourceMappingURL=holidayController.js.map