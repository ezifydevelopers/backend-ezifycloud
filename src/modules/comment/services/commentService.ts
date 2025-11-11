import { Prisma, NotificationType } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { CreateCommentInput, UpdateCommentInput, CommentQueryFilters } from '../types';
import { NotificationService } from '../../notification/services/notificationService';

export class CommentService {
  async createComment(userId: string, data: CreateCommentInput) {
    // Verify item exists and user has access
    const item = await prisma.item.findUnique({
      where: { id: data.itemId },
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
      throw new Error('Item not found');
    }

    // Check workspace access
    const member = item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Validate parent comment if provided
    if (data.parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || parent.itemId !== data.itemId) {
        throw new Error('Invalid parent comment');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        itemId: data.itemId,
        userId,
        content: data.content,
        mentions: data.mentions || [],
        isPrivate: data.isPrivate || false,
        parentId: data.parentId || null,
      },
      include: {
        user: {
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
            board: {
              select: {
                id: true,
                name: true,
                workspace: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Create notifications for mentioned users
    if (data.mentions && data.mentions.length > 0) {
      const commenter = comment.user;
      
      for (const mentionedUserId of data.mentions) {
        // Don't notify the commenter if they mentioned themselves
        if (mentionedUserId === userId) continue;
        
        try {
          await NotificationService.createNotification({
            userId: mentionedUserId,
            type: 'mention' as NotificationType,
            title: `You were mentioned in a comment`,
            message: `${commenter.name} mentioned you in a comment on "${item.board.name}"`,
            link: `/boards/${item.board.id}/items/${item.id}`,
            metadata: {
              commentId: comment.id,
              itemId: item.id,
              boardId: item.board.id,
              workspaceId: item.board.workspace.id,
              commenterId: userId,
              commenterName: commenter.name,
            },
          });
        } catch (error) {
          console.error(`Error creating mention notification for user ${mentionedUserId}:`, error);
          // Don't fail the comment creation if notification fails
        }
      }
    }

    // Log activity for comment creation
    try {
      // Check if comment has files (files are uploaded separately after comment creation)
      const commentFiles = await prisma.commentFile.findMany({
        where: { commentId: comment.id },
      });
      
      await prisma.activity.create({
        data: {
          itemId: data.itemId,
          userId,
          action: 'comment_created',
          details: {
            commentId: comment.id,
            hasFiles: commentFiles.length > 0,
            fileCount: commentFiles.length,
            mentions: data.mentions || [],
          } as any,
        },
      });
    } catch (error) {
      console.error('Error logging comment activity:', error);
      // Don't fail comment creation if activity logging fails
    }

    return {
      ...comment,
      reactions: comment.reactions as Record<string, string[]> || {},
    };
  }

  async getCommentById(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
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
        files: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
          },
          orderBy: {
            uploadedAt: 'asc',
          },
        },
        resolvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check access
    const member = comment.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // If private comment, only creator can see it
    if (comment.isPrivate && comment.userId !== userId) {
      throw new Error('Access denied');
    }

    // Get replies
    const replies = await prisma.comment.findMany({
      where: {
        parentId: commentId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        files: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
          },
          orderBy: {
            uploadedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      ...comment,
      reactions: comment.reactions as Record<string, string[]> || {},
      replies: replies.map(reply => ({
        ...reply,
        reactions: reply.reactions as Record<string, string[]> || {},
      })),
      files: comment.files || [],
    };
  }

  async getItemComments(itemId: string, userId: string, filters?: CommentQueryFilters) {
    // Verify item access
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
      throw new Error('Item not found');
    }

    const member = item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    const where: Prisma.CommentWhereInput = {
      itemId,
      parentId: filters?.parentId !== undefined 
        ? filters.parentId === null || filters.parentId === 'null' || filters.parentId === ''
          ? null
          : filters.parentId
        : null, // Only top-level comments by default
      ...(filters?.includeDeleted !== true && { deletedAt: null }),
    };

    const comments = await prisma.comment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        _count: {
          select: {
            replies: true,
          },
        },
        files: {
          include: {
            uploader: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
          },
          orderBy: {
            uploadedAt: 'asc',
          },
        },
        resolvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: [
        { isPinned: 'desc' }, // Pinned comments first
        { createdAt: 'asc' },
      ],
    });

    // Get replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await prisma.comment.findMany({
          where: {
            parentId: comment.id,
            deletedAt: null,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
            files: {
              include: {
                uploader: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    profilePicture: true,
                  },
                },
              },
              orderBy: {
                uploadedAt: 'asc',
              },
            },
            resolvedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        });

        return {
          ...comment,
          reactions: comment.reactions as Record<string, string[]> || {},
          replies: replies.map(reply => ({
            ...reply,
            reactions: reply.reactions as Record<string, string[]> || {},
          })),
        };
      })
    );

    // Filter out private comments not owned by user
    return commentsWithReplies.filter(comment => 
      !comment.isPrivate || comment.userId === userId
    );
  }

  async updateComment(commentId: string, userId: string, data: UpdateCommentInput) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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

    if (!comment) {
      throw new Error('Comment not found');
    }

    // Only creator can update
    if (comment.userId !== userId) {
      throw new Error('Access denied');
    }

    // Cannot update deleted comment
    if (comment.deletedAt) {
      throw new Error('Cannot update deleted comment');
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        ...(data.content && { content: data.content }),
        ...(data.mentions !== undefined && { mentions: data.mentions }),
        ...(data.isPrivate !== undefined && { isPrivate: data.isPrivate }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return {
      ...updated,
      reactions: updated.reactions as Record<string, string[]> || {},
    };
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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

    if (!comment) {
      throw new Error('Comment not found');
    }

    const member = comment.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Only creator or workspace admin/owner can delete
    const canDelete = 
      comment.userId === userId || 
      member.role === 'owner' || 
      member.role === 'admin';

    if (!canDelete) {
      throw new Error('Access denied');
    }

    // Soft delete
    await prisma.comment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  async addReaction(commentId: string, userId: string, emoji: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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

    if (!comment) {
      throw new Error('Comment not found');
    }

    const member = comment.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    const reactions = (comment.reactions as Record<string, string[]>) || {};
    
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    // Toggle reaction
    if (reactions[emoji].includes(userId)) {
      reactions[emoji] = reactions[emoji].filter(id => id !== userId);
    } else {
      reactions[emoji].push(userId);
    }

    // Remove emoji if no reactions
    if (reactions[emoji].length === 0) {
      delete reactions[emoji];
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: {
        reactions: reactions as Prisma.InputJsonValue,
      },
    });

    return {
      ...comment,
      reactions,
    };
  }

  async pinComment(commentId: string, userId: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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

    if (!comment) {
      throw new Error('Comment not found');
    }

    const member = comment.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Only workspace owner, admin, or comment creator can pin
    const canPin = 
      comment.userId === userId || 
      member.role === 'owner' || 
      member.role === 'admin';

    if (!canPin) {
      throw new Error('Access denied');
    }

    // Toggle pin status
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        isPinned: !comment.isPinned,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return {
      ...updatedComment,
      isPinned: updatedComment.isPinned,
      isResolved: updatedComment.isResolved,
      reactions: updatedComment.reactions as Record<string, string[]> || {},
    };
  }

  async resolveComment(commentId: string, userId: string, resolved: boolean = true) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
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

    if (!comment) {
      throw new Error('Comment not found');
    }

    const member = comment.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Only workspace owner, admin, or comment creator can resolve
    const canResolve = 
      comment.userId === userId || 
      member.role === 'owner' || 
      member.role === 'admin';

    if (!canResolve) {
      throw new Error('Access denied');
    }

    // Update resolve status
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        isResolved: resolved,
        resolvedAt: resolved ? new Date() : null,
        resolvedBy: resolved ? userId : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        resolvedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return {
      ...updatedComment,
      isPinned: updatedComment.isPinned,
      isResolved: updatedComment.isResolved,
      reactions: updatedComment.reactions as Record<string, string[]> || {},
    };
  }
}

export default new CommentService();

