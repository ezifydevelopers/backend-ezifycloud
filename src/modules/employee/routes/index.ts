import { Router } from 'express';
import { authenticateToken, requireRole } from '../../../middleware/auth';
import { EmployeeDashboardController } from '../controllers/dashboardController';
import { LeaveRequestController } from '../controllers/leaveRequestController';
import { ProfileController } from '../controllers/profileController';
import { employeeSchemas } from '../schemas';
import { validateRequest } from '../../../utils/validation';

const router = Router();

// All employee routes require authentication and employee role
router.use(authenticateToken);
router.use(requireRole(['employee']));

// Employee Dashboard Routes
router.get('/dashboard/stats', 
  validateRequest(employeeSchemas.employeeDashboardStats),
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
  validateRequest(employeeSchemas.leaveRequestFilters),
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
  validateRequest(employeeSchemas.leaveHistoryFilters),
  LeaveRequestController.getLeaveHistory
);

router.get('/leave-history/summary', 
  LeaveRequestController.getLeaveHistorySummary
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

// Performance Routes
router.get('/performance/goals', 
  ProfileController.getPerformanceGoals
);

router.get('/performance/achievements', 
  ProfileController.getAchievements
);

export default router;
