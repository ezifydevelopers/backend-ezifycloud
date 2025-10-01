import { Router } from 'express';
import loginRoutes from '../modules/login/routes';

const router = Router();

// Mount login module routes
router.use('/', loginRoutes);

export default router;
