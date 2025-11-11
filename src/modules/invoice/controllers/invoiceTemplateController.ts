// Invoice template controller

import { Request, Response } from 'express';
import { ApiResponse } from '@/types';
import { InvoiceTemplateService } from '../services/invoiceTemplateService';

export class InvoiceTemplateController {
  /**
   * Get all templates
   */
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { workspaceId } = req.query;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const templates = await InvoiceTemplateService.getTemplates(
        workspaceId as string | undefined,
        userId
      );

      const response: ApiResponse = {
        success: true,
        message: 'Templates retrieved successfully',
        data: templates,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching templates:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch templates',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Get template by ID
   */
  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const template = await InvoiceTemplateService.getTemplateById(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Template retrieved successfully',
        data: template,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching template:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to fetch template',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(404).json(response);
    }
  }

  /**
   * Create template
   */
  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const template = await InvoiceTemplateService.createTemplate(userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Template created successfully',
        data: template,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating template:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to create template',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Update template
   */
  static async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const template = await InvoiceTemplateService.updateTemplate(id, userId, req.body);

      const response: ApiResponse = {
        success: true,
        message: 'Template updated successfully',
        data: template,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating template:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to update template',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      await InvoiceTemplateService.deleteTemplate(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Template deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting template:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to delete template',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }

  /**
   * Set default template
   */
  static async setDefaultTemplate(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { id } = req.params;

      if (!userId) {
        const response: ApiResponse = {
          success: false,
          message: 'User not authenticated',
          error: 'Missing user information',
        };
        res.status(401).json(response);
        return;
      }

      const template = await InvoiceTemplateService.setDefaultTemplate(id, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Template set as default successfully',
        data: template,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error setting default template:', error);
      const response: ApiResponse = {
        success: false,
        message: 'Failed to set default template',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      res.status(400).json(response);
    }
  }
}

