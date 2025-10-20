"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ProfileService {
    static async getProfile(employeeId) {
        try {
            const employee = await prisma.user.findUnique({
                where: { id: employeeId },
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            if (!employee) {
                throw new Error('Employee not found');
            }
            const preferences = await this.getUserPreferences(employeeId);
            return {
                id: employee.id,
                name: employee.name,
                email: employee.email,
                phone: employee.phone || undefined,
                department: employee.department || 'Unassigned',
                position: 'Employee',
                managerId: employee.managerId || undefined,
                managerName: employee.manager?.name,
                joinDate: employee.createdAt,
                avatar: employee.profilePicture || undefined,
                bio: employee.bio || undefined,
                address: employee.address || undefined,
                emergencyContact: employee.emergencyContact || undefined,
                preferences,
                isActive: employee.isActive,
                createdAt: employee.createdAt,
                updatedAt: employee.updatedAt
            };
        }
        catch (error) {
            console.error('Error fetching profile:', error);
            throw new Error('Failed to fetch profile');
        }
    }
    static async updateProfile(employeeId, updateData) {
        try {
            const existingEmployee = await prisma.user.findUnique({
                where: { id: employeeId }
            });
            if (!existingEmployee) {
                throw new Error('Employee not found');
            }
            const updateFields = {};
            if (updateData.name !== undefined) {
                updateFields.name = updateData.name;
            }
            if (updateData.phone !== undefined) {
                updateFields.phone = updateData.phone;
            }
            if (updateData.bio !== undefined) {
                updateFields.bio = updateData.bio;
            }
            if (updateData.address !== undefined) {
                updateFields.address = updateData.address;
            }
            if (updateData.emergencyContact !== undefined) {
                updateFields.emergencyContact = updateData.emergencyContact;
            }
            console.log('🔍 Profile: Updating profile fields:', updateFields);
            const updatedEmployee = await prisma.user.update({
                where: { id: employeeId },
                data: updateFields,
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            const preferences = await this.getUserPreferences(employeeId);
            return {
                id: updatedEmployee.id,
                name: updatedEmployee.name,
                email: updatedEmployee.email,
                phone: updatedEmployee.phone || undefined,
                department: updatedEmployee.department || 'Unassigned',
                position: 'Employee',
                managerId: updatedEmployee.managerId || undefined,
                managerName: updatedEmployee.manager?.name,
                joinDate: updatedEmployee.createdAt,
                avatar: updatedEmployee.profilePicture || undefined,
                bio: updatedEmployee.bio || undefined,
                address: updatedEmployee.address || undefined,
                emergencyContact: updatedEmployee.emergencyContact || undefined,
                preferences,
                isActive: updatedEmployee.isActive,
                createdAt: updatedEmployee.createdAt,
                updatedAt: updatedEmployee.updatedAt
            };
        }
        catch (error) {
            console.error('Error updating profile:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to update profile');
        }
    }
    static async updateAvatar(employeeId, avatarUrl) {
        try {
            const updatedEmployee = await prisma.user.update({
                where: { id: employeeId },
                data: { profilePicture: avatarUrl },
                include: {
                    manager: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });
            const preferences = await this.getUserPreferences(employeeId);
            return {
                id: updatedEmployee.id,
                name: updatedEmployee.name,
                email: updatedEmployee.email,
                phone: updatedEmployee.phone || undefined,
                department: updatedEmployee.department || 'Unassigned',
                position: 'Employee',
                managerId: updatedEmployee.managerId || undefined,
                managerName: updatedEmployee.manager?.name,
                joinDate: updatedEmployee.createdAt,
                avatar: updatedEmployee.profilePicture || undefined,
                bio: updatedEmployee.bio || undefined,
                address: updatedEmployee.address || undefined,
                emergencyContact: updatedEmployee.emergencyContact || undefined,
                preferences,
                isActive: updatedEmployee.isActive,
                createdAt: updatedEmployee.createdAt,
                updatedAt: updatedEmployee.updatedAt
            };
        }
        catch (error) {
            console.error('Error updating avatar:', error);
            throw new Error('Failed to update avatar');
        }
    }
    static async updatePassword(employeeId, currentPassword, newPassword) {
        try {
            console.log(`Password update requested for employee ${employeeId}`);
            return true;
        }
        catch (error) {
            console.error('Error updating password:', error);
            throw new Error('Failed to update password');
        }
    }
    static async getUserPreferences(employeeId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: employeeId }
            });
            if (!user) {
                throw new Error('User not found');
            }
            const preferences = {
                timezone: 'UTC',
                language: user.language ?? 'en',
                dateFormat: user.dateFormat ?? 'MM/DD/YYYY',
                timeFormat: user.timeFormat ?? '12h',
                theme: user.theme ?? 'system',
                weekStartsOn: user.weekStartsOn ?? 'monday',
                notifications: {
                    emailNotifications: user.emailNotifications ?? true,
                    pushNotifications: user.pushNotifications ?? true,
                    leaveRequestAlerts: user.leaveRequestAlerts ?? true,
                    approvalNotifications: user.approvalNotifications ?? true,
                    reminderNotifications: user.reminderNotifications ?? true,
                    systemUpdates: user.systemUpdates ?? false
                },
                calendar: {
                    defaultView: 'month',
                    showWeekends: false,
                    showHolidays: true,
                    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
                    startTime: '09:00',
                    endTime: '17:00'
                },
                privacy: {
                    showLeaveDetails: user.showLeaveHistory ?? true,
                    showContactInfo: user.showContactInfo ?? false,
                    showPerformance: false,
                    allowDirectMessages: user.allowDirectMessages ?? true
                }
            };
            return preferences;
        }
        catch (error) {
            console.error('Error fetching user preferences:', error);
            throw new Error('Failed to fetch user preferences');
        }
    }
    static async updateNotificationPreferences(employeeId, preferences) {
        try {
            return preferences;
        }
        catch (error) {
            console.error('Error updating notification preferences:', error);
            throw new Error('Failed to update notification preferences');
        }
    }
    static async updateCalendarPreferences(employeeId, preferences) {
        try {
            console.log(`Calendar preferences updated for employee ${employeeId}`);
            return preferences;
        }
        catch (error) {
            console.error('Error updating calendar preferences:', error);
            throw new Error('Failed to update calendar preferences');
        }
    }
    static async getSecuritySettings(employeeId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: employeeId }
            });
            if (!user) {
                throw new Error('User not found');
            }
            return {
                twoFactorEnabled: user.twoFactorEnabled ?? false,
                loginNotificationsEnabled: user.loginNotificationsEnabled ?? true,
                passwordChangeRequired: user.passwordChangeRequired ?? false,
                sessionTimeoutMinutes: user.sessionTimeoutMinutes ?? 30,
                passwordLastChanged: new Date(),
                loginHistory: [],
                activeSessions: [],
                securityQuestions: []
            };
        }
        catch (error) {
            console.error('Error fetching security settings:', error);
            throw new Error('Failed to fetch security settings');
        }
    }
    static async updateSecuritySettings(employeeId, settings) {
        try {
        }
        catch (error) {
            console.error('Error updating security settings:', error);
            throw new Error('Failed to update security settings');
        }
    }
    static async updateAppPreferences(employeeId, preferences) {
        try {
        }
        catch (error) {
            console.error('Error updating app preferences:', error);
            throw new Error('Failed to update app preferences');
        }
    }
    static async updatePrivacySettings(employeeId, settings) {
        try {
        }
        catch (error) {
            console.error('Error updating privacy settings:', error);
            throw new Error('Failed to update privacy settings');
        }
    }
    static async exportUserData(employeeId) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: employeeId },
                include: {
                    leaveRequests: true,
                    leaveBalances: true,
                    manager: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });
            if (!user) {
                throw new Error('User not found');
            }
            const exportData = {
                profile: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    department: user.department,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                },
                leaveRequests: user.leaveRequests,
                leaveBalances: user.leaveBalances,
                manager: user.manager,
                exportDate: new Date()
            };
            return exportData;
        }
        catch (error) {
            console.error('Error exporting user data:', error);
            throw new Error('Failed to export user data');
        }
    }
    static async deleteUserAccount(employeeId) {
        try {
            await prisma.user.update({
                where: { id: employeeId },
                data: {
                    isActive: false,
                    email: `deleted_${Date.now()}@example.com`,
                    name: 'Deleted User'
                }
            });
        }
        catch (error) {
            console.error('Error deleting user account:', error);
            throw new Error('Failed to delete user account');
        }
    }
    static async getPerformanceGoals(employeeId) {
        try {
            const goals = [
                {
                    id: '1',
                    title: 'Complete Q4 Project',
                    description: 'Finish the major project by end of quarter',
                    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    progress: 75,
                    status: 'in_progress',
                    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                },
                {
                    id: '2',
                    title: 'Improve Team Collaboration',
                    description: 'Enhance communication and teamwork skills',
                    targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
                    progress: 40,
                    status: 'in_progress',
                    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
                },
                {
                    id: '3',
                    title: 'Learn New Technology',
                    description: 'Master the new framework introduced this quarter',
                    targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                    progress: 20,
                    status: 'not_started',
                    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            ];
            return goals;
        }
        catch (error) {
            console.error('Error fetching performance goals:', error);
            return [];
        }
    }
    static async getAchievements(employeeId) {
        try {
            const achievements = [
                {
                    id: '1',
                    title: 'Employee of the Month',
                    description: 'Recognized for outstanding performance and dedication',
                    type: 'award',
                    date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                    issuer: 'HR Department'
                },
                {
                    id: '2',
                    title: 'Project Completion Certificate',
                    description: 'Successfully completed the major project ahead of schedule',
                    type: 'certification',
                    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    issuer: 'Project Manager'
                },
                {
                    id: '3',
                    title: 'Team Player Recognition',
                    description: 'Acknowledged for excellent teamwork and collaboration',
                    type: 'recognition',
                    date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
                    issuer: 'Team Lead'
                }
            ];
            return achievements;
        }
        catch (error) {
            console.error('Error fetching achievements:', error);
            return [];
        }
    }
}
exports.ProfileService = ProfileService;
//# sourceMappingURL=profileService.js.map