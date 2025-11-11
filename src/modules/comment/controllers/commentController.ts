import { Response } from 'express';
import commentService from '../services/commentService';
import { AuthRequest } from '../../../middleware/auth';

export class CommentController {
  async createComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const comment = await commentService.createComment(userId, req.body);
      
      return res.status(201).json({
        success: true,
        data: comment,
        message: 'Comment created successfully',
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create comment',
      });
    }
  }

  async getCommentById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { commentId } = req.params;
      const comment = await commentService.getCommentById(commentId, userId);

      return res.json({
        success: true,
        data: comment,
      });
    } catch (error) {
      console.error('Error fetching comment:', error);
      return res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'Comment not found',
      });
    }
  }

  async getItemComments(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId } = req.params;
      const filters = {
        itemId,
        parentId: req.query.parentId === 'null' || req.query.parentId === '' 
          ? null 
          : req.query.parentId as string | undefined,
        includeDeleted: req.query.includeDeleted === 'true',
      };

      const comments = await commentService.getItemComments(itemId, userId, filters);

      return res.json({
        success: true,
        data: comments,
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch comments',
      });
    }
  }

  async updateComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { commentId } = req.params;
      const comment = await commentService.updateComment(commentId, userId, req.body);

      return res.json({
        success: true,
        data: comment,
        message: 'Comment updated successfully',
      });
    } catch (error) {
      console.error('Error updating comment:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update comment',
      });
    }
  }

  async deleteComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { commentId } = req.params;
      await commentService.deleteComment(commentId, userId);

      return res.json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete comment',
      });
    }
  }

  async addReaction(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { commentId } = req.params;
      const { emoji } = req.body;

      if (!emoji) {
        return res.status(400).json({
          success: false,
          message: 'Emoji is required',
        });
      }

      const comment = await commentService.addReaction(commentId, userId, emoji);

      return res.json({
        success: true,
        data: comment,
        message: 'Reaction updated',
      });
    } catch (error) {
      console.error('Error adding reaction:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add reaction',
      });
    }
  }

  async pinComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { commentId } = req.params;
      const comment = await commentService.pinComment(commentId, userId);

      const isPinned = (comment as any).isPinned ?? false;

      return res.json({
        success: true,
        data: comment,
        message: isPinned ? 'Comment pinned' : 'Comment unpinned',
      });
    } catch (error) {
      console.error('Error pinning comment:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to pin comment',
      });
    }
  }

  async resolveComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { commentId } = req.params;
      const { resolved } = req.body;

      const comment = await commentService.resolveComment(commentId, userId, resolved !== false);

      const isResolved = (comment as any).isResolved ?? false;

      return res.json({
        success: true,
        data: comment,
        message: isResolved ? 'Comment marked as resolved' : 'Comment marked as unresolved',
      });
    } catch (error) {
      console.error('Error resolving comment:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resolve comment',
      });
    }
  }
}

export default new CommentController();

