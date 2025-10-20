import { EmployeeProfile, NotificationPreferences, CalendarPreferences, PerformanceGoal, Achievement } from '../types';
export declare class ProfileService {
    static getProfile(employeeId: string): Promise<EmployeeProfile>;
    static updateProfile(employeeId: string, updateData: {
        name?: string;
        phone?: string;
        bio?: string;
        address?: string;
        emergencyContact?: string;
    }): Promise<EmployeeProfile>;
    static updateAvatar(employeeId: string, avatarUrl: string): Promise<EmployeeProfile>;
    static updatePassword(employeeId: string, currentPassword: string, newPassword: string): Promise<boolean>;
    private static getUserPreferences;
    static updateNotificationPreferences(employeeId: string, preferences: NotificationPreferences): Promise<NotificationPreferences>;
    static updateCalendarPreferences(employeeId: string, preferences: CalendarPreferences): Promise<CalendarPreferences>;
    static getSecuritySettings(employeeId: string): Promise<any>;
    static updateSecuritySettings(employeeId: string, settings: {
        twoFactorEnabled?: boolean;
        loginNotificationsEnabled?: boolean;
        passwordChangeRequired?: boolean;
        sessionTimeoutMinutes?: number;
    }): Promise<void>;
    static updateAppPreferences(employeeId: string, preferences: {
        theme?: string;
        language?: string;
        dateFormat?: string;
        timeFormat?: string;
        weekStartsOn?: string;
    }): Promise<void>;
    static updatePrivacySettings(employeeId: string, settings: {
        showProfileToTeam?: boolean;
        showLeaveHistory?: boolean;
        showContactInfo?: boolean;
        allowDirectMessages?: boolean;
    }): Promise<void>;
    static exportUserData(employeeId: string): Promise<any>;
    static deleteUserAccount(employeeId: string): Promise<void>;
    static getPerformanceGoals(employeeId: string): Promise<PerformanceGoal[]>;
    static getAchievements(employeeId: string): Promise<Achievement[]>;
}
//# sourceMappingURL=profileService.d.ts.map