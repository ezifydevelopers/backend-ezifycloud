import prisma from '../../../lib/prisma';
import fs from 'fs';
import path from 'path';
import { FileLike } from '../../file/services/fileStorageService';

export interface CreateCommentFileInput {
  commentId: string;
  fileName: string;
  fileData: string; // Base64
  mimeType: string;
  fileSize: number;
}

export class CommentFileService {
  /**
   * Upload a file for a comment
   */
  static async uploadCommentFile(userId: string, data: CreateCommentFileInput) {
    // Verify comment exists and user has access
    const comment = await prisma.comment.findUnique({
      where: { id: data.commentId },
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

    // Check workspace access
    const member = comment.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Convert base64 to buffer
    const base64Data = data.fileData.split(',')[1] || data.fileData;
    const buffer = Buffer.from(base64Data, 'base64');

    // Create upload directory structure: uploads/comments/commentId/filename
    const uploadDir = path.join(process.cwd(), 'uploads', 'comments', data.commentId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedOriginalName = data.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedOriginalName}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    // Save file
    fs.writeFileSync(filePath, buffer);

    // Create database record
    const commentFile = await prisma.commentFile.create({
      data: {
        commentId: data.commentId,
        fileName: data.fileName,
        filePath: path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
        fileSize: data.fileSize || buffer.length,
        mimeType: data.mimeType,
        uploadedBy: userId,
      },
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
    });

    // Log activity for file upload
    try {
      await prisma.activity.create({
        data: {
          itemId: comment.item.id,
          userId,
          action: 'file_uploaded',
          details: {
            commentId: data.commentId,
            fileName: data.fileName,
            fileSize: data.fileSize || buffer.length,
            mimeType: data.mimeType,
          } as any,
        },
      });
    } catch (error) {
      console.error('Error logging file upload activity:', error);
      // Don't fail file upload if activity logging fails
    }

    return commentFile;
  }

  /**
   * Get files for a comment
   */
  static async getCommentFiles(commentId: string, userId: string) {
    // Verify comment exists and user has access
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

    // Check workspace access
    const member = comment.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // If private comment, only creator can see files
    if (comment.isPrivate && comment.userId !== userId) {
      throw new Error('Access denied');
    }

    const files = await prisma.commentFile.findMany({
      where: { commentId },
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
        uploadedAt: 'desc',
      },
    });

    return files;
  }

  /**
   * Delete a comment file
   */
  static async deleteCommentFile(fileId: string, userId: string) {
    const file = await prisma.commentFile.findUnique({
      where: { id: fileId },
      include: {
        comment: {
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
        },
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Check access - only file uploader or comment creator can delete
    const canDelete = file.uploadedBy === userId || file.comment.userId === userId;
    if (!canDelete) {
      // Check workspace admin/owner
      const member = file.comment.item.board.workspace.members[0];
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        throw new Error('Access denied');
      }
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), file.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await prisma.commentFile.delete({
      where: { id: fileId },
    });
  }

  /**
   * Get file for download
   */
  static async getCommentFile(fileId: string, userId: string) {
    const file = await prisma.commentFile.findUnique({
      where: { id: fileId },
      include: {
        comment: {
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
        },
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    // Check workspace access
    const member = file.comment.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // If private comment, only creator can access files
    if (file.comment.isPrivate && file.comment.userId !== userId) {
      throw new Error('Access denied');
    }

    const filePath = path.join(process.cwd(), file.filePath);
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found on disk');
    }

    return {
      file,
      filePath,
    };
  }
}

