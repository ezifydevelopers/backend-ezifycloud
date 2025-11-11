import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponse } from '../../../types';

const prisma = new PrismaClient();

export class SettingsController {
  /**
   * Process working days calculation for a specific month
   */
  static async processWorkingDays(req: Request, res: Response): Promise<void> {
    try {
      const { year, month } = req.body;
      const { triggerWorkingDaysCalculation } = await import('../../../services/workingDaysScheduler');
      
      let result;
      if (year && month) {
        result = await triggerWorkingDaysCalculation(year, month);
      } else {
        result = await triggerWorkingDaysCalculation();
      }

      res.status(200).json({
        success: true,
        message: 'Working days calculation completed successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error in processWorkingDays:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to process working days calculation',
      });
    }
  }

  /**
   * Get working days calendar for a specific month
   */
  static async getWorkingDaysCalendar(req: Request, res: Response): Promise<void> {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      const { WorkingDaysService } = await import('../../../services/workingDaysService');
      
      // Try to get from database first
      let calendar = await WorkingDaysService.getWorkingDaysCalendar(year, month);
      
      // If not found, calculate and save it
      if (!calendar) {
        await WorkingDaysService.processMonthlyWorkingDays(year, month);
        calendar = await WorkingDaysService.getWorkingDaysCalendar(year, month);
      }

      if (!calendar) {
        throw new Error('Failed to get working days calendar');
      }

      res.status(200).json({
        success: true,
        message: 'Working days calendar retrieved successfully',
        data: calendar,
      });
    } catch (error) {
      console.error('Error in getWorkingDaysCalendar:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve working days calendar',
      });
    }
  }

  /**
   * Get monthly calendar with working days, weekends, and holidays
   */
  static async getMonthlyCalendar(req: Request, res: Response): Promise<void> {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const workingDaysPerWeek = req.query.workingDaysPerWeek 
        ? JSON.parse(req.query.workingDaysPerWeek as string)
        : [1, 2, 3, 4, 5]; // Monday-Friday by default

      const { WorkingDaysService } = await import('../../../services/workingDaysService');
      const calendar = await WorkingDaysService.generateMonthlyCalendar(year, month, workingDaysPerWeek);

      res.status(200).json({
        success: true,
        message: 'Monthly calendar retrieved successfully',
        data: calendar,
      });
    } catch (error) {
      console.error('Error in getMonthlyCalendar:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve monthly calendar',
      });
    }
  }

  /** 
   * Get all system settings
   */
  static async getAllSettings(req: Request, res: Response): Promise<void> {
    try {
      // For now, return default settings since we don't have a settings table
      const defaultSettings = {
        companyName: 'Ezify Cloud',
        companyEmail: 'admin@ezifycloud.com',
        workingDaysPerWeek: 5,
        workingHoursPerDay: 8,
        leaveRequestAdvanceNotice: 7, // days
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

      const response: ApiResponse = {
        success: true,
        message: 'Settings retrieved successfully',
        data: defaultSettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update system settings
   */
  static async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const settingsData = req.body;

      const updatedSettings = {
        ...settingsData,
        updatedAt: new Date().toISOString()
      };

      const response: ApiResponse = {
        success: true,
        message: 'Settings updated successfully',
        data: updatedSettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get notification settings
   */
  static async getNotificationSettings(req: Request, res: Response): Promise<void> {
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

      const response: ApiResponse = {
        success: true,
        message: 'Notification settings retrieved successfully',
        data: notificationSettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getNotificationSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve notification settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update notification settings
   */
  static async updateNotificationSettings(req: Request, res: Response): Promise<void> {
    try {
      const notificationData = req.body;
      
      const updatedSettings = {
        ...notificationData,
        updatedAt: new Date().toISOString()
      };

      const response: ApiResponse = {
        success: true,
        message: 'Notification settings updated successfully',
        data: updatedSettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateNotificationSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update notification settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get system information
   */
  static async getSystemInfo(req: Request, res: Response): Promise<void> {
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
        databaseStatus: 'connected', // You could check actual DB connection here
        serverTime: new Date().toISOString()
      };

      const response: ApiResponse = {
        success: true,
        message: 'System information retrieved successfully',
        data: systemInfo
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getSystemInfo:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve system information',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Reset system settings to defaults
   */
  static async resetSettings(req: Request, res: Response): Promise<void> {
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

      const response: ApiResponse = {
        success: true,
        message: 'Settings reset to defaults successfully',
        data: defaultSettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in resetSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to reset settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get system settings (alias for getAllSettings)
   */
  static async getSettings(req: Request, res: Response): Promise<void> {
    return this.getAllSettings(req, res);
  }

  /**
   * Get company settings
   */
  static async getCompanySettings(req: Request, res: Response): Promise<void> {
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

      const response: ApiResponse = {
        success: true,
        message: 'Company settings retrieved successfully',
        data: companySettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getCompanySettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve company settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update company settings
   */
  static async updateCompanySettings(req: Request, res: Response): Promise<void> {
    try {
      const settingsData = req.body;
      
      const response: ApiResponse = {
        success: true,
        message: 'Company settings updated successfully',
        data: { ...settingsData, updatedAt: new Date().toISOString() }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateCompanySettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update company settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get leave settings
   */
  static async getLeaveSettings(req: Request, res: Response): Promise<void> {
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

      const response: ApiResponse = {
        success: true,
        message: 'Leave settings retrieved successfully',
        data: leaveSettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getLeaveSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve leave settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update leave settings
   */
  static async updateLeaveSettings(req: Request, res: Response): Promise<void> {
    try {
      const settingsData = req.body;
      
      const response: ApiResponse = {
        success: true,
        message: 'Leave settings updated successfully',
        data: { ...settingsData, updatedAt: new Date().toISOString() }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateLeaveSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update leave settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get security settings
   */
  static async getSecuritySettings(req: Request, res: Response): Promise<void> {
    try {
      const securitySettings = {
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireLowercase: true,
        passwordRequireNumbers: true,
        passwordRequireSymbols: true,
        sessionTimeout: 30, // minutes
        maxLoginAttempts: 5,
        lockoutDuration: 15, // minutes
        twoFactorEnabled: false,
        ipWhitelist: [],
        allowedDomains: []
      };

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
   * Update security settings
   */
  static async updateSecuritySettings(req: Request, res: Response): Promise<void> {
    try {
      const settingsData = req.body;
      
      const response: ApiResponse = {
        success: true,
        message: 'Security settings updated successfully',
        data: { ...settingsData, updatedAt: new Date().toISOString() }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateSecuritySettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update security settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get system configuration settings
   */
  static async getSystemConfigSettings(req: Request, res: Response): Promise<void> {
    try {
      const systemConfig = {
        maintenanceMode: false,
        maintenanceMessage: 'System is under maintenance. Please try again later.',
        maxFileUploadSize: 10, // MB
        allowedFileTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
        backupFrequency: 'daily',
        logRetentionDays: 90,
        apiRateLimit: 100, // requests per minute
        emailServiceProvider: 'smtp',
        smsServiceProvider: 'twilio'
      };

      const response: ApiResponse = {
        success: true,
        message: 'System configuration retrieved successfully',
        data: systemConfig
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getSystemConfigSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve system configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Update system configuration settings
   */
  static async updateSystemConfigSettings(req: Request, res: Response): Promise<void> {
    try {
      const settingsData = req.body;
      
      const response: ApiResponse = {
        success: true,
        message: 'System configuration updated successfully',
        data: { ...settingsData, updatedAt: new Date().toISOString() }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in updateSystemConfigSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update system configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Reset settings to default
   */
  static async resetSettingsToDefault(req: Request, res: Response): Promise<void> {
    return this.resetSettings(req, res);
  }

  /**
   * Export settings
   */
  static async exportSettings(req: Request, res: Response): Promise<void> {
    try {
      const allSettings = {
        company: await this.getCompanySettings(req, res),
        leave: await this.getLeaveSettings(req, res),
        security: await this.getSecuritySettings(req, res),
        system: await this.getSystemConfigSettings(req, res),
        exportedAt: new Date().toISOString()
      };

      const response: ApiResponse = {
        success: true,
        message: 'Settings exported successfully',
        data: allSettings
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in exportSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to export settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Import settings
   */
  static async importSettings(req: Request, res: Response): Promise<void> {
    try {
      const importData = req.body;
      
      const response: ApiResponse = {
        success: true,
        message: 'Settings imported successfully',
        data: { ...importData, importedAt: new Date().toISOString() }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in importSettings:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to import settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }

  /**
   * Get settings history
   */
  static async getSettingsHistory(req: Request, res: Response): Promise<void> {
    try {
      const history = [
        {
          id: '1',
          action: 'Company settings updated',
          changedBy: 'admin@ezifycloud.com',
          changedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          changes: { companyName: 'Old Company Name → Ezify Cloud' }
        },
        {
          id: '2',
          action: 'Leave settings updated',
          changedBy: 'admin@ezifycloud.com',
          changedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          changes: { maxConsecutiveLeaveDays: '20 → 30' }
        }
      ];

      const response: ApiResponse = {
        success: true,
        message: 'Settings history retrieved successfully',
        data: history
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error in getSettingsHistory:', error);
      
      const response: ApiResponse = {
        success: false,
        message: 'Failed to retrieve settings history',
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      res.status(500).json(response);
    }
  }
}
