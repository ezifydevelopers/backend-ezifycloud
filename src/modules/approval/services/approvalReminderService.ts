// Approval reminder service - Sends reminders for pending approvals

import prisma from '../../../lib/prisma';
import { ApprovalStatus } from '@prisma/client';
import { ApprovalEmailService, ApprovalEmailData } from './approvalEmailService';

export class ApprovalReminderService {
  /**
   * Send reminders for pending approvals
   * @param hoursSinceCreation - Send reminder if approval is pending for this many hours
   */
  static async sendReminders(hoursSinceCreation: number = 24): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - hoursSinceCreation * 60 * 60 * 1000);

      // Find pending approvals that haven't been reminded in the last 24 hours
      const pendingApprovals = await prisma.approval.findMany({
        where: {
          status: ApprovalStatus.pending,
          createdAt: {
            lte: cutoffTime, // Created before cutoff time
          },
        },
        include: {
          item: {
            include: {
              board: {
                include: {
                  workspace: true,
                },
              },
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      for (const approval of pendingApprovals) {
        // Check if we've already sent a reminder in the last 24 hours
        const recentReminder = await prisma.notification.findFirst({
          where: {
            userId: approval.approverId || '',
            type: 'approval_reminder',
            metadata: {
              path: ['approvalId'],
              equals: approval.id,
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        });

        if (recentReminder) {
          continue; // Already reminded recently
        }

        if (!approval.approver) {
          continue; // No approver assigned
        }

        const link = `/approvals/queue`;
        const hoursPending = Math.floor(
          (Date.now() - approval.createdAt.getTime()) / (1000 * 60 * 60)
        );
        const message = `"${approval.item.name}" has been pending your ${approval.level} approval for ${hoursPending} hour(s). Please review and take action.`;

        const emailData: ApprovalEmailData = {
          recipientEmail: approval.approver.email,
          recipientName: approval.approver.name,
          itemName: approval.item.name,
          itemId: approval.item.id,
          workspaceId: approval.item.board.workspaceId,
          boardId: approval.item.boardId,
          approvalLevel: approval.level,
          link,
        };

        await ApprovalEmailService.sendApprovalNotification(
          approval.approver.id,
          'approval_reminder',
          `Reminder: Approval Required - ${approval.level}`,
          message,
          emailData,
          link,
          { approvalId: approval.id, approvalLevel: approval.level, itemId: approval.item.id, hoursPending }
        );
      }

      console.log(`Sent ${pendingApprovals.length} approval reminders`);
    } catch (error) {
      console.error('Error sending approval reminders:', error);
    }
  }

  /**
   * Send deadline approaching alerts
   */
  static async sendDeadlineAlerts(hoursBeforeDeadline: number = 24): Promise<void> {
    try {
      // Get all pending approvals with deadlines
      const pendingApprovals = await prisma.approval.findMany({
        where: {
          status: ApprovalStatus.pending,
        },
        include: {
          item: {
            include: {
              board: {
                include: {
                  workspace: true,
                },
              },
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Get workflow configs to check deadlines
      const { ApprovalWorkflowService } = await import('./approvalWorkflowService');

      for (const approval of pendingApprovals) {
        if (!approval.approver) continue;

        const workflow = await ApprovalWorkflowService.getWorkflowConfig(approval.item.boardId);
        if (!workflow) continue;

        const levelConfig = workflow.levels.find(l => l.level === approval.level);
        if (!levelConfig || !levelConfig.timeoutHours) continue;

        // Calculate deadline (createdAt + timeoutHours)
        const deadline = new Date(
          approval.createdAt.getTime() + levelConfig.timeoutHours * 60 * 60 * 1000
        );
        const now = new Date();
        const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Check if deadline is approaching (within hoursBeforeDeadline)
        if (hoursUntilDeadline > 0 && hoursUntilDeadline <= hoursBeforeDeadline) {
          // Check if we've already sent an alert for this deadline
          const recentAlert = await prisma.notification.findFirst({
            where: {
              userId: approval.approver.id,
              type: {
                in: ['approval_deadline_approaching', 'approval_deadline_passed'],
              },
              metadata: {
                path: ['approvalId'],
                equals: approval.id,
              },
              createdAt: {
                gte: new Date(Date.now() - 12 * 60 * 60 * 1000), // Last 12 hours
              },
            },
          });

          if (recentAlert) {
            continue; // Already alerted recently
          }

          const link = `/approvals/queue`;
          const message = `"${approval.item.name}" has a deadline approaching in ${Math.round(hoursUntilDeadline)} hour(s). Please review and take action soon.`;

          const emailData: ApprovalEmailData = {
            recipientEmail: approval.approver.email,
            recipientName: approval.approver.name,
            itemName: approval.item.name,
            itemId: approval.item.id,
            workspaceId: approval.item.board.workspaceId,
            boardId: approval.item.boardId,
            approvalLevel: approval.level,
            deadline,
            link,
          };

          await ApprovalEmailService.sendApprovalNotification(
            approval.approver.id,
            'approval_deadline_approaching',
            `Urgent: Approval Deadline Approaching - ${approval.level}`,
            message,
            emailData,
            link,
            { approvalId: approval.id, approvalLevel: approval.level, itemId: approval.item.id, deadline: deadline.toISOString() }
          );
        }

        // Check if deadline has passed
        if (hoursUntilDeadline <= 0) {
          // Check if we've already sent an overdue alert
          const recentOverdueAlert = await prisma.notification.findFirst({
            where: {
              userId: approval.approver.id,
              type: 'approval_deadline_passed',
              metadata: {
                path: ['approvalId'],
                equals: approval.id,
              },
              createdAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
              },
            },
          });

          if (recentOverdueAlert) {
            continue; // Already alerted recently
          }

          const link = `/approvals/queue`;
          const hoursOverdue = Math.abs(hoursUntilDeadline);
          const message = `"${approval.item.name}" approval deadline has passed ${hoursOverdue.toFixed(1)} hour(s) ago. Please review and take action immediately.`;

          const emailData: ApprovalEmailData = {
            recipientEmail: approval.approver.email,
            recipientName: approval.approver.name,
            itemName: approval.item.name,
            itemId: approval.item.id,
            workspaceId: approval.item.board.workspaceId,
            boardId: approval.item.boardId,
            approvalLevel: approval.level,
            deadline,
            link,
          };

          await ApprovalEmailService.sendApprovalNotification(
            approval.approver.id,
            'approval_deadline_passed',
            `Overdue: Approval Deadline Passed - ${approval.level}`,
            message,
            emailData,
            link,
            { approvalId: approval.id, approvalLevel: approval.level, itemId: approval.item.id, deadline: deadline.toISOString(), hoursOverdue }
          );
        }
      }

      console.log('Processed deadline alerts');
    } catch (error) {
      console.error('Error sending deadline alerts:', error);
    }
  }
}

