import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { PermissionController } from '../controllers/permissionController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get permissions for a resource
router.get('/', PermissionController.getPermissions);

// Check specific permission
router.get('/check', PermissionController.checkPermission);

// Update board permissions
router.put('/board/:boardId', PermissionController.updateBoardPermissions);

// Update column permissions
router.put('/column/:columnId', PermissionController.updateColumnPermissions);

// Assign workspace role
router.post('/workspace/:workspaceId/role', PermissionController.assignWorkspaceRole);

// Assign board role
router.post('/board/:boardId/role', PermissionController.assignBoardRole);

// Assign board permissions to user
router.post('/board/:boardId/user/:targetUserId', PermissionController.assignBoardPermissionsToUser);

// Assign board permissions to role
router.post('/board/:boardId/role/:role', PermissionController.assignBoardPermissionsToRole);

// Assign column role
router.post('/column/:columnId/role', PermissionController.assignColumnRole);

// Assign cell permissions
router.post('/column/:columnId/cell-permissions', PermissionController.assignCellPermissions);

// Get effective permissions (with inheritance)
router.get('/effective', PermissionController.getEffectivePermissions);

// Access Control routes
import { AccessControlController } from '../controllers/accessControlController';

// Row-level security
router.get('/board/:boardId/items/filtered', AccessControlController.getFilteredItems);
router.get('/board/:boardId/items/assigned', AccessControlController.getAssignedItems);

// Column visibility
router.get('/board/:boardId/columns/visible', AccessControlController.getVisibleColumns);
router.get('/column/:columnId/visibility', AccessControlController.canViewColumn);

export default router;

