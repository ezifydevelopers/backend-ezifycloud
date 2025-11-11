// Approval notification controller - API endpoints for reminders and alerts

import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { ApprovalReminderService } from '../services/approvalReminderService';

export class ApprovalNotificationController {
  /**
   * Manually trigger approval reminders
   * POST /api/approvals/reminders/send
   */
  static async sendReminders(req: AuthRequest, res: Response) {
    try {
      const hoursSinceCreation = parseInt(req.body.hoursSinceCreation || '24');

      await ApprovalReminderService.sendReminders(hoursSinceCreation);

      return res.json({
        success: true,
        message: 'Reminders sent successfully',
      });
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send reminders',
        error: error.message,
      });
    }
  }

  /**
   * Manually trigger deadline alerts
   * POST /api/approvals/deadlines/check
   */
  static async checkDeadlines(req: AuthRequest, res: Response) {
    try {
      const hoursBeforeDeadline = parseInt(req.body.hoursBeforeDeadline || '24');

      await ApprovalReminderService.sendDeadlineAlerts(hoursBeforeDeadline);

      return res.json({
        success: true,
        message: 'Deadline alerts processed successfully',
      });
    } catch (error: any) {
      console.error('Error checking deadlines:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to check deadlines',
        error: error.message,
      });
    }
  }
}

