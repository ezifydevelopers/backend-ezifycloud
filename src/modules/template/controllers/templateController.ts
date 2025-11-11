import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import * as TemplateService from '../services/templateService';

export class TemplateController {
  static async save(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { boardId } = req.params;
      const template = await TemplateService.saveBoardAsTemplate(boardId, userId, req.body);
      return res.status(201).json({ success: true, data: template });
    } catch (error) {
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to save template' });
    }
  }

  static async list(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { workspaceId } = req.query as { workspaceId?: string };
      const templates = await TemplateService.listTemplates(workspaceId);
      return res.json({ success: true, data: templates });
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Failed to list templates' });
    }
  }

  static async createFromTemplate(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
      const { templateId } = req.params;
      const { workspaceId, overrides } = req.body as { workspaceId: string; overrides?: { name?: string; color?: string; icon?: string } };
      const board = await TemplateService.createBoardFromTemplate(templateId, userId, workspaceId, overrides);
      return res.status(201).json({ success: true, data: board });
    } catch (error) {
      return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Failed to create from template' });
    }
  }
}


