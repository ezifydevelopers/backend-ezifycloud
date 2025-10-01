import { Router } from 'express';
import { authenticateToken, requireRole } from '../../../middleware/auth';
import { ManagerDashboardController } from '../controllers/dashboardController';
import { TeamController } from '../controllers/teamController';
import { ApprovalController } from '../controllers/approvalController';
import { managerSchemas } from '../schemas';
import { validateRequest } from '../../../utils/validation';

const router = Router();

// All manager routes require authentication and manager role
router.use(authenticateToken);
router.use(requireRole(['manager']));

// Manager Dashboard Routes
router.get('/dashboard/stats', 
  validateRequest(managerSchemas.managerDashboardStats),
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
  validateRequest(managerSchemas.idParam),
  TeamController.getTeamMemberById
);

router.put('/team/members/:id', 
  validateRequest(managerSchemas.idParam),
  validateRequest(managerSchemas.updateTeamMember),
  TeamController.updateTeamMember
);

router.patch('/team/members/:id/toggle-status', 
  validateRequest(managerSchemas.idParam),
  validateRequest(managerSchemas.toggleTeamMemberStatus),
  TeamController.toggleTeamMemberStatus
);

router.get('/team/stats', 
  TeamController.getTeamStats
);

router.get('/team/departments', 
  TeamController.getTeamDepartments
);

router.get('/team/members/:id/performance', 
  validateRequest(managerSchemas.idParam),
  TeamController.getTeamMemberPerformance
);

router.get('/team/members/:id/recent-leaves', 
  validateRequest(managerSchemas.idParam),
  TeamController.getTeamMemberRecentLeaves
);

// Leave Approval Routes
router.get('/approvals', 
  validateRequest(managerSchemas.approvalFilters),
  ApprovalController.getLeaveApprovals
);

router.get('/approvals/:id', 
  validateRequest(managerSchemas.idParam),
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

export default router;
