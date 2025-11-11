import prisma from '../../../lib/prisma';
import { ApprovalLevel, ApprovalStatus } from '@prisma/client';
import { CreateApprovalInput, UpdateApprovalInput, ApprovalQueryFilters, ItemApprovalStatus } from '../types';

export class ApprovalService {
  /**
   * Check if user has access to item's workspace
   */
  private static async checkItemAccess(itemId: string, userId: string): Promise<boolean> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        board: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      return false;
    }

    const member = item.board.workspace.members[0];
    return !!member;
  }

  /**
   * Check if previous level is approved (sequential approval)
   */
  private static async checkPreviousLevelApproved(itemId: string, level: ApprovalLevel): Promise<boolean> {
    if (level === ApprovalLevel.LEVEL_1) {
      return true; // LEVEL_1 can always be approved
    }

    const previousLevel = level === ApprovalLevel.LEVEL_2 
      ? ApprovalLevel.LEVEL_1 
      : ApprovalLevel.LEVEL_2;

    const previousApproval = await prisma.approval.findFirst({
      where: {
        itemId,
        level: previousLevel,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return previousApproval?.status === ApprovalStatus.approved;
  }

  async createApproval(userId: string, data: CreateApprovalInput) {
    // Check access
    const hasAccess = await ApprovalService.checkItemAccess(data.itemId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Check if approval for this level already exists
    const existing = await prisma.approval.findFirst({
      where: {
        itemId: data.itemId,
        level: data.level,
        status: ApprovalStatus.pending,
      },
    });

    if (existing) {
      throw new Error(`Approval for ${data.level} already exists`);
    }

    // Validate previous level is approved (if not LEVEL_1)
    if (data.level !== ApprovalLevel.LEVEL_1) {
      const previousApproved = await ApprovalService.checkPreviousLevelApproved(data.itemId, data.level);
      if (!previousApproved) {
        throw new Error(`Previous approval level must be approved before requesting ${data.level}`);
      }
    }

    const approval = await prisma.approval.create({
      data: {
        itemId: data.itemId,
        level: data.level,
        approverId: data.approverId || null,
        status: ApprovalStatus.pending,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            boardId: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return approval;
  }

  async requestApproval(userId: string, itemId: string, levels: ApprovalLevel[] = [ApprovalLevel.LEVEL_1]) {
    // Check access
    const hasAccess = await ApprovalService.checkItemAccess(itemId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Get item and board
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        board: true,
      },
    });

    if (!item) {
      throw new Error('Item not found');
    }

    // Evaluate workflow to determine required levels
    const { ApprovalWorkflowService } = await import('./approvalWorkflowService');
    const evaluation = await ApprovalWorkflowService.evaluateWorkflow(item, item.boardId);

    // Use workflow evaluation levels if available, otherwise use provided levels
    const requiredLevels = evaluation.requiredLevels.length > 0 
      ? evaluation.requiredLevels 
      : (levels.length > 0 ? levels : [ApprovalLevel.LEVEL_1]);

    // If auto-approved, create auto-approved approvals
    if (evaluation.autoApproved) {
      const autoApprovals = [];
      for (const level of [ApprovalLevel.LEVEL_1, ApprovalLevel.LEVEL_2, ApprovalLevel.LEVEL_3]) {
        const existing = await prisma.approval.findFirst({
          where: { itemId, level },
        });
        if (!existing) {
          const approval = await prisma.approval.create({
            data: {
              itemId,
              level,
              status: ApprovalStatus.approved,
              approverId: userId,
              approvedAt: new Date(),
              comments: 'Auto-approved based on workflow rules',
            },
            include: {
              approver: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePicture: true,
                },
              },
            },
          });
          autoApprovals.push(approval);
        }
      }
      return autoApprovals;
    }

    // Create approval requests using workflow evaluation
    await ApprovalWorkflowService.createApprovalRequests(item, item.boardId, userId);

    // Fetch and return created approvals
    const createdApprovals = await prisma.approval.findMany({
      where: {
        itemId,
        level: { in: requiredLevels },
      },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        item: {
          select: {
            id: true,
            boardId: true,
          },
        },
      },
      orderBy: {
        level: 'asc',
      },
    });

    // Trigger automations for approval submission
    try {
      const { AutomationEngine } = await import('../../automation/services/automationEngine');
      
      // Trigger for each created approval
      for (const approval of createdApprovals) {
        await AutomationEngine.processItemEvent({
          itemId: approval.itemId,
          boardId: approval.item.boardId,
          userId,
          eventType: 'approval_submitted',
          approvalData: {
            approvalId: approval.id,
            level: approval.level,
            approverId: approval.approverId || undefined,
          },
        });
      }
    } catch (error) {
      console.error('Error processing automations for approval submission:', error);
      // Don't fail approval creation if automation fails
    }

    return createdApprovals;
  }

  static async getItemApprovals(itemId: string, userId: string): Promise<ItemApprovalStatus> {
    // Check access
    const hasAccess = await ApprovalService.checkItemAccess(itemId, userId);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    const approvals = await prisma.approval.findMany({
      where: { itemId },
      include: {
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: {
        level: 'asc',
      },
    });

    const level1 = approvals.find(a => a.level === ApprovalLevel.LEVEL_1) || null;
    const level2 = approvals.find(a => a.level === ApprovalLevel.LEVEL_2) || null;
    const level3 = approvals.find(a => a.level === ApprovalLevel.LEVEL_3) || null;

    // Determine overall status
    let overallStatus: 'pending' | 'approved' | 'rejected' | 'in_progress' = 'pending';
    let isComplete = false;

    if (level3) {
      if (level3.status === ApprovalStatus.approved) {
        overallStatus = 'approved';
        isComplete = true;
      } else if (level3.status === ApprovalStatus.rejected) {
        overallStatus = 'rejected';
        isComplete = true;
      } else {
        overallStatus = 'in_progress';
      }
    } else if (level2) {
      if (level2.status === ApprovalStatus.approved) {
        overallStatus = 'in_progress'; // Waiting for LEVEL_3
      } else if (level2.status === ApprovalStatus.rejected) {
        overallStatus = 'rejected';
        isComplete = true;
      } else {
        overallStatus = level1?.status === ApprovalStatus.approved ? 'in_progress' : 'pending';
      }
    } else if (level1) {
      if (level1.status === ApprovalStatus.approved) {
        overallStatus = 'in_progress'; // Waiting for next level
      } else if (level1.status === ApprovalStatus.rejected) {
        overallStatus = 'rejected';
        isComplete = true;
      } else {
        overallStatus = 'pending';
      }
    }

    return {
      level1: level1 as any,
      level2: level2 as any,
      level3: level3 as any,
      overallStatus,
      isComplete,
    };
  }

  async getApprovalById(approvalId: string, userId: string) {
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        item: {
          include: {
            board: {
              include: {
                workspace: {
                  include: {
                    members: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!approval) {
      throw new Error('Approval not found');
    }

    const member = approval.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    return approval;
  }

  async updateApproval(approvalId: string, userId: string, data: UpdateApprovalInput) {
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        item: {
          include: {
            board: {
              include: {
                workspace: {
                  include: {
                    members: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!approval) {
      throw new Error('Approval not found');
    }

    const member = approval.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Check if user can approve (must be approver or workspace admin/owner/finance)
    const canApprove = 
      approval.approverId === userId ||
      member.role === 'owner' ||
      member.role === 'admin' ||
      member.role === 'finance';

    if (!canApprove) {
      throw new Error('Access denied - not authorized to approve');
    }

    // Cannot change status if already approved/rejected (unless it's rejected and going back to pending)
    if (approval.status === ApprovalStatus.approved && data.status !== ApprovalStatus.approved) {
      throw new Error('Cannot change approved status');
    }

    // Validate sequential approval
    if (data.status === ApprovalStatus.approved && approval.level !== ApprovalLevel.LEVEL_1) {
      const previousApproved = await ApprovalService.checkPreviousLevelApproved(
        approval.itemId,
        approval.level
      );
      if (!previousApproved) {
        throw new Error('Previous approval level must be approved first');
      }
    }

    const updated = await prisma.approval.update({
      where: { id: approvalId },
      data: {
        status: data.status,
        comments: data.comments,
        approverId: data.approverId || approval.approverId || userId,
        approvedAt: data.status !== ApprovalStatus.pending ? new Date() : null,
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            boardId: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    // Trigger automations for approval status change
    try {
      const { AutomationEngine } = await import('../../automation/services/automationEngine');
      
      const eventType = data.status === ApprovalStatus.approved 
        ? 'approval_approved' 
        : data.status === ApprovalStatus.rejected 
        ? 'approval_rejected' 
        : null;

      if (eventType) {
        await AutomationEngine.processItemEvent({
          itemId: approval.itemId,
          boardId: approval.item.boardId,
          userId,
          eventType,
          approvalData: {
            approvalId: approval.id,
            level: approval.level,
            approverId: updated.approverId || undefined,
            comments: data.comments || undefined,
          },
        });

        // Check if approval level is completed (all approvals at this level are approved/rejected)
        if (data.status === ApprovalStatus.approved) {
          const levelApprovals = await prisma.approval.findMany({
            where: {
              itemId: approval.itemId,
              level: approval.level,
            },
          });

          // Check if all approvals at this level are approved (for parallel) or if this one is approved (for sequential)
          const allApproved = levelApprovals.every(a => a.status === ApprovalStatus.approved);
          const anyRejected = levelApprovals.some(a => a.status === ApprovalStatus.rejected);

          if (allApproved && !anyRejected) {
            // Level is completed
            await AutomationEngine.processItemEvent({
              itemId: approval.itemId,
              boardId: approval.item.boardId,
              userId,
              eventType: 'approval_level_completed',
              approvalData: {
                level: approval.level,
                approverId: updated.approverId || undefined,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error processing automations for approval status change:', error);
      // Don't fail approval update if automation fails
    }

    // If approved, auto-create next level approval if needed and notify
    if (data.status === ApprovalStatus.approved) {
      const { ApprovalNotificationService } = await import('./approvalNotificationService');
      
      // Notify creator that approval was approved
      await ApprovalNotificationService.notifyApprovalApproved(
        approval.itemId,
        approval.level,
        updated.approver?.name || 'Unknown',
        data.comments || undefined
      );

      const nextLevel = approval.level === ApprovalLevel.LEVEL_1 
        ? ApprovalLevel.LEVEL_2 
        : approval.level === ApprovalLevel.LEVEL_2 
        ? ApprovalLevel.LEVEL_3 
        : null;

      if (nextLevel) {
        // Check if next level already exists
        const nextExists = await prisma.approval.findFirst({
          where: {
            itemId: approval.itemId,
            level: nextLevel,
          },
        });

        if (!nextExists) {
          // Get workflow to determine approvers for next level
          const { ApprovalWorkflowService } = await import('./approvalWorkflowService');
          const evaluation = await ApprovalWorkflowService.evaluateWorkflow(
            approval.item,
            approval.item.boardId
          );

          const nextLevelApprovers = evaluation.assignedApprovers[nextLevel] || [];

          // Auto-create next level approval request(s)
          if (nextLevelApprovers.length > 0) {
            // Check if parallel or sequential
            const workflow = await ApprovalWorkflowService.getWorkflowConfig(approval.item.boardId);
            const levelConfig = workflow?.levels.find(l => l.level === nextLevel);
            const isParallel = levelConfig?.isParallel ?? false;

            if (isParallel) {
              // Create one approval per approver
              for (const approverId of nextLevelApprovers) {
                await prisma.approval.create({
                  data: {
                    itemId: approval.itemId,
                    level: nextLevel,
                    status: ApprovalStatus.pending,
                    approverId,
                  },
                });
              }
            } else {
              // Create one approval for first approver
              await prisma.approval.create({
                data: {
                  itemId: approval.itemId,
                  level: nextLevel,
                  status: ApprovalStatus.pending,
                  approverId: nextLevelApprovers[0],
                },
              });
            }

            // Notify next level approvers
            await ApprovalNotificationService.notifyNextLevelApprovers(
              approval.itemId,
              nextLevel,
              nextLevelApprovers
            );
          } else {
            // No specific approvers, create without assignee
            await prisma.approval.create({
              data: {
                itemId: approval.itemId,
                level: nextLevel,
                status: ApprovalStatus.pending,
              },
            });
          }
        }
      } else {
        // This is the last level (LEVEL_3), all approvals complete
        const { ApprovalNotificationService } = await import('./approvalNotificationService');
        await ApprovalNotificationService.notifyAllApprovalsComplete(approval.itemId);
      }
    }

    // If rejected, notify creator
    if (data.status === ApprovalStatus.rejected) {
      const { ApprovalNotificationService } = await import('./approvalNotificationService');
      
      // Check if this is a "changes requested" vs a full rejection
      const isChangesRequested = data.comments?.toLowerCase().includes('changes requested');
      
      if (isChangesRequested) {
        // Extract feedback (remove "Changes requested: " prefix)
        const feedback = data.comments?.replace(/^Changes requested:\s*/i, '').trim() || '';
        await ApprovalNotificationService.notifyChangesRequested(
          approval.itemId,
          approval.level,
          updated.approver?.name || 'Unknown',
          feedback
        );
      } else {
        await ApprovalNotificationService.notifyApprovalRejected(
          approval.itemId,
          approval.level,
          updated.approver?.name || 'Unknown',
          data.comments || 'No reason provided'
        );
      }
    }

    return updated;
  }

  async getMyPendingApprovals(userId: string) {
    // Get all pending approvals
    const allPending = await prisma.approval.findMany({
      where: {
        status: ApprovalStatus.pending,
      },
      include: {
        item: {
          include: {
            board: {
              include: {
                workspace: {
                  include: {
                    members: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Filter by workspace access and permission
    return allPending.filter(approval => {
      const member = approval.item.board.workspace.members[0];
      if (!member) return false;

      // User can see if they're the approver or if they're admin/owner/finance
      return (
        approval.approverId === userId ||
        member.role === 'owner' ||
        member.role === 'admin' ||
        member.role === 'finance'
      );
    });
  }

  async deleteApproval(approvalId: string, userId: string) {
    const approval = await prisma.approval.findUnique({
      where: { id: approvalId },
      include: {
        item: {
          include: {
            board: {
              include: {
                workspace: {
                  include: {
                    members: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!approval) {
      throw new Error('Approval not found');
    }

    const member = approval.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Only workspace admin/owner or item creator can delete
    const canDelete = 
      member.role === 'owner' ||
      member.role === 'admin' ||
      approval.item.createdBy === userId;

    if (!canDelete) {
      throw new Error('Access denied');
    }

    await prisma.approval.delete({
      where: { id: approvalId },
    });

    return { success: true };
  }
}

export default new ApprovalService();

