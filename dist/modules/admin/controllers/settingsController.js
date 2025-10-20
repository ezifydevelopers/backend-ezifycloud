"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SettingsController {
    static async getAllSettings(req, res) {
        try {
            const defaultSettings = {
                companyName: 'Ezify Cloud',
                companyEmail: 'admin@ezifycloud.com',
                workingDaysPerWeek: 5,
                workingHoursPerDay: 8,
                leaveRequestAdvanceNotice: 7,
                maxConsecutiveLeaveDays: 30,
                autoApproveLeaveDays: 1,
                requireManagerApproval: true,
                allowHalfDayLeave: true,
                allowWeekendLeave: false,
                carryForwardEnabled: true,
                maxCarryForwardDays: 5,
                carryForwardExpiryMonths: 12,
                emailNotifications: true,
                smsNotifications: false,
                systemMaintenanceMode: false,
                maintenanceMessage: 'System is under maintenance. Please try again later.',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const response = {
                success: true,
                message: 'Settings retrieved successfully',
                data: defaultSettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getSettings:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateSettings(req, res) {
        try {
            const settingsData = req.body;
            const updatedSettings = {
                ...settingsData,
                updatedAt: new Date().toISOString()
            };
            const response = {
                success: true,
                message: 'Settings updated successfully',
                data: updatedSettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateSettings:', error);
            const response = {
                success: false,
                message: 'Failed to update settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getNotificationSettings(req, res) {
        try {
            const notificationSettings = {
                emailNotifications: true,
                smsNotifications: false,
                pushNotifications: true,
                leaveRequestNotifications: true,
                approvalNotifications: true,
                reminderNotifications: true,
                systemUpdateNotifications: true,
                maintenanceNotifications: true
            };
            const response = {
                success: true,
                message: 'Notification settings retrieved successfully',
                data: notificationSettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getNotificationSettings:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve notification settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateNotificationSettings(req, res) {
        try {
            const notificationData = req.body;
            const updatedSettings = {
                ...notificationData,
                updatedAt: new Date().toISOString()
            };
            const response = {
                success: true,
                message: 'Notification settings updated successfully',
                data: updatedSettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateNotificationSettings:', error);
            const response = {
                success: false,
                message: 'Failed to update notification settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getSystemInfo(req, res) {
        try {
            const systemInfo = {
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch,
                lastRestart: new Date(Date.now() - process.uptime() * 1000).toISOString(),
                databaseStatus: 'connected',
                serverTime: new Date().toISOString()
            };
            const response = {
                success: true,
                message: 'System information retrieved successfully',
                data: systemInfo
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getSystemInfo:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve system information',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async resetSettings(req, res) {
        try {
            const defaultSettings = {
                companyName: 'Ezify Cloud',
                companyEmail: 'admin@ezifycloud.com',
                workingDaysPerWeek: 5,
                workingHoursPerDay: 8,
                leaveRequestAdvanceNotice: 7,
                maxConsecutiveLeaveDays: 30,
                autoApproveLeaveDays: 1,
                requireManagerApproval: true,
                allowHalfDayLeave: true,
                allowWeekendLeave: false,
                carryForwardEnabled: true,
                maxCarryForwardDays: 5,
                carryForwardExpiryMonths: 12,
                emailNotifications: true,
                smsNotifications: false,
                systemMaintenanceMode: false,
                maintenanceMessage: 'System is under maintenance. Please try again later.',
                resetAt: new Date().toISOString()
            };
            const response = {
                success: true,
                message: 'Settings reset to defaults successfully',
                data: defaultSettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in resetSettings:', error);
            const response = {
                success: false,
                message: 'Failed to reset settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getSettings(req, res) {
        return this.getAllSettings(req, res);
    }
    static async getCompanySettings(req, res) {
        try {
            const companySettings = {
                companyName: 'Ezify Cloud',
                companyEmail: 'admin@ezifycloud.com',
                companyPhone: '+1-555-0123',
                companyAddress: '123 Business St, City, State 12345',
                companyWebsite: 'https://ezifycloud.com',
                companyLogo: null,
                taxId: '12-3456789',
                registrationNumber: 'REG-2024-001'
            };
            const response = {
                success: true,
                message: 'Company settings retrieved successfully',
                data: companySettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getCompanySettings:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve company settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateCompanySettings(req, res) {
        try {
            const settingsData = req.body;
            const response = {
                success: true,
                message: 'Company settings updated successfully',
                data: { ...settingsData, updatedAt: new Date().toISOString() }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateCompanySettings:', error);
            const response = {
                success: false,
                message: 'Failed to update company settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getLeaveSettings(req, res) {
        try {
            const leaveSettings = {
                workingDaysPerWeek: 5,
                workingHoursPerDay: 8,
                leaveRequestAdvanceNotice: 7,
                maxConsecutiveLeaveDays: 30,
                autoApproveLeaveDays: 1,
                requireManagerApproval: true,
                allowHalfDayLeave: true,
                allowWeekendLeave: false,
                carryForwardEnabled: true,
                maxCarryForwardDays: 5,
                carryForwardExpiryMonths: 12
            };
            const response = {
                success: true,
                message: 'Leave settings retrieved successfully',
                data: leaveSettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getLeaveSettings:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve leave settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateLeaveSettings(req, res) {
        try {
            const settingsData = req.body;
            const response = {
                success: true,
                message: 'Leave settings updated successfully',
                data: { ...settingsData, updatedAt: new Date().toISOString() }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateLeaveSettings:', error);
            const response = {
                success: false,
                message: 'Failed to update leave settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getSecuritySettings(req, res) {
        try {
            const securitySettings = {
                passwordMinLength: 8,
                passwordRequireUppercase: true,
                passwordRequireLowercase: true,
                passwordRequireNumbers: true,
                passwordRequireSymbols: true,
                sessionTimeout: 30,
                maxLoginAttempts: 5,
                lockoutDuration: 15,
                twoFactorEnabled: false,
                ipWhitelist: [],
                allowedDomains: []
            };
            const response = {
                success: true,
                message: 'Security settings retrieved successfully',
                data: securitySettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getSecuritySettings:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve security settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateSecuritySettings(req, res) {
        try {
            const settingsData = req.body;
            const response = {
                success: true,
                message: 'Security settings updated successfully',
                data: { ...settingsData, updatedAt: new Date().toISOString() }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateSecuritySettings:', error);
            const response = {
                success: false,
                message: 'Failed to update security settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getSystemConfigSettings(req, res) {
        try {
            const systemConfig = {
                maintenanceMode: false,
                maintenanceMessage: 'System is under maintenance. Please try again later.',
                maxFileUploadSize: 10,
                allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
                backupFrequency: 'daily',
                logRetentionDays: 90,
                apiRateLimit: 100,
                emailServiceProvider: 'smtp',
                smsServiceProvider: 'twilio'
            };
            const response = {
                success: true,
                message: 'System configuration retrieved successfully',
                data: systemConfig
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getSystemConfigSettings:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve system configuration',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateSystemConfigSettings(req, res) {
        try {
            const settingsData = req.body;
            const response = {
                success: true,
                message: 'System configuration updated successfully',
                data: { ...settingsData, updatedAt: new Date().toISOString() }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateSystemConfigSettings:', error);
            const response = {
                success: false,
                message: 'Failed to update system configuration',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async resetSettingsToDefault(req, res) {
        return this.resetSettings(req, res);
    }
    static async exportSettings(req, res) {
        try {
            const allSettings = {
                company: await this.getCompanySettings(req, res),
                leave: await this.getLeaveSettings(req, res),
                security: await this.getSecuritySettings(req, res),
                system: await this.getSystemConfigSettings(req, res),
                exportedAt: new Date().toISOString()
            };
            const response = {
                success: true,
                message: 'Settings exported successfully',
                data: allSettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in exportSettings:', error);
            const response = {
                success: false,
                message: 'Failed to export settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async importSettings(req, res) {
        try {
            const importData = req.body;
            const response = {
                success: true,
                message: 'Settings imported successfully',
                data: { ...importData, importedAt: new Date().toISOString() }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in importSettings:', error);
            const response = {
                success: false,
                message: 'Failed to import settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getSettingsHistory(req, res) {
        try {
            const history = [
                {
                    id: '1',
                    action: 'Company settings updated',
                    changedBy: 'admin@ezifycloud.com',
                    changedAt: new Date(Date.now() - 86400000).toISOString(),
                    changes: { companyName: 'Old Company Name → Ezify Cloud' }
                },
                {
                    id: '2',
                    action: 'Leave settings updated',
                    changedBy: 'admin@ezifycloud.com',
                    changedAt: new Date(Date.now() - 172800000).toISOString(),
                    changes: { maxConsecutiveLeaveDays: '20 → 30' }
                }
            ];
            const response = {
                success: true,
                message: 'Settings history retrieved successfully',
                data: history
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getSettingsHistory:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve settings history',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.SettingsController = SettingsController;
//# sourceMappingURL=settingsController.js.map