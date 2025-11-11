import { Router } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import { PersonalizationController } from '../controllers/personalizationController';

const router = Router();

router.use(authenticateToken);

// Favorites
router.post('/favorites', PersonalizationController.addFavorite);
router.delete('/favorites/:boardId', PersonalizationController.removeFavorite);
router.get('/favorites', PersonalizationController.getFavorites);
router.put('/favorites/reorder', PersonalizationController.reorderFavorites);

// Recent boards
router.post('/recent', PersonalizationController.trackAccess);
router.get('/recent', PersonalizationController.getRecentBoards);

// Custom views
router.post('/views', PersonalizationController.createCustomView);
router.get('/views/board/:boardId', PersonalizationController.getCustomViews);
router.put('/views/:viewId', PersonalizationController.updateCustomView);
router.delete('/views/:viewId', PersonalizationController.deleteCustomView);

// Preferences
router.get('/preferences', PersonalizationController.getPreferences);
router.put('/preferences', PersonalizationController.updatePreferences);

export default router;

