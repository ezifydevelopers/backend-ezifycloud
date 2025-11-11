import { Response } from 'express';
import approvalService, { ApprovalService } from '../services/approvalService';
import { ApprovalLevel } from '@prisma/client';
import { AuthRequest } from '../../../middleware/auth';

export class ApprovalController {
  async createApproval(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const approval = await approvalService.createApproval(userId, req.body);

      return res.status(201).json({
        success: true,
        data: approval,
        message: 'Approval request created successfully',
      });
    } catch (error) {
      console.error('Error creating approval:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create approval',
      });
    }
  }

  async requestApproval(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId } = req.params;
      const { levels } = req.body;

      const requestedLevels = levels 
        ? levels.map((l: string) => l as ApprovalLevel)
        : [ApprovalLevel.LEVEL_1];

      const approvals = await approvalService.requestApproval(userId, itemId, requestedLevels);

      return res.status(201).json({
        success: true,
        data: approvals,
        message: 'Approval request created successfully',
      });
    } catch (error) {
      console.error('Error requesting approval:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to request approval',
      });
    }
  }

  async getItemApprovals(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId } = req.params;
      const status = await ApprovalService.getItemApprovals(itemId, userId);

      return res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error fetching approvals:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch approvals',
      });
    }
  }

  async getApprovalById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { approvalId } = req.params;
      const approval = await approvalService.getApprovalById(approvalId, userId);

      return res.json({
        success: true,
        data: approval,
      });
    } catch (error) {
      console.error('Error fetching approval:', error);
      return res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Approval not found',
      });
    }
  }

  async updateApproval(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { approvalId } = req.params;
      const approval = await approvalService.updateApproval(approvalId, userId, req.body);

      return res.json({
        success: true,
        data: approval,
        message: 'Approval updated successfully',
      });
    } catch (error) {
      console.error('Error updating approval:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update approval',
      });
    }
  }

  async getMyPendingApprovals(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const approvals = await approvalService.getMyPendingApprovals(userId);

      return res.json({
        success: true,
        data: approvals,
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch approvals',
      });
    }
  }

  async deleteApproval(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { approvalId } = req.params;
      await approvalService.deleteApproval(approvalId, userId);

      return res.json({
        success: true,
        message: 'Approval deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting approval:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete approval',
      });
    }
  }
}

export default new ApprovalController();

