// Approval notification service - Handles notifications for approval actions

import prisma from '../../../lib/prisma';
import { ApprovalLevel, ApprovalStatus } from '@prisma/client';
import { ApprovalEmailService, ApprovalEmailData } from './approvalEmailService';

export class ApprovalNotificationService {
  /**
   * Send notification to item creator when approval is approved
   */
  static async notifyApprovalApproved(
    itemId: string,
    approvalLevel: ApprovalLevel,
    approverName: string,
    comments?: string
  ): Promise<void> {
    try {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          board: {
            include: {
              workspace: {
                include: {
                  members: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!item) return;

      // Get creator user directly
      const creator = await prisma.user.findUnique({
        where: { id: item.createdBy },
        select: { id: true, name: true, email: true },
      });

      if (!creator) return;

      const link = `/workspaces/${item.board.workspaceId}/boards/${item.boardId}/items/${itemId}`;
      const message = `"${item.name}" has been approved at ${approvalLevel} by ${approverName}${comments ? `. Comments: ${comments}` : ''}`;

      const emailData: ApprovalEmailData = {
        recipientEmail: creator.email,
        recipientName: creator.name,
        itemName: item.name,
        itemId: item.id,
        workspaceId: item.board.workspaceId,
        boardId: item.boardId,
        approvalLevel,
        approverName,
        comments,
        link,
      };

      await ApprovalEmailService.sendApprovalNotification(
        creator.id,
        'approval_approved',
        `Approval ${approvalLevel} Approved`,
        message,
        emailData,
        link,
        { approvalLevel, approverName, itemId }
      );
    } catch (error) {
      console.error('Error sending approval notification:', error);
      // Don't throw - notification failure shouldn't break approval
    }
  }

  /**
   * Send notification to item creator when approval is rejected
   */
  static async notifyApprovalRejected(
    itemId: string,
    approvalLevel: ApprovalLevel,
    approverName: string,
    rejectionReason: string
  ): Promise<void> {
    try {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          board: {
            include: {
              workspace: {
                include: {
                  members: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!item) return;

      // Get creator user directly
      const creator = await prisma.user.findUnique({
        where: { id: item.createdBy },
        select: { id: true, name: true, email: true },
      });

      if (!creator) return;

      const link = `/workspaces/${item.board.workspaceId}/boards/${item.boardId}/items/${itemId}`;
      const message = `"${item.name}" has been rejected at ${approvalLevel} by ${approverName}. Reason: ${rejectionReason}`;

      const emailData: ApprovalEmailData = {
        recipientEmail: creator.email,
        recipientName: creator.name,
        itemName: item.name,
        itemId: item.id,
        workspaceId: item.board.workspaceId,
        boardId: item.boardId,
        approvalLevel,
        approverName,
        rejectionReason,
        link,
      };

      await ApprovalEmailService.sendApprovalNotification(
        creator.id,
        'approval_rejected',
        `Approval ${approvalLevel} Rejected`,
        message,
        emailData,
        link,
        { approvalLevel, approverName, rejectionReason, itemId }
      );
    } catch (error) {
      console.error('Error sending rejection notification:', error);
    }
  }

  /**
   * Send notification to item creator when changes are requested
   */
  static async notifyChangesRequested(
    itemId: string,
    approvalLevel: ApprovalLevel,
    approverName: string,
    feedback: string
  ): Promise<void> {
    try {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          board: {
            include: {
              workspace: {
                include: {
                  members: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!item) return;

      // Get creator user directly
      const creator = await prisma.user.findUnique({
        where: { id: item.createdBy },
        select: { id: true, name: true, email: true },
      });

      if (!creator) return;

      const link = `/workspaces/${item.board.workspaceId}/boards/${item.boardId}/items/${itemId}`;
      const message = `"${item.name}" requires changes at ${approvalLevel}. ${approverName} has provided feedback: ${feedback}`;

      const emailData: ApprovalEmailData = {
        recipientEmail: creator.email,
        recipientName: creator.name,
        itemName: item.name,
        itemId: item.id,
        workspaceId: item.board.workspaceId,
        boardId: item.boardId,
        approvalLevel,
        approverName,
        feedback,
        link,
      };

      await ApprovalEmailService.sendApprovalNotification(
        creator.id,
        'changes_requested',
        `Changes Requested - ${approvalLevel}`,
        message,
        emailData,
        link,
        { feedback, approvalLevel, approverName, itemId }
      );
    } catch (error) {
      console.error('Error sending changes requested notification:', error);
    }
  }

  /**
   * Send notification to next level approvers when previous level is approved
   */
  static async notifyNextLevelApprovers(
    itemId: string,
    nextLevel: ApprovalLevel,
    approverIds: string[]
  ): Promise<void> {
    try {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          board: {
            include: {
              workspace: true,
            },
          },
        },
      });

      if (!item || approverIds.length === 0) return;

      // Get approvers' details
      const approvers = await prisma.user.findMany({
        where: { id: { in: approverIds } },
        select: { id: true, name: true, email: true },
      });

      const link = `/approvals/queue`;
      const message = `"${item.name}" requires your ${nextLevel} approval. Please review and take action.`;

      for (const approver of approvers) {
        const emailData: ApprovalEmailData = {
          recipientEmail: approver.email,
          recipientName: approver.name,
          itemName: item.name,
          itemId: item.id,
          workspaceId: item.board.workspaceId,
          boardId: item.boardId,
          approvalLevel: nextLevel,
          link,
        };

        await ApprovalEmailService.sendApprovalNotification(
          approver.id,
          'approval_requested',
          `Approval Required - ${nextLevel}`,
          message,
          emailData,
          link,
          { approvalLevel: nextLevel, itemId: item.id }
        );
      }
    } catch (error) {
      console.error('Error sending next level notifications:', error);
    }
  }

  /**
   * Send notification when all approvals are complete
   */
  static async notifyAllApprovalsComplete(itemId: string): Promise<void> {
    try {
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          board: {
            include: {
              workspace: {
                include: {
                  members: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!item) return;

      // Get creator user directly
      const creator = await prisma.user.findUnique({
        where: { id: item.createdBy },
        select: { id: true, name: true, email: true },
      });

      if (!creator) return;

      const link = `/workspaces/${item.board.workspaceId}/boards/${item.boardId}/items/${itemId}`;
      const message = `"${item.name}" has been fully approved and is ready for processing.`;

      const emailData: ApprovalEmailData = {
        recipientEmail: creator.email,
        recipientName: creator.name,
        itemName: item.name,
        itemId: item.id,
        workspaceId: item.board.workspaceId,
        boardId: item.boardId,
        link,
      };

      await ApprovalEmailService.sendApprovalNotification(
        creator.id,
        'approval_complete',
        'All Approvals Complete',
        message,
        emailData,
        link,
        { itemId: item.id }
      );
    } catch (error) {
      console.error('Error sending completion notification:', error);
    }
  }
}
