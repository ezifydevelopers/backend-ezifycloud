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

      // Get user preferences (mock data for now)
      const preferences = await this.getUserPreferences(employeeId);

      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        phone: undefined, // Not in schema
        department: employee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        managerId: employee.managerId || undefined,
        managerName: employee.manager?.name,
        joinDate: employee.createdAt,
        avatar: employee.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        address: undefined, // Not in schema
        emergencyContact: undefined, // Not in schema
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
    skills?: string[];
    address?: Address;
    emergencyContact?: EmergencyContact;
  }): Promise<EmployeeProfile> {
    try {
      // Check if employee exists
      const existingEmployee = await prisma.user.findUnique({
        where: { id: employeeId }
      });

      if (!existingEmployee) {
        throw new Error('Employee not found');
      }

      // Update employee data
      const updatedEmployee = await prisma.user.update({
        where: { id: employeeId },
        data: {
          name: updateData.name,
          // Note: phone, bio, skills, address, emergencyContact are not in the current schema
          // In a real implementation, these would be stored in separate tables or extended schema
        },
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
        phone: updateData.phone,
        department: updatedEmployee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        managerId: updatedEmployee.managerId || undefined,
        managerName: updatedEmployee.manager?.name,
        joinDate: updatedEmployee.createdAt,
        avatar: updatedEmployee.profilePicture || undefined,
        bio: updateData.bio,
        skills: updateData.skills || [],
        address: updateData.address,
        emergencyContact: updateData.emergencyContact,
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
        phone: undefined, // Not in schema
        department: updatedEmployee.department || 'Unassigned',
        position: 'Employee', // Not in schema
        managerId: updatedEmployee.managerId || undefined,
        managerName: updatedEmployee.manager?.name,
        joinDate: updatedEmployee.createdAt,
        avatar: updatedEmployee.profilePicture || undefined,
        bio: undefined, // Not in schema
        skills: [], // Not in schema
        address: undefined, // Not in schema
        emergencyContact: undefined, // Not in schema
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
      // Mock preferences data - in real implementation, this would come from a preferences table
      const preferences: UserPreferences = {
        timezone: 'UTC',
        language: 'en',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        notifications: {
          email: true,
          push: true,
          sms: false,
          leaveUpdates: true,
          holidayReminders: true,
          performanceReviews: true,
          teamUpdates: true,
          systemUpdates: true
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
          showLeaveDetails: true,
          showContactInfo: false,
          showPerformance: false,
          allowDirectMessages: true
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
      // In a real implementation, this would update a preferences table
      console.log(`Notification preferences updated for employee ${employeeId}`);
      
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
   * Update privacy settings
   */
  static async updatePrivacySettings(
    employeeId: string, 
    settings: PrivacySettings
  ): Promise<PrivacySettings> {
    try {
      // In a real implementation, this would update a preferences table
      console.log(`Privacy settings updated for employee ${employeeId}`);
      
      return settings;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw new Error('Failed to update privacy settings');
    }
  }

  /**
   * Get security settings
   */
  static async getSecuritySettings(employeeId: string): Promise<SecuritySettings> {
    try {
      // Mock security settings - in real implementation, this would come from security tables
      const securitySettings: SecuritySettings = {
        twoFactorEnabled: false,
        passwordLastChanged: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        loginHistory: await this.getLoginHistory(employeeId),
        activeSessions: await this.getActiveSessions(employeeId),
        securityQuestions: await this.getSecurityQuestions(employeeId)
      };

      return securitySettings;
    } catch (error) {
      console.error('Error fetching security settings:', error);
      throw new Error('Failed to fetch security settings');
    }
  }

  /**
   * Get login history
   */
  private static async getLoginHistory(employeeId: string): Promise<LoginHistory[]> {
    try {
      // Mock login history - in real implementation, this would come from a login_history table
      const loginHistory: LoginHistory[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          location: 'New York, NY',
          success: true
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          location: 'New York, NY',
          success: true
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          location: 'San Francisco, CA',
          success: false
        }
      ];

      return loginHistory;
    } catch (error) {
      console.error('Error fetching login history:', error);
      return [];
    }
  }

  /**
   * Get active sessions
   */
  private static async getActiveSessions(employeeId: string): Promise<ActiveSession[]> {
    try {
      // Mock active sessions - in real implementation, this would come from a sessions table
      const activeSessions: ActiveSession[] = [
        {
          id: '1',
          device: 'Windows PC',
          browser: 'Chrome 91.0',
          location: 'New York, NY',
          lastActive: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
          isCurrent: true
        },
        {
          id: '2',
          device: 'iPhone 12',
          browser: 'Safari 14.0',
          location: 'San Francisco, CA',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          isCurrent: false
        }
      ];

      return activeSessions;
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      return [];
    }
  }

  /**
   * Get security questions
   */
  private static async getSecurityQuestions(employeeId: string): Promise<SecurityQuestion[]> {
    try {
      // Mock security questions - in real implementation, this would come from a security_questions table
      const securityQuestions: SecurityQuestion[] = [
        {
          id: '1',
          question: 'What was the name of your first pet?',
          answer: '***', // Masked answer
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
        },
        {
          id: '2',
          question: 'What city were you born in?',
          answer: '***', // Masked answer
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
        }
      ];

      return securityQuestions;
    } catch (error) {
      console.error('Error fetching security questions:', error);
      return [];
    }
  }

  /**
   * Get performance goals
   */
  static async getPerformanceGoals(employeeId: string): Promise<PerformanceGoal[]> {
    try {
      // Mock performance goals - in real implementation, this would come from a goals table
      const goals: PerformanceGoal[] = [
        {
          id: '1',
          title: 'Complete Project Alpha',
          description: 'Finish the main project deliverables on time',
          targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          progress: 75,
          status: 'in_progress',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          updatedAt: new Date()
        },
        {
          id: '2',
          title: 'Improve Team Collaboration',
          description: 'Enhance communication and teamwork skills',
          targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
          progress: 40,
          status: 'in_progress',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          updatedAt: new Date()
        },
        {
          id: '3',
          title: 'Complete Training Course',
          description: 'Finish the advanced training program',
          targetDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          progress: 100,
          status: 'completed',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          updatedAt: new Date()
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
      // Mock achievements - in real implementation, this would come from an achievements table
      const achievements: Achievement[] = [
        {
          id: '1',
          title: 'Employee of the Month',
          description: 'Recognized for outstanding performance in December',
          type: 'award',
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
          issuer: 'HR Department',
          badge: 'https://example.com/badge-employee-month.png'
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
