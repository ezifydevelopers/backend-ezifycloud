"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AttendanceService {
    static async getAttendanceRecords(filters) {
        try {
            const { search = '', status = 'all', department = '', startDate, endDate, page = 1, limit = 10, sortBy = 'date', sortOrder = 'desc' } = filters;
            const skip = (page - 1) * limit;
            const where = {};
            if (search) {
                where.OR = [
                    { user: { name: { contains: search, mode: 'insensitive' } } },
                    { user: { email: { contains: search, mode: 'insensitive' } } },
                    { notes: { contains: search, mode: 'insensitive' } }
                ];
            }
            if (status !== 'all') {
                where.status = status;
            }
            if (department) {
                where.user = { ...where.user, department };
            }
            if (startDate) {
                where.date = { ...where.date, gte: new Date(startDate) };
            }
            if (endDate) {
                where.date = { ...where.date, lte: new Date(endDate) };
            }
            const totalCount = await prisma.attendanceRecord.count({ where });
            const attendanceRecords = await prisma.attendanceRecord.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true
                        }
                    }
                }
            });
            const records = attendanceRecords.map(record => ({
                id: record.id,
                userId: record.userId,
                userName: record.user.name,
                userEmail: record.user.email,
                department: record.user.department || 'Unassigned',
                position: 'Employee',
                avatar: undefined,
                date: record.date,
                checkInTime: record.checkInTime || undefined,
                checkOutTime: record.checkOutTime || undefined,
                status: record.status,
                hoursWorked: Number(record.hoursWorked),
                overtimeHours: Number(record.overtimeHours),
                notes: record.notes || undefined,
                isHoliday: record.isHoliday,
                isWeekend: record.isWeekend,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt
            }));
            const pagination = {
                page,
                limit,
                totalItems: totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page < Math.ceil(totalCount / limit),
                hasPrevPage: page > 1,
                hasNext: page < Math.ceil(totalCount / limit),
                hasPrev: page > 1
            };
            return {
                records,
                pagination,
                totalCount
            };
        }
        catch (error) {
            console.error('Error fetching attendance records:', error);
            throw new Error('Failed to fetch attendance records');
        }
    }
    static async getAttendanceStats(dateRange) {
        try {
            const startDate = dateRange?.startDate || new Date(new Date().getFullYear(), 0, 1);
            const endDate = dateRange?.endDate || new Date();
            const where = {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            };
            const [totalRecords, presentCount, absentCount, lateCount, halfDayCount, onLeaveCount, totalHoursWorked, totalOvertimeHours] = await Promise.all([
                prisma.attendanceRecord.count({ where }),
                prisma.attendanceRecord.count({ where: { ...where, status: 'present' } }),
                prisma.attendanceRecord.count({ where: { ...where, status: 'absent' } }),
                prisma.attendanceRecord.count({ where: { ...where, status: 'late' } }),
                prisma.attendanceRecord.count({ where: { ...where, status: 'half_day' } }),
                prisma.attendanceRecord.count({ where: { ...where, status: 'on_leave' } }),
                prisma.attendanceRecord.aggregate({
                    where,
                    _sum: { hoursWorked: true }
                }),
                prisma.attendanceRecord.aggregate({
                    where,
                    _sum: { overtimeHours: true }
                })
            ]);
            const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;
            const averageHoursPerDay = totalRecords > 0 ? Number(totalHoursWorked._sum.hoursWorked) / totalRecords : 0;
            return {
                totalRecords,
                presentCount,
                absentCount,
                lateCount,
                halfDayCount,
                onLeaveCount,
                attendanceRate: Math.round(attendanceRate * 100) / 100,
                totalHoursWorked: Number(totalHoursWorked._sum.hoursWorked) || 0,
                totalOvertimeHours: Number(totalOvertimeHours._sum.overtimeHours) || 0,
                averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100
            };
        }
        catch (error) {
            console.error('Error fetching attendance statistics:', error);
            throw new Error('Failed to fetch attendance statistics');
        }
    }
    static async getAttendanceRecordById(id) {
        try {
            const record = await prisma.attendanceRecord.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true
                        }
                    }
                }
            });
            if (!record) {
                return null;
            }
            return {
                id: record.id,
                userId: record.userId,
                userName: record.user.name,
                userEmail: record.user.email,
                department: record.user.department || 'Unassigned',
                position: 'Employee',
                avatar: undefined,
                date: record.date,
                checkInTime: record.checkInTime || undefined,
                checkOutTime: record.checkOutTime || undefined,
                status: record.status,
                hoursWorked: Number(record.hoursWorked),
                overtimeHours: Number(record.overtimeHours),
                notes: record.notes || undefined,
                isHoliday: record.isHoliday,
                isWeekend: record.isWeekend,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt
            };
        }
        catch (error) {
            console.error('Error fetching attendance record:', error);
            throw new Error('Failed to fetch attendance record');
        }
    }
    static async updateAttendanceRecord(id, updateData) {
        try {
            const existingRecord = await prisma.attendanceRecord.findUnique({
                where: { id }
            });
            if (!existingRecord) {
                throw new Error('Attendance record not found');
            }
            const updateFields = {};
            if (updateData.checkInTime !== undefined) {
                updateFields.checkInTime = updateData.checkInTime ? new Date(updateData.checkInTime) : null;
            }
            if (updateData.checkOutTime !== undefined) {
                updateFields.checkOutTime = updateData.checkOutTime ? new Date(updateData.checkOutTime) : null;
            }
            if (updateData.status !== undefined) {
                updateFields.status = updateData.status;
            }
            if (updateData.hoursWorked !== undefined) {
                updateFields.hoursWorked = updateData.hoursWorked;
            }
            if (updateData.overtimeHours !== undefined) {
                updateFields.overtimeHours = updateData.overtimeHours;
            }
            if (updateData.notes !== undefined) {
                updateFields.notes = updateData.notes;
            }
            const updatedRecord = await prisma.attendanceRecord.update({
                where: { id },
                data: updateFields,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true
                        }
                    }
                }
            });
            return {
                id: updatedRecord.id,
                userId: updatedRecord.userId,
                userName: updatedRecord.user.name,
                userEmail: updatedRecord.user.email,
                department: updatedRecord.user.department || 'Unassigned',
                position: 'Employee',
                avatar: undefined,
                date: updatedRecord.date,
                checkInTime: updatedRecord.checkInTime || undefined,
                checkOutTime: updatedRecord.checkOutTime || undefined,
                status: updatedRecord.status,
                hoursWorked: Number(updatedRecord.hoursWorked),
                overtimeHours: Number(updatedRecord.overtimeHours),
                notes: updatedRecord.notes || undefined,
                isHoliday: updatedRecord.isHoliday,
                isWeekend: updatedRecord.isWeekend,
                createdAt: updatedRecord.createdAt,
                updatedAt: updatedRecord.updatedAt
            };
        }
        catch (error) {
            console.error('Error updating attendance record:', error);
            throw new Error('Failed to update attendance record');
        }
    }
    static async createAttendanceRecord(recordData) {
        try {
            const newRecord = await prisma.attendanceRecord.create({
                data: {
                    userId: recordData.userId,
                    date: new Date(recordData.date),
                    checkInTime: recordData.checkInTime ? new Date(recordData.checkInTime) : null,
                    checkOutTime: recordData.checkOutTime ? new Date(recordData.checkOutTime) : null,
                    status: recordData.status,
                    hoursWorked: recordData.hoursWorked,
                    overtimeHours: recordData.overtimeHours,
                    notes: recordData.notes,
                    isHoliday: recordData.isHoliday,
                    isWeekend: recordData.isWeekend
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true
                        }
                    }
                }
            });
            return {
                id: newRecord.id,
                userId: newRecord.userId,
                userName: newRecord.user.name,
                userEmail: newRecord.user.email,
                department: newRecord.user.department || 'Unassigned',
                position: 'Employee',
                avatar: undefined,
                date: newRecord.date,
                checkInTime: newRecord.checkInTime || undefined,
                checkOutTime: newRecord.checkOutTime || undefined,
                status: newRecord.status,
                hoursWorked: Number(newRecord.hoursWorked),
                overtimeHours: Number(newRecord.overtimeHours),
                notes: newRecord.notes || undefined,
                isHoliday: newRecord.isHoliday,
                isWeekend: newRecord.isWeekend,
                createdAt: newRecord.createdAt,
                updatedAt: newRecord.updatedAt
            };
        }
        catch (error) {
            console.error('Error creating attendance record:', error);
            throw new Error('Failed to create attendance record');
        }
    }
    static async deleteAttendanceRecord(id) {
        try {
            await prisma.attendanceRecord.delete({
                where: { id }
            });
            return true;
        }
        catch (error) {
            console.error('Error deleting attendance record:', error);
            throw new Error('Failed to delete attendance record');
        }
    }
    static async getUserAttendanceRecords(userId, dateRange) {
        try {
            const where = { userId };
            if (dateRange) {
                where.date = {
                    gte: dateRange.startDate,
                    lte: dateRange.endDate
                };
            }
            const records = await prisma.attendanceRecord.findMany({
                where,
                orderBy: { date: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: true
                        }
                    }
                }
            });
            return records.map(record => ({
                id: record.id,
                userId: record.userId,
                userName: record.user.name,
                userEmail: record.user.email,
                department: record.user.department || 'Unassigned',
                position: 'Employee',
                avatar: undefined,
                date: record.date,
                checkInTime: record.checkInTime || undefined,
                checkOutTime: record.checkOutTime || undefined,
                status: record.status,
                hoursWorked: Number(record.hoursWorked),
                overtimeHours: Number(record.overtimeHours),
                notes: record.notes || undefined,
                isHoliday: record.isHoliday,
                isWeekend: record.isWeekend,
                createdAt: record.createdAt,
                updatedAt: record.updatedAt
            }));
        }
        catch (error) {
            console.error('Error fetching user attendance records:', error);
            throw new Error('Failed to fetch user attendance records');
        }
    }
}
exports.AttendanceService = AttendanceService;
//# sourceMappingURL=attendanceService.js.map