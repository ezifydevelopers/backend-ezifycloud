// Currency routes

import { Router } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../../../middleware/auth';
import { CurrencyController } from '../controllers/currencyController';
import { validateQuery } from '../../../utils/validation';

const router = Router();

// All currency routes require authentication
router.use(authenticateToken);

// Get exchange rate
router.get(
  '/exchange-rate',
  validateQuery(Joi.object({
    from: Joi.string().required(),
    to: Joi.string().required(),
  })),
  CurrencyController.getExchangeRate
);

export default router;

