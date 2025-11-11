// Invoice template routes

import { Router } from 'express';
import Joi from 'joi';
import { authenticateToken } from '../../../middleware/auth';
import { InvoiceTemplateController } from '../controllers/invoiceTemplateController';
import { validateParams, validateQuery } from '../../../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all templates
router.get(
  '/',
  validateQuery(Joi.object({
    workspaceId: Joi.string().uuid().optional(),
  })),
  InvoiceTemplateController.getTemplates
);

// Get template by ID
router.get(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  InvoiceTemplateController.getTemplate
);

// Create template
router.post(
  '/',
  InvoiceTemplateController.createTemplate
);

// Update template
router.put(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  InvoiceTemplateController.updateTemplate
);

// Delete template
router.delete(
  '/:id',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  InvoiceTemplateController.deleteTemplate
);

// Set default template
router.post(
  '/:id/set-default',
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  InvoiceTemplateController.setDefaultTemplate
);

export default router;

