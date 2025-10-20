import { Router } from 'express';
import { authenticateToken, requireRole } from '../../../middleware/auth';
import { EmployeeDashboardController } from '../controllers/dashboardController';
import { LeaveRequestController } from '../controllers/leaveRequestController';
import { ProfileController } from '../controllers/profileController';
import { CalendarController } from '../controllers/calendarController';
import { LeavePolicyController } from '../controllers/leavePolicyController';
import { HolidayController } from '../controllers/holidayController';
import { employeeSchemas } from '../schemas';
import { validateRequest, validateQuery } from '../../../utils/validation';

const router = Router();

// All employee routes require authentication and employee role
router.use(authenticateToken);
router.use(requireRole(['employee']));

// Employee Dashboard Routes
router.get('/dashboard/stats', 
  EmployeeDashboardController.getDashboardStats
);

router.get('/dashboard/personal-info', 
  EmployeeDashboardController.getPersonalInfo
);

router.get('/dashboard/leave-balance', 
  EmployeeDashboardController.getLeaveBalance
);

router.get('/dashboard/recent-requests', 
  EmployeeDashboardController.getRecentLeaveRequests
);

router.get('/dashboard/upcoming-holidays', 
  EmployeeDashboardController.getUpcomingHolidays
);

router.get('/dashboard/team-info', 
  EmployeeDashboardController.getTeamInfo
);

router.get('/dashboard/performance', 
  EmployeeDashboardController.getPerformanceMetrics
);

router.get('/dashboard/notifications', 
  EmployeeDashboardController.getNotifications
);

router.get('/dashboard/quick-stats', 
  EmployeeDashboardController.getQuickStats
);

// Leave Request Management Routes
router.post('/leave-requests', 
  validateRequest(employeeSchemas.leaveRequestForm),
  LeaveRequestController.createLeaveRequest
);

router.get('/leave-requests', 
  LeaveRequestController.getLeaveRequests
);

router.get('/leave-requests/:id', 
  validateRequest(employeeSchemas.idParam),
  LeaveRequestController.getLeaveRequestById
);

router.put('/leave-requests/:id', 
  validateRequest(employeeSchemas.idParam),
  validateRequest(employeeSchemas.leaveRequestForm),
  LeaveRequestController.updateLeaveRequest
);

router.delete('/leave-requests/:id', 
  validateRequest(employeeSchemas.idParam),
  LeaveRequestController.cancelLeaveRequest
);

// Leave History Routes
router.get('/leave-history', 
  LeaveRequestController.getLeaveHistory
);

router.get('/leave-history/summary', 
  LeaveRequestController.getLeaveHistorySummary
);

// Calendar Routes
router.get('/calendar/events', 
  validateQuery(employeeSchemas.calendarFilters),
  CalendarController.getCalendarEvents
);

router.get('/calendar/current-month', 
  CalendarController.getCurrentMonthEvents
);

// Profile Management Routes
router.get('/profile', 
  ProfileController.getProfile
);

router.put('/profile', 
  validateRequest(employeeSchemas.updateProfile),
  ProfileController.updateProfile
);

router.put('/profile/avatar', 
  validateRequest(employeeSchemas.updateAvatar),
  ProfileController.updateAvatar
);

router.put('/profile/password', 
  validateRequest(employeeSchemas.updatePassword),
  ProfileController.updatePassword
);

// Settings Routes
router.get('/settings/notifications', 
  ProfileController.getNotificationPreferences
);

router.put('/settings/notifications', 
  validateRequest(employeeSchemas.notificationPreferences),
  ProfileController.updateNotificationPreferences
);

router.get('/settings/calendar', 
  ProfileController.getCalendarPreferences
);

router.put('/settings/calendar', 
  validateRequest(employeeSchemas.calendarPreferences),
  ProfileController.updateCalendarPreferences
);

router.get('/settings/privacy', 
  ProfileController.getPrivacySettings
);

router.put('/settings/privacy', 
  validateRequest(employeeSchemas.privacySettings),
  ProfileController.updatePrivacySettings
);

router.get('/settings/security', 
  ProfileController.getSecuritySettings
);

router.put('/settings/security', 
  ProfileController.updateSecuritySettings
);

router.get('/settings/app-preferences', 
  ProfileController.getAppPreferences
);

router.put('/settings/app-preferences', 
  ProfileController.updateAppPreferences
);

// Data Management Routes
router.get('/data/export', 
  ProfileController.exportUserData
);

router.delete('/account', 
  ProfileController.deleteUserAccount
);

// Performance Routes
router.get('/performance/goals', 
  ProfileController.getPerformanceGoals
);

router.get('/performance/achievements', 
  ProfileController.getAchievements
);

// Leave Policy Routes (Read-only access for employees)
router.get('/policies', 
  validateRequest(employeeSchemas.leavePolicyFilters),
  LeavePolicyController.getLeavePolicies
);

// Specific routes must come before dynamic :id route
router.get('/policies/stats', 
  LeavePolicyController.getLeavePolicyStats
);

router.get('/policies/types', 
  LeavePolicyController.getLeavePolicyTypes
);

router.get('/policies/:id', 
  validateRequest(employeeSchemas.idParam),
  LeavePolicyController.getLeavePolicyById
);

// Holiday Routes
router.get('/holidays/upcoming', 
  HolidayController.getUpcomingHolidays
);

router.get('/holidays/year', 
  HolidayController.getHolidaysByYear
);

router.get('/holidays/type', 
  HolidayController.getHolidaysByType
);

export default router;
