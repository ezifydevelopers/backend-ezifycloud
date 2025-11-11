import { Response } from 'express';
import { AuthRequest } from '../../../middleware/auth';
import { CommentFileService } from '../services/commentFileService';
import fs from 'fs';

export class CommentFileController {
  /**
   * Upload file for comment
   * POST /api/comments/files/upload
   */
  static async uploadCommentFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { commentId, itemId, fileName, fileData, mimeType, fileSize } = req.body;

      if (!commentId || !fileName || !fileData) {
        return res.status(400).json({
          success: false,
          message: 'Comment ID, file name, and file data are required',
        });
      }

      const file = await CommentFileService.uploadCommentFile(userId, {
        commentId,
        fileName,
        fileData,
        mimeType: mimeType || 'application/octet-stream',
        fileSize: fileSize || 0,
      });

      return res.status(201).json({
        success: true,
        data: file,
      });
    } catch (error) {
      console.error('Error uploading comment file:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload file',
      });
    }
  }

  /**
   * Get files for a comment
   * GET /api/comments/:commentId/files
   */
  static async getCommentFiles(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { commentId } = req.params;
      const files = await CommentFileService.getCommentFiles(commentId, userId);

      return res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      console.error('Error fetching comment files:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch files',
      });
    }
  }

  /**
   * Delete a comment file
   * DELETE /api/comments/files/:fileId
   */
  static async deleteCommentFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fileId } = req.params;
      await CommentFileService.deleteCommentFile(fileId, userId);

      return res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting comment file:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete file',
      });
    }
  }

  /**
   * Download a comment file
   * GET /api/comments/files/:fileId/download
   */
  static async downloadCommentFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fileId } = req.params;
      const { file, filePath } = await CommentFileService.getCommentFile(fileId, userId);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          message: 'File not found',
        });
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
      // Return void since we're streaming the file
      return;
    } catch (error) {
      console.error('Error downloading comment file:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to download file',
      });
    }
  }
}

