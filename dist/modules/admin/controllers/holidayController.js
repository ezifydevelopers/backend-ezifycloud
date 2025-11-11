"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayController = void 0;
const prisma_1 = __importDefault(require("../../../lib/prisma"));
class HolidayController {
    static async getHolidays(req, res) {
        try {
            const adminId = req.user?.id;
            const { type = 'all', year = new Date().getFullYear().toString(), limit = 50, page = 1 } = req.query;
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const where = {};
            if (type !== 'all') {
                where.type = type;
            }
            if (year && year !== 'all') {
                const startDate = new Date(parseInt(year), 0, 1);
                const endDate = new Date(parseInt(year), 11, 31);
                where.date = {
                    gte: startDate,
                    lte: endDate
                };
            }
            const holidays = await prisma_1.default.holiday.findMany({
                where,
                skip,
                take: parseInt(limit),
                orderBy: { date: 'asc' },
                include: {
                    creator: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            const total = await prisma_1.default.holiday.count({ where });
            const response = {
                success: true,
                message: 'Holidays fetched successfully',
                data: holidays,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching holidays:', error);
            const response = {
                success: false,
                message: 'Failed to fetch holidays',
                data: null
            };
            res.status(500).json(response);
        }
    }
    static async getHolidayById(req, res) {
        try {
            const adminId = req.user?.id;
            const { id } = req.params;
            const holiday = await prisma_1.default.holiday.findFirst({
                where: { id },
                include: {
                    creator: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            if (!holiday) {
                const response = {
                    success: false,
                    message: 'Holiday not found',
                    data: null
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Holiday fetched successfully',
                data: holiday
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching holiday:', error);
            const response = {
                success: false,
                message: 'Failed to fetch holiday',
                data: null
            };
            res.status(500).json(response);
        }
    }
    static async createHoliday(req, res) {
        const adminId = req.user?.id;
        const holidayData = req.body;
        try {
            console.log('🔍 HolidayController: Creating holiday:', holidayData);
            const existingHoliday = await prisma_1.default.holiday.findFirst({
                where: {
                    name: holidayData.name,
                    date: new Date(holidayData.date)
                }
            });
            if (existingHoliday) {
                const response = {
                    success: false,
                    message: `A holiday with the name "${holidayData.name}" on ${new Date(holidayData.date).toLocaleDateString()} already exists. Please use a different name or date.`,
                    data: null
                };
                res.status(400).json(response);
                return;
            }
            const holiday = await prisma_1.default.holiday.create({
                data: {
                    ...holidayData,
                    createdBy: adminId
                },
                include: {
                    creator: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            const response = {
                success: true,
                message: 'Holiday created successfully',
                data: holiday
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('❌ Error creating holiday:', error);
            console.error('❌ Holiday data received:', holidayData);
            console.error('❌ Admin ID:', adminId);
            const response = {
                success: false,
                message: `Failed to create holiday: ${error instanceof Error ? error.message : 'Unknown error'}`,
                data: null
            };
            res.status(500).json(response);
        }
    }
    static async updateHoliday(req, res) {
        try {
            const adminId = req.user?.id;
            const { id } = req.params;
            const updateData = req.body;
            const existingHoliday = await prisma_1.default.holiday.findFirst({
                where: { id }
            });
            if (!existingHoliday) {
                const response = {
                    success: false,
                    message: 'Holiday not found',
                    data: null
                };
                res.status(404).json(response);
                return;
            }
            const holiday = await prisma_1.default.holiday.update({
                where: { id },
                data: updateData,
                include: {
                    creator: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            const response = {
                success: true,
                message: 'Holiday updated successfully',
                data: holiday
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error updating holiday:', error);
            const response = {
                success: false,
                message: 'Failed to update holiday',
                data: null
            };
            res.status(500).json(response);
        }
    }
    static async deleteHoliday(req, res) {
        try {
            const adminId = req.user?.id;
            const { id } = req.params;
            const existingHoliday = await prisma_1.default.holiday.findFirst({
                where: { id }
            });
            if (!existingHoliday) {
                const response = {
                    success: false,
                    message: 'Holiday not found',
                    data: null
                };
                res.status(404).json(response);
                return;
            }
            await prisma_1.default.holiday.delete({
                where: { id }
            });
            const response = {
                success: true,
                message: 'Holiday deleted successfully',
                data: null
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error deleting holiday:', error);
            const response = {
                success: false,
                message: 'Failed to delete holiday',
                data: null
            };
            res.status(500).json(response);
        }
    }
    static async toggleHolidayStatus(req, res) {
        try {
            const adminId = req.user?.id;
            const { id } = req.params;
            const { isActive } = req.body;
            const existingHoliday = await prisma_1.default.holiday.findFirst({
                where: { id }
            });
            if (!existingHoliday) {
                const response = {
                    success: false,
                    message: 'Holiday not found',
                    data: null
                };
                res.status(404).json(response);
                return;
            }
            const holiday = await prisma_1.default.holiday.update({
                where: { id },
                data: { isActive: isActive },
                include: {
                    creator: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });
            const response = {
                success: true,
                message: `Holiday ${isActive ? 'activated' : 'deactivated'} successfully`,
                data: holiday
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error toggling holiday status:', error);
            const response = {
                success: false,
                message: 'Failed to toggle holiday status',
                data: null
            };
            res.status(500).json(response);
        }
    }
    static async getHolidayStats(req, res) {
        try {
            const adminId = req.user?.id;
            const { year = 'all' } = req.query;
            const where = {};
            if (year && year !== 'all') {
                const startDate = new Date(parseInt(year), 0, 1);
                const endDate = new Date(parseInt(year), 11, 31);
                where.date = {
                    gte: startDate,
                    lte: endDate
                };
            }
            const totalHolidays = await prisma_1.default.holiday.count({ where });
            const activeHolidays = await prisma_1.default.holiday.count({
                where: { ...where, isActive: true }
            });
            const publicHolidays = await prisma_1.default.holiday.count({
                where: { ...where, type: 'public' }
            });
            const companyHolidays = await prisma_1.default.holiday.count({
                where: { ...where, type: 'company' }
            });
            const stats = {
                totalHolidays,
                activeHolidays,
                publicHolidays,
                companyHolidays,
                inactiveHolidays: totalHolidays - activeHolidays
            };
            const response = {
                success: true,
                message: 'Holiday statistics fetched successfully',
                data: stats
            };
            res.json(response);
        }
        catch (error) {
            console.error('Error fetching holiday stats:', error);
            const response = {
                success: false,
                message: 'Failed to fetch holiday statistics',
                data: null
            };
            res.status(500).json(response);
        }
    }
}
exports.HolidayController = HolidayController;
//# sourceMappingURL=holidayController.js.map