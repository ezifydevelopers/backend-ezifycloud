"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileController = void 0;
const profileService_1 = require("../services/profileService");
class ProfileController {
    static async getProfile(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const profile = await profileService_1.ProfileService.getProfile(employeeId);
            const response = {
                success: true,
                message: 'Profile retrieved successfully',
                data: profile
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getProfile:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateProfile(req, res) {
        try {
            const employeeId = req.user?.id;
            const updateData = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const profile = await profileService_1.ProfileService.updateProfile(employeeId, updateData);
            const response = {
                success: true,
                message: 'Profile updated successfully',
                data: profile
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateProfile:', error);
            const response = {
                success: false,
                message: 'Failed to update profile',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async updateAvatar(req, res) {
        try {
            const employeeId = req.user?.id;
            const { avatar } = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            if (!avatar) {
                const response = {
                    success: false,
                    message: 'Avatar URL is required',
                    error: 'Missing avatar URL'
                };
                res.status(400).json(response);
                return;
            }
            const profile = await profileService_1.ProfileService.updateAvatar(employeeId, avatar);
            const response = {
                success: true,
                message: 'Avatar updated successfully',
                data: profile
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateAvatar:', error);
            const response = {
                success: false,
                message: 'Failed to update avatar',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async updatePassword(req, res) {
        try {
            const employeeId = req.user?.id;
            const { currentPassword, newPassword } = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            if (!currentPassword || !newPassword) {
                const response = {
                    success: false,
                    message: 'Current password and new password are required',
                    error: 'Missing required fields'
                };
                res.status(400).json(response);
                return;
            }
            const success = await profileService_1.ProfileService.updatePassword(employeeId, currentPassword, newPassword);
            if (!success) {
                const response = {
                    success: false,
                    message: 'Failed to update password',
                    error: 'Password update failed'
                };
                res.status(400).json(response);
                return;
            }
            const response = {
                success: true,
                message: 'Password updated successfully',
                data: { updated: true }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updatePassword:', error);
            const response = {
                success: false,
                message: 'Failed to update password',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async getNotificationPreferences(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const profile = await profileService_1.ProfileService.getProfile(employeeId);
            const preferences = profile.preferences.notifications;
            const response = {
                success: true,
                message: 'Notification preferences retrieved successfully',
                data: preferences
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getNotificationPreferences:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve notification preferences',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateNotificationPreferences(req, res) {
        try {
            const employeeId = req.user?.id;
            const preferences = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const updatedPreferences = await profileService_1.ProfileService.updateNotificationPreferences(employeeId, preferences);
            const response = {
                success: true,
                message: 'Notification preferences updated successfully',
                data: updatedPreferences
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateNotificationPreferences:', error);
            const response = {
                success: false,
                message: 'Failed to update notification preferences',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async getCalendarPreferences(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const profile = await profileService_1.ProfileService.getProfile(employeeId);
            const preferences = profile.preferences.calendar;
            const response = {
                success: true,
                message: 'Calendar preferences retrieved successfully',
                data: preferences
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getCalendarPreferences:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve calendar preferences',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateCalendarPreferences(req, res) {
        try {
            const employeeId = req.user?.id;
            const preferences = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const updatedPreferences = await profileService_1.ProfileService.updateCalendarPreferences(employeeId, preferences);
            const response = {
                success: true,
                message: 'Calendar preferences updated successfully',
                data: updatedPreferences
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateCalendarPreferences:', error);
            const response = {
                success: false,
                message: 'Failed to update calendar preferences',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async getPrivacySettings(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const profile = await profileService_1.ProfileService.getProfile(employeeId);
            const settings = profile.preferences.privacy;
            const response = {
                success: true,
                message: 'Privacy settings retrieved successfully',
                data: settings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getPrivacySettings:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve privacy settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updatePrivacySettings(req, res) {
        try {
            const employeeId = req.user?.id;
            const settings = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const updatedSettings = await profileService_1.ProfileService.updatePrivacySettings(employeeId, settings);
            const response = {
                success: true,
                message: 'Privacy settings updated successfully',
                data: updatedSettings
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updatePrivacySettings:', error);
            const response = {
                success: false,
                message: 'Failed to update privacy settings',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async getSecuritySettings(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const securitySettings = await profileService_1.ProfileService.getSecuritySettings(employeeId);
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
    static async getPerformanceGoals(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const goals = await profileService_1.ProfileService.getPerformanceGoals(employeeId);
            const response = {
                success: true,
                message: 'Performance goals retrieved successfully',
                data: goals
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getPerformanceGoals:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve performance goals',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async getAchievements(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const achievements = await profileService_1.ProfileService.getAchievements(employeeId);
            const response = {
                success: true,
                message: 'Achievements retrieved successfully',
                data: achievements
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getAchievements:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve achievements',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateSecuritySettings(req, res) {
        try {
            const employeeId = req.user?.id;
            const settings = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            await profileService_1.ProfileService.updateSecuritySettings(employeeId, settings);
            const response = {
                success: true,
                message: 'Security settings updated successfully',
                data: { updated: true }
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
            res.status(400).json(response);
        }
    }
    static async getAppPreferences(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const profile = await profileService_1.ProfileService.getProfile(employeeId);
            const preferences = {
                theme: profile.preferences.theme,
                language: profile.preferences.language,
                dateFormat: profile.preferences.dateFormat,
                timeFormat: profile.preferences.timeFormat,
                weekStartsOn: profile.preferences.weekStartsOn
            };
            const response = {
                success: true,
                message: 'App preferences retrieved successfully',
                data: preferences
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in getAppPreferences:', error);
            const response = {
                success: false,
                message: 'Failed to retrieve app preferences',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async updateAppPreferences(req, res) {
        try {
            const employeeId = req.user?.id;
            const preferences = req.body;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            await profileService_1.ProfileService.updateAppPreferences(employeeId, preferences);
            const response = {
                success: true,
                message: 'App preferences updated successfully',
                data: { updated: true }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in updateAppPreferences:', error);
            const response = {
                success: false,
                message: 'Failed to update app preferences',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(400).json(response);
        }
    }
    static async exportUserData(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            const exportData = await profileService_1.ProfileService.exportUserData(employeeId);
            const response = {
                success: true,
                message: 'User data exported successfully',
                data: exportData
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in exportUserData:', error);
            const response = {
                success: false,
                message: 'Failed to export user data',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
    static async deleteUserAccount(req, res) {
        try {
            const employeeId = req.user?.id;
            if (!employeeId) {
                const response = {
                    success: false,
                    message: 'Employee ID is required',
                    error: 'Missing employee information'
                };
                res.status(400).json(response);
                return;
            }
            await profileService_1.ProfileService.deleteUserAccount(employeeId);
            const response = {
                success: true,
                message: 'User account deleted successfully',
                data: { deleted: true }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error in deleteUserAccount:', error);
            const response = {
                success: false,
                message: 'Failed to delete user account',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
            res.status(500).json(response);
        }
    }
}
exports.ProfileController = ProfileController;
//# sourceMappingURL=profileController.js.map