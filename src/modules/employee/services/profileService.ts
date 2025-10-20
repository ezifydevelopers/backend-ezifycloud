import { PrismaClient } from '@prisma/client';
import { 
  EmployeeProfile, 
  Address, 
  EmergencyContact, 
  UserPreferences, 
  NotificationPreferences,
  CalendarPreferences,
  PrivacySettings,
  SecuritySettings,
  LoginHistory,
  ActiveSession,
  SecurityQuestion,
  PerformanceGoal,
  Achievement
} from '../types';

const prisma = new PrismaClient();

export class ProfileService {
  /**
   * Get employee profile
   */
  static async getProfile(employeeId: string): Promise<EmployeeProfile> {
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

      // Get user preferences
      const preferences = await this.getUserPreferences(employeeId);

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: (employee as any).phone || undefined,
        department: employee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        managerId: employee.managerId || undefined,
        managerName: employee.manager?.name,
        joinDate: employee.createdAt,
        avatar: employee.profilePicture || undefined,
        bio: (employee as any).bio || undefined,
        address: (employee as any).address || undefined,
        emergencyContact: (employee as any).emergencyContact || undefined,
        preferences,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt
      };
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw new Error('Failed to fetch profile');
    }
  }

  /**
   * Update employee profile
   */
  static async updateProfile(employeeId: string, updateData: {
    name?: string;
    phone?: string;
    bio?: string;
    address?: string;
    emergencyContact?: string;
  }): Promise<EmployeeProfile> {
    try {
      // Check if employee exists
      const existingEmployee = await prisma.user.findUnique({
        where: { id: employeeId }
      });

      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      // Update employee data - update all profile fields
      const updateFields: any = {};
      
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

      // Get updated preferences
      const preferences = await this.getUserPreferences(employeeId);

      return {
        id: updatedEmployee.id,
        name: updatedEmployee.name,
        email: updatedEmployee.email,
        phone: (updatedEmployee as any).phone || undefined,
        department: updatedEmployee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        managerId: updatedEmployee.managerId || undefined,
        managerName: (updatedEmployee as any).manager?.name,
        joinDate: updatedEmployee.createdAt,
        avatar: updatedEmployee.profilePicture || undefined,
        bio: (updatedEmployee as any).bio || undefined,
        address: (updatedEmployee as any).address || undefined,
        emergencyContact: (updatedEmployee as any).emergencyContact || undefined,
        preferences,
        isActive: updatedEmployee.isActive,
        createdAt: updatedEmployee.createdAt,
        updatedAt: updatedEmployee.updatedAt
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Update avatar
   */
  static async updateAvatar(employeeId: string, avatarUrl: string): Promise<EmployeeProfile> {
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
        phone: (updatedEmployee as any).phone || undefined,
        department: updatedEmployee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        managerId: updatedEmployee.managerId || undefined,
        managerName: updatedEmployee.manager?.name,
        joinDate: updatedEmployee.createdAt,
        avatar: updatedEmployee.profilePicture || undefined,
        bio: (updatedEmployee as any).bio || undefined,
        address: (updatedEmployee as any).address || undefined,
        emergencyContact: (updatedEmployee as any).emergencyContact || undefined,
        preferences,
        isActive: updatedEmployee.isActive,
        createdAt: updatedEmployee.createdAt,
        updatedAt: updatedEmployee.updatedAt
      };
    } catch (error) {
      console.error('Error updating avatar:', error);
      throw new Error('Failed to update avatar');
    }
  }

  /**
   * Update password
   */
  static async updatePassword(employeeId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // In a real implementation, you would:
      // 1. Verify current password
      // 2. Hash new password
      // 3. Update password in database
      
      // For now, we'll just return success
      // This would typically involve bcrypt comparison and hashing
      console.log(`Password update requested for employee ${employeeId}`);
      
      return true;
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error('Failed to update password');
    }
  }

  /**
   * Get user preferences
   */
  private static async getUserPreferences(employeeId: string): Promise<UserPreferences> {
    try {
      // Get user data to fetch notification preferences
      const user = await prisma.user.findUnique({
        where: { id: employeeId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get preferences from database or return defaults
      const preferences: UserPreferences = {
        timezone: 'UTC',
        language: (user as any).language ?? 'en',
        dateFormat: (user as any).dateFormat ?? 'MM/DD/YYYY',
        timeFormat: (user as any).timeFormat ?? '12h',
        theme: (user as any).theme ?? 'system',
        weekStartsOn: (user as any).weekStartsOn ?? 'monday',
        notifications: {
          emailNotifications: (user as any).emailNotifications ?? true,
          pushNotifications: (user as any).pushNotifications ?? true,
          leaveRequestAlerts: (user as any).leaveRequestAlerts ?? true,
          approvalNotifications: (user as any).approvalNotifications ?? true,
          reminderNotifications: (user as any).reminderNotifications ?? true,
          systemUpdates: (user as any).systemUpdates ?? false
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
          showLeaveDetails: (user as any).showLeaveHistory ?? true,
          showContactInfo: (user as any).showContactInfo ?? false,
          showPerformance: false,
          allowDirectMessages: (user as any).allowDirectMessages ?? true
        }
      };

      return preferences;
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw new Error('Failed to fetch user preferences');
    }
  }

  /**
   * Update notification preferences
   */
  static async updateNotificationPreferences(
    employeeId: string, 
    preferences: NotificationPreferences
  ): Promise<NotificationPreferences> {
    try {
      // Note: User model doesn't have notification preference fields
      // In a real implementation, you would store these in a separate UserPreferences table
      // For now, we'll just return the preferences without updating the database
      
      return preferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  /**
   * Update calendar preferences
   */
  static async updateCalendarPreferences(
    employeeId: string, 
    preferences: CalendarPreferences
  ): Promise<CalendarPreferences> {
    try {
      // In a real implementation, this would update a preferences table
      console.log(`Calendar preferences updated for employee ${employeeId}`);
      
      return preferences;
    } catch (error) {
      console.error('Error updating calendar preferences:', error);
      throw new Error('Failed to update calendar preferences');
    }
  }

  /**
   * Get security settings
   */
  static async getSecuritySettings(employeeId: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: employeeId }
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        twoFactorEnabled: (user as any).twoFactorEnabled ?? false,
        loginNotificationsEnabled: (user as any).loginNotificationsEnabled ?? true,
        passwordChangeRequired: (user as any).passwordChangeRequired ?? false,
        sessionTimeoutMinutes: (user as any).sessionTimeoutMinutes ?? 30,
        passwordLastChanged: new Date(), // This would come from a separate table in a real implementation
        loginHistory: [], // This would come from a separate table in a real implementation
        activeSessions: [], // This would come from a separate table in a real implementation
        securityQuestions: [] // This would come from a separate table in a real implementation
      };
    } catch (error) {
      console.error('Error fetching security settings:', error);
      throw new Error('Failed to fetch security settings');
    }
  }

  /**
   * Update security settings
   */
  static async updateSecuritySettings(
    employeeId: string,
    settings: {
      twoFactorEnabled?: boolean;
      loginNotificationsEnabled?: boolean;
      passwordChangeRequired?: boolean;
      sessionTimeoutMinutes?: number;
    }
  ): Promise<void> {
    try {
      // Note: User model doesn't have security settings fields
      // In a real implementation, you would store these in a separate UserSecuritySettings table
      // For now, we'll just return the settings without updating the database
    } catch (error) {
      console.error('Error updating security settings:', error);
      throw new Error('Failed to update security settings');
    }
  }

  /**
   * Update app preferences
   */
  static async updateAppPreferences(
    employeeId: string,
    preferences: {
      theme?: string;
      language?: string;
      dateFormat?: string;
      timeFormat?: string;
      weekStartsOn?: string;
    }
  ): Promise<void> {
    try {
      // Note: User model doesn't have UI preference fields
      // In a real implementation, you would store these in a separate UserUIPreferences table
      // For now, we'll just return the preferences without updating the database
    } catch (error) {
      console.error('Error updating app preferences:', error);
      throw new Error('Failed to update app preferences');
    }
  }

  /**
   * Update privacy settings
   */
  static async updatePrivacySettings(
    employeeId: string,
    settings: {
      showProfileToTeam?: boolean;
      showLeaveHistory?: boolean;
      showContactInfo?: boolean;
      allowDirectMessages?: boolean;
    }
  ): Promise<void> {
    try {
      // Note: User model doesn't have privacy settings fields
      // In a real implementation, you would store these in a separate UserPrivacySettings table
      // For now, we'll just return the settings without updating the database
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw new Error('Failed to update privacy settings');
    }
  }

  /**
   * Export user data
   */
  static async exportUserData(employeeId: string): Promise<any> {
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

      // Remove sensitive data
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
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  }

  /**
   * Delete user account
   */
  static async deleteUserAccount(employeeId: string): Promise<void> {
    try {
      // In a real implementation, you might want to soft delete or anonymize data
      // For now, we'll just mark as inactive
      await prisma.user.update({
        where: { id: employeeId },
        data: {
          isActive: false,
          email: `deleted_${Date.now()}@example.com`, // Anonymize email
          name: 'Deleted User'
        }
      });
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw new Error('Failed to delete user account');
    }
  }

  /**
   * Get performance goals
   */
  static async getPerformanceGoals(employeeId: string): Promise<PerformanceGoal[]> {
    try {
      // Get performance goals from database or return mock data
      const goals: PerformanceGoal[] = [
        {
          id: '1',
          title: 'Complete Q4 Project',
          description: 'Finish the major project by end of quarter',
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          progress: 75,
          status: 'in_progress',
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        },
        {
          id: '2',
          title: 'Improve Team Collaboration',
          description: 'Enhance communication and teamwork skills',
          targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
          progress: 40,
          status: 'in_progress',
          createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) // 14 days ago
        },
        {
          id: '3',
          title: 'Learn New Technology',
          description: 'Master the new framework introduced this quarter',
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          progress: 20,
          status: 'not_started',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        }
      ];

      return goals;
    } catch (error) {
      console.error('Error fetching performance goals:', error);
      return [];
    }
  }

  /**
   * Get achievements
   */
  static async getAchievements(employeeId: string): Promise<Achievement[]> {
    try {
      // Get achievements from database or return mock data
      const achievements: Achievement[] = [
        {
          id: '1',
          title: 'Employee of the Month',
          description: 'Recognized for outstanding performance and dedication',
          type: 'award',
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          issuer: 'HR Department'
        },
        {
          id: '2',
          title: 'Project Completion Certificate',
          description: 'Successfully completed the major project ahead of schedule',
          type: 'certification',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          issuer: 'Project Manager'
        },
        {
          id: '3',
          title: 'Team Player Recognition',
          description: 'Acknowledged for excellent teamwork and collaboration',
          type: 'recognition',
          date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
          issuer: 'Team Lead'
        }
      ];

      return achievements;
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return [];
    }
  }
}