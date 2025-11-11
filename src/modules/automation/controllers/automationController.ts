import { Request, Response } from 'express';
import { AutomationService } from '../services/automationService';
import { CreateAutomationInput, UpdateAutomationInput, AutomationQueryFilters } from '../types';
import { createAutomationSchema, updateAutomationSchema, automationFiltersSchema } from '../schemas';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export class AutomationController {
  /**
   * Create a new automation
   */
  static async createAutomation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { error, value } = createAutomationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message,
        });
        return;
      }

      const data = value as CreateAutomationInput;
      const automation = await AutomationService.createAutomation(userId, data);

      res.status(201).json({
        success: true,
        message: 'Automation created successfully',
        data: automation,
      });
    } catch (error) {
      console.error('Error creating automation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create automation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get automations
   */
  static async getAutomations(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = automationFiltersSchema.validate(req.query);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message,
        });
        return;
      }

      const filters = value as AutomationQueryFilters;
      const result = await AutomationService.getAutomations(filters);

      res.status(200).json({
        success: true,
        message: 'Automations retrieved successfully',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error('Error fetching automations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch automations',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get automation by ID
   */
  static async getAutomationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const automation = await AutomationService.getAutomationById(id);

      res.status(200).json({
        success: true,
        message: 'Automation retrieved successfully',
        data: automation,
      });
    } catch (error) {
      console.error('Error fetching automation:', error);
      const statusCode = error instanceof Error && error.message === 'Automation not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to fetch automation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update automation
   */
  static async updateAutomation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const { error, value } = updateAutomationSchema.validate(req.body);
      if (error) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          error: error.details[0].message,
        });
        return;
      }

      const data = value as UpdateAutomationInput;
      const automation = await AutomationService.updateAutomation(userId, id, data);

      res.status(200).json({
        success: true,
        message: 'Automation updated successfully',
        data: automation,
      });
    } catch (error) {
      console.error('Error updating automation:', error);
      const statusCode = error instanceof Error && error.message === 'Automation not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to update automation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete automation
   */
  static async deleteAutomation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      await AutomationService.deleteAutomation(userId, id);

      res.status(200).json({
        success: true,
        message: 'Automation deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting automation:', error);
      const statusCode = error instanceof Error && error.message === 'Automation not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to delete automation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Toggle automation active status
   */
  static async toggleAutomation(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isActive must be a boolean',
        });
        return;
      }

      const automation = await AutomationService.toggleAutomation(userId, id, isActive);

      res.status(200).json({
        success: true,
        message: `Automation ${isActive ? 'enabled' : 'disabled'} successfully`,
        data: automation,
      });
    } catch (error) {
      console.error('Error toggling automation:', error);
      const statusCode = error instanceof Error && error.message === 'Automation not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to toggle automation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Test automation (dry run)
   */
  static async testAutomation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { itemId } = req.body;

      if (!itemId) {
        res.status(400).json({
          success: false,
          message: 'itemId is required',
        });
        return;
      }

      // This would be a dry-run test - doesn't actually execute
      const automation = await AutomationService.getAutomationById(id);
      
      // Return what would happen without executing
      const actions = automation.actions as Array<{ type: string; config?: Record<string, unknown> }>;
      const preview = actions.map(action => ({
        type: action.type,
        description: `Would execute: ${action.type}`,
        config: action.config,
      }));

      res.status(200).json({
        success: true,
        message: 'Automation test preview',
        data: {
          automation: {
            name: automation.name,
            trigger: automation.trigger,
          },
          preview,
        },
      });
    } catch (error) {
      console.error('Error testing automation:', error);
      const statusCode = error instanceof Error && error.message === 'Automation not found' ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: 'Failed to test automation',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

