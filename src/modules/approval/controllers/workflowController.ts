// Approval workflow controller

import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { ApprovalWorkflowService } from '../services/approvalWorkflowService';
import { ApprovalWorkflowConfig } from '../types/workflow';
import prisma from '../../../lib/prisma';

export class WorkflowController {
  /**
   * Get workflow configuration for a board
   */
  static async getWorkflow(req: AuthRequest, res: Response) {
    try {
      const { boardId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Check board access
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!board) {
        return res.status(404).json({ success: false, message: 'Board not found' });
      }

      // Check if user has access to the workspace
      if (board.workspace.members.length === 0) {
        // Check if user is a platform admin
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });
        if (user?.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'You do not have access to this board' });
        }
      }

      const workflow = await ApprovalWorkflowService.getWorkflowConfig(boardId);
      return res.json({ success: true, data: workflow });
    } catch (error) {
      console.error('Error fetching workflow:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch workflow configuration' });
    }
  }

  /**
   * Save workflow configuration
   */
  static async saveWorkflow(req: AuthRequest, res: Response) {
    try {
      const { boardId } = req.params;
      const userId = req.user?.id;
      const config: ApprovalWorkflowConfig = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      // Check board access and permissions
      const board = await prisma.board.findUnique({
        where: { id: boardId },
        include: {
          workspace: {
            include: {
              members: {
                where: { userId },
              },
            },
          },
        },
      });

      if (!board) {
        return res.status(404).json({ success: false, message: 'Board not found' });
      }

      // Check if user has access to the workspace
      let userRole: string | null = null;
      if (board.workspace.members.length === 0) {
        // Check if user is a platform admin
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });
        if (user?.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'You do not have access to this board' });
        }
        userRole = 'admin'; // Platform admin has full access
      } else {
        const member = board.workspace.members[0];
        userRole = member.role;
      }

      // Check permissions - only owner/admin can save workflow
      if (userRole !== 'owner' && userRole !== 'admin') {
        return res.status(403).json({ success: false, message: 'Insufficient permissions. Only workspace owners and admins can configure workflows.' });
      }

      // Ensure boardId matches
      config.boardId = boardId;

      const saved = await ApprovalWorkflowService.saveWorkflowConfig(config);
      return res.json({ success: true, data: saved });
    } catch (error) {
      console.error('Error saving workflow:', error);
      return res.status(500).json({ success: false, message: 'Failed to save workflow configuration' });
    }
  }

  /**
   * Evaluate workflow for an item (used when submitting for approval)
   */
  static async evaluateWorkflow(req: AuthRequest, res: Response) {
    try {
      const { boardId, itemId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const item = await prisma.item.findUnique({
        where: { id: itemId },
      });

      if (!item || item.boardId !== boardId) {
        return res.status(404).json({ success: false, message: 'Item not found' });
      }

      const evaluation = await ApprovalWorkflowService.evaluateWorkflow(item, boardId);
      return res.json({ success: true, data: evaluation });
    } catch (error) {
      console.error('Error evaluating workflow:', error);
      return res.status(500).json({ success: false, message: 'Failed to evaluate workflow' });
    }
  }
}

