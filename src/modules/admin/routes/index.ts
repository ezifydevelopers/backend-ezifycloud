import { Router } from 'express';
import { authenticateToken, requireRole } from '../../../middleware/auth';
import { DashboardController } from '../controllers/dashboardController';
import { EmployeeController } from '../controllers/employeeController';
import { LeaveRequestController } from '../controllers/leaveRequestController';
import { LeavePolicyController } from '../controllers/leavePolicyController';
// import { ReportsController } from '../controllers/reportsController';
// import { AuditLogController } from '../controllers/auditLogController';
import { SettingsController } from '../controllers/settingsController';
import { HolidayController } from '../controllers/holidayController';
import { AttendanceController } from '../controllers/attendanceController';
import { SalaryController } from '../controllers/salaryController';
import { adminSchemas } from '../schemas';
import { validateRequest, validateParams, validateQuery } from '../../../utils/validation';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Dashboard Routes
router.get('/dashboard/stats', 
  validateQuery(adminSchemas.dashboardStats),
  DashboardController.getDashboardStats
);

router.get('/dashboard/quick-stats', 
  DashboardController.getQuickStats
);

router.get('/dashboard/department-stats', 
  validateRequest(adminSchemas.dateRange),
  DashboardController.getDepartmentStats
);

router.get('/dashboard/recent-activities', 
  DashboardController.getRecentActivities
);

router.get('/dashboard/monthly-trend', 
  validateRequest(adminSchemas.dateRange),
  DashboardController.getMonthlyLeaveTrend
);

router.get('/dashboard/overview', 
  DashboardController.getSystemOverview
);

// Employee Management Routes
router.get('/employees', 
  validateRequest(adminSchemas.employeeFilters),
  EmployeeController.getEmployees
);

router.get('/employees/:id', 
  validateParams(adminSchemas.idParam),
  EmployeeController.getEmployeeById
);

router.post('/employees', 
  validateRequest(adminSchemas.createEmployee),
  EmployeeController.createEmployee
);

router.put('/employees/:id', 
  validateParams(adminSchemas.idParam),
  validateRequest(adminSchemas.updateEmployee),
  EmployeeController.updateEmployee
);

router.delete('/employees/:id', 
  validateParams(adminSchemas.idParam),
  EmployeeController.deleteEmployee
);

router.patch('/employees/:id/toggle-status', 
  validateParams(adminSchemas.idParam),
  validateRequest(adminSchemas.toggleEmployeeStatus),
  EmployeeController.toggleEmployeeStatus
);

router.patch('/employees/bulk-update-status', 
  validateRequest(adminSchemas.bulkUpdateEmployeeStatus),
  EmployeeController.bulkUpdateEmployeeStatus
);

router.delete('/employees/bulk-delete', 
  validateRequest(adminSchemas.bulkDeleteEmployees),
  EmployeeController.bulkDeleteEmployees
);

router.patch('/employees/bulk-update-department', 
  validateRequest(adminSchemas.bulkUpdateEmployeeDepartment),
  EmployeeController.bulkUpdateEmployeeDepartment
);

// Employee Leave Balance Route
router.get('/employees/:id/leave-balance', 
  validateParams(adminSchemas.idParam),
  EmployeeController.getEmployeeLeaveBalance
);

router.get('/employees/departments', 
  EmployeeController.getDepartments
);

router.get('/employees/managers', 
  EmployeeController.getManagers
);

router.get('/employees/stats', 
  EmployeeController.getEmployeeStats
);

router.get('/employees/export', 
  EmployeeController.exportEmployeesToCSV
);

// Leave Request Management Routes
router.get('/leave-requests', 
  validateRequest(adminSchemas.leaveRequestFilters),
  LeaveRequestController.getLeaveRequests
);

router.get('/leave-requests/:id', 
  validateParams(adminSchemas.idParam),
  LeaveRequestController.getLeaveRequestById
);

router.patch('/leave-requests/:id/status', 
  validateParams(adminSchemas.idParam),
  validateRequest(adminSchemas.updateLeaveRequestStatus),
  LeaveRequestController.updateLeaveRequestStatus
);

router.patch('/leave-requests/bulk-update', 
  validateRequest(adminSchemas.bulkUpdateLeaveRequests),
  LeaveRequestController.bulkUpdateLeaveRequests
);

router.get('/leave-requests/stats', 
  LeaveRequestController.getLeaveRequestStats
);

router.get('/leave-requests/types', 
  LeaveRequestController.getLeaveTypes
);

router.get('/leave-requests/recent', 
  LeaveRequestController.getRecentLeaveRequests
);

router.get('/leave-requests/pending-count', 
  LeaveRequestController.getPendingCount
);

// Leave Policy Management Routes
router.get('/policies', 
  validateRequest(adminSchemas.leavePolicyFilters),
  LeavePolicyController.getLeavePolicies
);

router.get('/policies/:id', 
  validateParams(adminSchemas.idParam),
  LeavePolicyController.getLeavePolicyById
);

router.post('/policies', 
  validateRequest(adminSchemas.createLeavePolicy),
  LeavePolicyController.createLeavePolicy
);

router.put('/policies/:id', 
  validateParams(adminSchemas.idParam),
  validateRequest(adminSchemas.updateLeavePolicy),
  LeavePolicyController.updateLeavePolicy
);

router.delete('/policies/:id', 
  validateParams(adminSchemas.idParam),
  LeavePolicyController.deleteLeavePolicy
);

router.patch('/policies/:id/toggle-status', 
  validateParams(adminSchemas.idParam),
  validateRequest(adminSchemas.toggleLeavePolicyStatus),
  LeavePolicyController.toggleLeavePolicyStatus
);

router.get('/policies/stats', 
  LeavePolicyController.getLeavePolicyStats
);

router.get('/policies/types', 
  LeavePolicyController.getLeavePolicyTypes
);

router.patch('/policies/bulk-update', 
  validateRequest(adminSchemas.bulkUpdateLeavePolicies),
  LeavePolicyController.bulkUpdateLeavePolicies
);

// Reports Routes - Hidden
// router.get('/reports', 
//   ReportsController.getReports
// );

// router.get('/reports/leave-trends', 
//   validateRequest(adminSchemas.reportFilters),
//   ReportsController.getLeaveTrends
// );

// router.get('/reports/department-stats', 
//   validateRequest(adminSchemas.reportFilters),
//   ReportsController.getDepartmentStats
// );

// router.get('/reports/leave-balance', 
//   ReportsController.getLeaveBalanceReport
// );

// router.get('/reports/employee-summary', 
//   ReportsController.getEmployeeLeaveSummary
// );

// router.get('/reports/utilization', 
//   validateRequest(adminSchemas.reportFilters),
//   ReportsController.getLeaveUtilizationReport
// );

// router.get('/reports/monthly', 
//   ReportsController.getMonthlyLeaveReport
// );

// router.get('/reports/export', 
//   ReportsController.exportReport
// );

// router.get('/reports/dashboard', 
//   ReportsController.getReportDashboard
// );

// router.get('/reports/types', 
//   ReportsController.getAvailableReportTypes
// );

// Audit Log Routes - Hidden
// router.get('/audit-logs', 
//   validateRequest(adminSchemas.auditLogFilters),
//   AuditLogController.getAuditLogs
// );

// router.get('/audit-logs/:id', 
//   validateRequest(adminSchemas.idParam),
//   AuditLogController.getAuditLogById
// );

// router.get('/audit-logs/stats', 
//   validateRequest(adminSchemas.auditLogStats),
//   AuditLogController.getAuditLogStats
// );

// router.get('/audit-logs/actions', 
//   AuditLogController.getAuditLogActions
// );

// router.get('/audit-logs/user-activity', 
//   validateRequest(adminSchemas.userActivitySummary),
//   AuditLogController.getUserActivitySummary
// );

// router.get('/audit-logs/system-activity', 
//   validateRequest(adminSchemas.systemActivitySummary),
//   AuditLogController.getSystemActivitySummary
// );

// router.get('/audit-logs/export', 
//   validateRequest(adminSchemas.exportAuditLogs),
//   AuditLogController.exportAuditLogs
// );

// router.get('/audit-logs/dashboard', 
//   AuditLogController.getAuditLogDashboard
// );

// router.post('/audit-logs', 
//   validateRequest(adminSchemas.createAuditLog),
//   AuditLogController.createAuditLog
// );

// Settings Routes
router.get('/settings', 
  SettingsController.getAllSettings
);

router.get('/settings/company', 
  SettingsController.getCompanySettings
);

router.put('/settings/company', 
  validateRequest(adminSchemas.companySettings),
  SettingsController.updateCompanySettings
);

router.get('/settings/leave', 
  SettingsController.getLeaveSettings
);

router.put('/settings/leave', 
  validateRequest(adminSchemas.leaveSettings),
  SettingsController.updateLeaveSettings
);

router.get('/settings/notification', 
  SettingsController.getNotificationSettings
);

router.put('/settings/notification', 
  validateRequest(adminSchemas.notificationSettings),
  SettingsController.updateNotificationSettings
);

router.get('/settings/security', 
  SettingsController.getSecuritySettings
);

router.put('/settings/security', 
  validateRequest(adminSchemas.securitySettings),
  SettingsController.updateSecuritySettings
);

router.get('/settings/system-config', 
  SettingsController.getSystemConfigSettings
);

router.put('/settings/system-config', 
  validateRequest(adminSchemas.systemConfigSettings),
  SettingsController.updateSystemConfigSettings
);

router.post('/settings/reset', 
  SettingsController.resetSettingsToDefault
);

router.get('/settings/export', 
  SettingsController.exportSettings
);

router.post('/settings/import', 
  SettingsController.importSettings
);

router.get('/settings/history', 
  SettingsController.getSettingsHistory
);

// Holiday Routes
router.get('/holidays', 
  validateQuery(adminSchemas.holidayQuery),
  HolidayController.getHolidays
);

router.get('/holidays/stats', 
  HolidayController.getHolidayStats
);

router.get('/holidays/:id', 
  validateParams(adminSchemas.idParam),
  HolidayController.getHolidayById
);

router.post('/holidays', 
  validateRequest(adminSchemas.createHoliday),
  HolidayController.createHoliday
);

router.put('/holidays/:id', 
  validateParams(adminSchemas.idParam),
  validateRequest(adminSchemas.updateHoliday),
  HolidayController.updateHoliday
);

router.delete('/holidays/:id', 
  validateParams(adminSchemas.idParam),
  HolidayController.deleteHoliday
);

router.patch('/holidays/:id/status', 
  validateParams(adminSchemas.idParam),
  validateRequest(adminSchemas.toggleHolidayStatus),
  HolidayController.toggleHolidayStatus
);

// Attendance Routes
router.get('/attendance', 
  AttendanceController.getAttendanceRecords
);

router.get('/attendance/stats', 
  AttendanceController.getAttendanceStats
);

router.get('/attendance/:id', 
  validateParams(adminSchemas.idParam),
  AttendanceController.getAttendanceRecordById
);

router.post('/attendance', 
  AttendanceController.createAttendanceRecord
);

router.put('/attendance/:id', 
  validateParams(adminSchemas.idParam),
  AttendanceController.updateAttendanceRecord
);

router.delete('/attendance/:id', 
  validateParams(adminSchemas.idParam),
  AttendanceController.deleteAttendanceRecord
);

router.get('/attendance/user/:userId', 
  AttendanceController.getUserAttendanceRecords
);

// Salary Management Routes
router.get('/salaries/employees', 
  SalaryController.getEmployeeSalaries
);

router.get('/salaries/monthly', 
  validateQuery(adminSchemas.salaryQuery),
  SalaryController.getMonthlySalaries
);

router.post('/salaries/generate', 
  validateRequest(adminSchemas.generateSalarySchema),
  SalaryController.generateMonthlySalaries
);

router.put('/salaries/:salaryId/approve', 
  validateRequest(adminSchemas.approveSalarySchema),
  SalaryController.approveMonthlySalary
);

router.get('/salaries/statistics', 
  validateQuery(adminSchemas.salaryQuery),
  SalaryController.getSalaryStatistics
);

router.get('/salaries/calculate/:userId', 
  validateQuery(adminSchemas.salaryQuery),
  SalaryController.calculateEmployeeSalary
);

router.post('/salaries/employees', 
  validateRequest(adminSchemas.createEmployeeSalarySchema),
  SalaryController.createEmployeeSalary
);

router.put('/salaries/employees/:salaryId', 
  validateRequest(adminSchemas.updateEmployeeSalarySchema),
  SalaryController.updateEmployeeSalary
);

export default router;
