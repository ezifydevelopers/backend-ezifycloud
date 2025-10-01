import { Router } from 'express';
import { authenticateToken, requireRole } from '../../../middleware/auth';
import { DashboardController } from '../controllers/dashboardController';
import { EmployeeController } from '../controllers/employeeController';
import { LeaveRequestController } from '../controllers/leaveRequestController';
import { adminSchemas } from '../schemas';
import { validateRequest } from '../../../utils/validation';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireRole(['admin']));

// Dashboard Routes
router.get('/dashboard/stats', 
  validateRequest(adminSchemas.dashboardStats),
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
  validateRequest(adminSchemas.idParam),
  EmployeeController.getEmployeeById
);

router.post('/employees', 
  validateRequest(adminSchemas.createEmployee),
  EmployeeController.createEmployee
);

router.put('/employees/:id', 
  validateRequest(adminSchemas.idParam),
  validateRequest(adminSchemas.updateEmployee),
  EmployeeController.updateEmployee
);

router.delete('/employees/:id', 
  validateRequest(adminSchemas.idParam),
  EmployeeController.deleteEmployee
);

router.patch('/employees/:id/toggle-status', 
  validateRequest(adminSchemas.idParam),
  validateRequest(adminSchemas.toggleEmployeeStatus),
  EmployeeController.toggleEmployeeStatus
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

// Leave Request Management Routes
router.get('/leave-requests', 
  validateRequest(adminSchemas.leaveRequestFilters),
  LeaveRequestController.getLeaveRequests
);

router.get('/leave-requests/:id', 
  validateRequest(adminSchemas.idParam),
  LeaveRequestController.getLeaveRequestById
);

router.patch('/leave-requests/:id/status', 
  validateRequest(adminSchemas.idParam),
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

export default router;
