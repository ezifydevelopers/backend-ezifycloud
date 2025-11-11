// Approval History Controller

import { Response } from 'express';
import { ApprovalHistoryService } from '../services/approvalHistoryService';
import { AuthRequest } from '../../../middleware/auth';

export class ApprovalHistoryController {
  /**
   * Get approval history for an item
   */
  async getApprovalHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId } = req.params;
      const history = await ApprovalHistoryService.getApprovalHistory(itemId);

      return res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching approval history:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch approval history',
      });
    }
  }

  /**
   * Export approval history as CSV
   */
  async exportApprovalHistory(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId } = req.params;
      const csv = await ApprovalHistoryService.exportAsCSV(itemId);

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="approval-history-${itemId}-${Date.now()}.csv"`);

      return res.send(csv);
    } catch (error) {
      console.error('Error exporting approval history:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to export approval history',
      });
    }
  }
}

export default new ApprovalHistoryController();

