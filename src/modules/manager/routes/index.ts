import { Router } from 'express';
import { authenticateToken, requireRole } from '../../../middleware/auth';
import { ManagerDashboardController } from '../controllers/dashboardController';
import { TeamController } from '../controllers/teamController';
import { ApprovalController } from '../controllers/approvalController';
import { LeavePolicyController } from '../controllers/leavePolicyController';
import { LeaveRequestController } from '../controllers/leaveRequestController';
import { HolidayController } from '../controllers/holidayController';
import { SalaryController } from '../controllers/salaryController';
import { managerSchemas } from '../schemas';
import { validateRequest, validateQuery, validateParams } from '../../../utils/validation';

const router = Router();

// All manager routes require authentication and manager role
router.use(authenticateToken);
router.use(requireRole(['manager']));

// Manager Dashboard Routes
router.get('/dashboard/stats', 
  validateQuery(managerSchemas.managerDashboardStats),
  ManagerDashboardController.getDashboardStats
);

router.get('/dashboard/quick-stats', 
  ManagerDashboardController.getQuickStats
);

router.get('/dashboard/team-performance', 
  ManagerDashboardController.getTeamPerformance
);

router.get('/dashboard/upcoming-leaves', 
  ManagerDashboardController.getUpcomingLeaves
);

router.get('/dashboard/recent-activities', 
  ManagerDashboardController.getRecentActivities
);

router.get('/dashboard/team-leave-balance', 
  ManagerDashboardController.getTeamLeaveBalance
);

router.get('/dashboard/department-stats', 
  validateRequest(managerSchemas.dateRange),
  ManagerDashboardController.getDepartmentStats
);

// Team Management Routes
router.get('/team/members', 
  validateRequest(managerSchemas.teamFilters),
  TeamController.getTeamMembers
);

router.get('/team/members/:id', 
  validateParams(managerSchemas.idParam),
  TeamController.getTeamMemberById
);

router.post('/team/members', 
  validateRequest(managerSchemas.addTeamMember),
  TeamController.addTeamMember
);

router.put('/team/members/:id', 
  validateParams(managerSchemas.idParam),
  validateRequest(managerSchemas.updateTeamMember),
  TeamController.updateTeamMember
);

router.patch('/team/members/:id/toggle-status', 
  validateParams(managerSchemas.idParam),
  validateRequest(managerSchemas.toggleTeamMemberStatus),
  TeamController.toggleTeamMemberStatus
);

// Team Member Leave Balance Route
router.get('/team/members/:id/leave-balance', 
  validateParams(managerSchemas.idParam),
  TeamController.getTeamMemberLeaveBalance
);

router.get('/team/stats', 
  TeamController.getTeamStats
);

router.get('/team/departments', 
  TeamController.getTeamDepartments
);

router.get('/team/members/:id/performance', 
  validateParams(managerSchemas.idParam),
  TeamController.getTeamMemberPerformance
);

router.get('/team/members/:id/recent-leaves', 
  validateParams(managerSchemas.idParam),
  TeamController.getTeamMemberRecentLeaves
);

// Team Performance & Capacity Routes
router.get('/team/performance', 
  TeamController.getTeamPerformance
);

router.get('/team/capacity', 
  TeamController.getTeamCapacity
);

// Leave Approval Routes
router.get('/approvals', 
  validateQuery(managerSchemas.approvalFilters),
  ApprovalController.getLeaveApprovals
);

router.get('/approvals/:id', 
  validateParams(managerSchemas.idParam),
  ApprovalController.getLeaveApprovalById
);

router.post('/approvals/process', 
  validateRequest(managerSchemas.approvalAction),
  ApprovalController.processApprovalAction
);

router.post('/approvals/bulk-process', 
  validateRequest(managerSchemas.bulkApprovalAction),
  ApprovalController.processBulkApprovalAction
);

router.get('/approvals/stats', 
  ApprovalController.getApprovalStats
);

router.get('/approvals/pending-count', 
  ApprovalController.getPendingCount
);

router.get('/approvals/urgent', 
  ApprovalController.getUrgentApprovals
);

router.get('/approvals/history', 
  ApprovalController.getApprovalHistory
);

// Leave Policy Routes (Read-only access for managers)
router.get('/policies', 
  validateRequest(managerSchemas.leavePolicyFilters),
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
  validateParams(managerSchemas.idParam),
  LeavePolicyController.getLeavePolicyById
);

// Manager Profile Routes
router.get('/profile', 
  ManagerDashboardController.getProfile
);

router.put('/profile', 
  validateRequest(managerSchemas.updateProfile),
  ManagerDashboardController.updateProfile
);

// Manager Leave Request Routes
router.post('/leave-requests', 
  validateRequest(managerSchemas.leaveRequestForm),
  LeaveRequestController.createLeaveRequest
);

router.get('/leave-requests', 
  LeaveRequestController.getLeaveRequests
);

router.get('/leave-requests/:id', 
  validateParams(managerSchemas.idParam),
  LeaveRequestController.getLeaveRequestById
);

router.put('/leave-requests/:id', 
  validateParams(managerSchemas.idParam),
  validateRequest(managerSchemas.updateLeaveRequest),
  LeaveRequestController.updateLeaveRequest
);

router.delete('/leave-requests/:id', 
  validateParams(managerSchemas.idParam),
  LeaveRequestController.cancelLeaveRequest
);

router.get('/leave-history', 
  validateQuery(managerSchemas.leaveHistoryFilters),
  LeaveRequestController.getLeaveHistory
);

router.get('/leave-requests/recent', 
  LeaveRequestController.getRecentRequests
);

router.get('/leave-balance', 
  LeaveRequestController.getLeaveBalance
);

// Holiday Routes
router.get('/holidays/upcoming', 
  HolidayController.getUpcomingHolidays
);

router.get('/holidays/year', 
  HolidayController.getHolidaysByYear
);

// Salary Management Routes
router.get('/salaries/team', 
  SalaryController.getTeamSalaries
);

router.get('/salaries/monthly', 
  validateQuery(managerSchemas.salaryQuery),
  SalaryController.getTeamMonthlySalaries
);

router.post('/salaries/generate', 
  validateRequest(managerSchemas.generateSalarySchema),
  SalaryController.generateTeamMonthlySalaries
);

router.put('/salaries/:salaryId/approve', 
  validateRequest(managerSchemas.approveSalarySchema),
  SalaryController.approveTeamMonthlySalary
);

router.get('/salaries/statistics', 
  validateQuery(managerSchemas.salaryQuery),
  SalaryController.getTeamSalaryStatistics
);

router.get('/salaries/calculate/:userId', 
  validateQuery(managerSchemas.salaryQuery),
  SalaryController.calculateTeamMemberSalary
);

export default router;
