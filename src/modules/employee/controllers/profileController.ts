import { Request, Response } from 'express';
import { ProfileService } from '../services/profileService';
import { ApiResponse } from '../../../types';
import { Address, EmergencyContact, NotificationPreferences, CalendarPreferences, PrivacySettings } from '../types';

export class ProfileController {
  /**
   * Get employee profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const profile = await ProfileService.getProfile(employeeId);

      const response: ApiResponse = {
        success: true,
        message: 'Profile retrieved successfully',
        data: profile
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getProfile:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update employee profile
   */
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const updateData = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const profile = await ProfileService.updateProfile(employeeId, updateData);

      const response: ApiResponse = {
        success: true,
        message: 'Profile updated successfully',
        data: profile
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateProfile:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update profile',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Update avatar
   */
  static async updateAvatar(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { avatar } = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      if (!avatar) {
        const response: ApiResponse = {
          success: false,
          message: 'Avatar URL is required',
          error: 'Missing avatar URL'
        };
        res.status(400).json(response);
        return;
      }

      const profile = await ProfileService.updateAvatar(employeeId, avatar);

      const response: ApiResponse = {
        success: true,
        message: 'Avatar updated successfully',
        data: profile
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateAvatar:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update avatar',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Update password
   */
  static async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const { currentPassword, newPassword } = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      if (!currentPassword || !newPassword) {
        const response: ApiResponse = {
          success: false,
          message: 'Current password and new password are required',
          error: 'Missing required fields'
        };
        res.status(400).json(response);
        return;
      }

      const success = await ProfileService.updatePassword(employeeId, currentPassword, newPassword);

      if (!success) {
        const response: ApiResponse = {
          success: false,
          message: 'Failed to update password',
          error: 'Password update failed'
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Password updated successfully',
        data: { updated: true }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updatePassword:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update password',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const profile = await ProfileService.getProfile(employeeId);
      const preferences = profile.preferences.notifications;

      const response: ApiResponse = {
        success: true,
        message: 'Notification preferences retrieved successfully',
        data: preferences
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getNotificationPreferences:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve notification preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const preferences: NotificationPreferences = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const updatedPreferences = await ProfileService.updateNotificationPreferences(employeeId, preferences);

      const response: ApiResponse = {
        success: true,
        message: 'Notification preferences updated successfully',
        data: updatedPreferences
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateNotificationPreferences:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update notification preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get calendar preferences
   */
  static async getCalendarPreferences(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const profile = await ProfileService.getProfile(employeeId);
      const preferences = profile.preferences.calendar;

      const response: ApiResponse = {
        success: true,
        message: 'Calendar preferences retrieved successfully',
        data: preferences
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getCalendarPreferences:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve calendar preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update calendar preferences
   */
  static async updateCalendarPreferences(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const preferences: CalendarPreferences = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const updatedPreferences = await ProfileService.updateCalendarPreferences(employeeId, preferences);

      const response: ApiResponse = {
        success: true,
        message: 'Calendar preferences updated successfully',
        data: updatedPreferences
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateCalendarPreferences:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update calendar preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get privacy settings
   */
  static async getPrivacySettings(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const profile = await ProfileService.getProfile(employeeId);
      const settings = profile.preferences.privacy;

      const response: ApiResponse = {
        success: true,
        message: 'Privacy settings retrieved successfully',
        data: settings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPrivacySettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve privacy settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacySettings(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const settings: PrivacySettings = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const updatedSettings = await ProfileService.updatePrivacySettings(employeeId, settings);

      const response: ApiResponse = {
        success: true,
        message: 'Privacy settings updated successfully',
        data: updatedSettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updatePrivacySettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update privacy settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get security settings
   */
  static async getSecuritySettings(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const securitySettings = await ProfileService.getSecuritySettings(employeeId);

      const response: ApiResponse = {
        success: true,
        message: 'Security settings retrieved successfully',
        data: securitySettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getSecuritySettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve security settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get performance goals
   */
  static async getPerformanceGoals(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const goals = await ProfileService.getPerformanceGoals(employeeId);

      const response: ApiResponse = {
        success: true,
        message: 'Performance goals retrieved successfully',
        data: goals
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getPerformanceGoals:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve performance goals',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get achievements
   */
  static async getAchievements(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const achievements = await ProfileService.getAchievements(employeeId);

      const response: ApiResponse = {
        success: true,
        message: 'Achievements retrieved successfully',
        data: achievements
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getAchievements:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve achievements',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update security settings
   */
  static async updateSecuritySettings(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const settings = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      await ProfileService.updateSecuritySettings(employeeId, settings);

      const response: ApiResponse = {
        success: true,
        message: 'Security settings updated successfully',
        data: { updated: true }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateSecuritySettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update security settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Get app preferences
   */
  static async getAppPreferences(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const profile = await ProfileService.getProfile(employeeId);
      const preferences = {
        theme: profile.preferences.theme,
        language: profile.preferences.language,
        dateFormat: profile.preferences.dateFormat,
        timeFormat: profile.preferences.timeFormat,
        weekStartsOn: profile.preferences.weekStartsOn
      };

      const response: ApiResponse = {
        success: true,
        message: 'App preferences retrieved successfully',
        data: preferences
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getAppPreferences:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve app preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update app preferences
   */
  static async updateAppPreferences(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;
      const preferences = req.body;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      await ProfileService.updateAppPreferences(employeeId, preferences);

      const response: ApiResponse = {
        success: true,
        message: 'App preferences updated successfully',
        data: { updated: true }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateAppPreferences:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update app preferences',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(400).json(response);
    }
  }

  /**
   * Export user data
   */
  static async exportUserData(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      const exportData = await ProfileService.exportUserData(employeeId);

      const response: ApiResponse = {
        success: true,
        message: 'User data exported successfully',
        data: exportData
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in exportUserData:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to export user data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Delete user account
   */
  static async deleteUserAccount(req: Request, res: Response): Promise<void> {
    try {
      const employeeId = (req as any).user?.id;

      if (!employeeId) {
        const response: ApiResponse = {
          success: false,
          message: 'Employee ID is required',
          error: 'Missing employee information'
        };
        res.status(400).json(response);
        return;
      }

      await ProfileService.deleteUserAccount(employeeId);

      const response: ApiResponse = {
        success: true,
        message: 'User account deleted successfully',
        data: { deleted: true }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in deleteUserAccount:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete user account',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
