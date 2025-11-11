import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import fileService, { FileLike } from '../services/fileService';
import { AuthRequest } from '../../../middleware/auth';
import { APP_CONFIG } from '../../../config/app';
import { StorageFactory } from '../storage/StorageFactory';

export class FileController {
  async uploadFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId, fileName, fileData, mimeType, fileSize } = req.body;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: 'Item ID is required',
        });
      }

      if (!fileData || !fileName) {
        return res.status(400).json({
          success: false,
          message: 'File data and name are required',
        });
      }

      // Convert base64 to buffer
      const base64Data = fileData.split(',')[1] || fileData; // Remove data:image/png;base64, prefix if present
      const buffer = Buffer.from(base64Data, 'base64');

      // Create file-like object (for base64 uploads, we simulate a file object)
      const file: FileLike = {
        originalname: fileName,
        mimetype: mimeType || 'application/octet-stream',
        size: fileSize || buffer.length,
        buffer: buffer,
      };

      const { folder, replaceFileId } = req.body;

      const uploadedFile = await fileService.uploadFile(userId, itemId, file, {
        folder,
        replaceFileId,
      });

      return res.status(201).json({
        success: true,
        data: uploadedFile,
        message: 'File uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to upload file',
      });
    }
  }

  async getItemFiles(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId } = req.params;
      const files = await fileService.getItemFiles(itemId, userId);

      return res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      console.error('Error fetching files:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch files',
      });
    }
  }

  async getFileById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fileId } = req.params;
      const file = await fileService.getFileById(fileId, userId);

      return res.json({
        success: true,
        data: file,
      });
    } catch (error) {
      console.error('Error fetching file:', error);
      return res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'File not found',
      });
    }
  }

  async downloadFile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const { fileId } = req.params;
      const file = await fileService.getFileById(fileId, userId);
      
      // Get storage provider and stream
      const fileStream = await fileService.getFileStream(fileId, userId);
      
      res.setHeader('Content-Type', fileStream.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileStream.fileName)}"`);
      res.setHeader('Content-Length', fileStream.fileSize.toString());

      fileStream.stream.pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      res.status(404).json({
        success: false,
        message: error instanceof Error ? error.message : 'File not found',
      });
    }
  }

  async deleteFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fileId } = req.params;
      await fileService.deleteFile(fileId, userId);

      return res.json({
        success: true,
        message: 'File deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete file',
      });
    }
  }

  async renameFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fileId } = req.params;
      const { newFileName } = req.body;

      if (!newFileName || !newFileName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'New file name is required',
        });
      }

      const updated = await fileService.renameFile(fileId, newFileName.trim(), userId);

      return res.json({
        success: true,
        data: updated,
        message: 'File renamed successfully',
      });
    } catch (error) {
      console.error('Error renaming file:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to rename file',
      });
    }
  }

  async moveFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fileId } = req.params;
      const { targetItemId } = req.body;

      if (!targetItemId) {
        return res.status(400).json({
          success: false,
          message: 'Target item ID is required',
        });
      }

      const updated = await fileService.moveFile(fileId, targetItemId, userId);

      return res.json({
        success: true,
        data: updated,
        message: 'File moved successfully',
      });
    } catch (error) {
      console.error('Error moving file:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to move file',
      });
    }
  }

  async replaceFile(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fileId } = req.params;
      const { fileName, fileData, mimeType, fileSize } = req.body;

      if (!fileData || !fileName) {
        return res.status(400).json({
          success: false,
          message: 'File data and name are required',
        });
      }

      // Convert base64 to buffer
      const base64Data = fileData.split(',')[1] || fileData;
      const buffer = Buffer.from(base64Data, 'base64');

      const file: FileLike = {
        originalname: fileName,
        mimetype: mimeType || 'application/octet-stream',
        size: fileSize || buffer.length,
        buffer: buffer,
      };

      const updated = await fileService.replaceFile(fileId, file, userId);

      return res.json({
        success: true,
        data: updated,
        message: 'File replaced successfully',
      });
    } catch (error) {
      console.error('Error replacing file:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to replace file',
      });
    }
  }

  async bulkDownload(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemIds } = req.body;

      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Item IDs array is required',
        });
      }

      const files = await fileService.getFilesForBulkDownload(itemIds, userId);

      // Return file list - frontend will handle ZIP creation
      return res.json({
        success: true,
        data: files,
        message: 'Files retrieved for bulk download',
      });
    } catch (error) {
      console.error('Error preparing bulk download:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to prepare bulk download',
      });
    }
  }

  /**
   * Get allowed file types configuration
   */
  async getAllowedFileTypes(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { ALLOWED_TYPES, MAX_FILE_SIZE, ENABLED_CATEGORIES } = APP_CONFIG.UPLOAD;

      // Build response with enabled categories only
      const allowedTypes: Record<string, any> = {};
      
      if (ENABLED_CATEGORIES.images) {
        allowedTypes.images = {
          mimeTypes: ALLOWED_TYPES.IMAGES.mimeTypes,
          extensions: ALLOWED_TYPES.IMAGES.extensions,
          maxSize: ALLOWED_TYPES.IMAGES.maxSize,
        };
      }
      
      if (ENABLED_CATEGORIES.documents) {
        allowedTypes.documents = {
          mimeTypes: ALLOWED_TYPES.DOCUMENTS.mimeTypes,
          extensions: ALLOWED_TYPES.DOCUMENTS.extensions,
          maxSize: ALLOWED_TYPES.DOCUMENTS.maxSize,
        };
      }
      
      if (ENABLED_CATEGORIES.spreadsheets) {
        allowedTypes.spreadsheets = {
          mimeTypes: ALLOWED_TYPES.SPREADSHEETS.mimeTypes,
          extensions: ALLOWED_TYPES.SPREADSHEETS.extensions,
          maxSize: ALLOWED_TYPES.SPREADSHEETS.maxSize,
        };
      }
      
      if (ENABLED_CATEGORIES.other) {
        allowedTypes.other = {
          mimeTypes: ALLOWED_TYPES.OTHER.mimeTypes,
          extensions: ALLOWED_TYPES.OTHER.extensions,
          maxSize: ALLOWED_TYPES.OTHER.maxSize,
        };
      }

      return res.json({
        success: true,
        data: {
          allowedTypes,
          globalMaxSize: MAX_FILE_SIZE,
          enabledCategories: ENABLED_CATEGORIES,
        },
      });
    } catch (error) {
      console.error('Error fetching allowed file types:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch allowed file types',
      });
    }
  }

  /**
   * Get file versions
   */
  async getFileVersions(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { fileId } = req.params;
      const versions = await fileService.getFileVersions(fileId, userId);

      return res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      console.error('Error fetching file versions:', error);
      return res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch file versions',
      });
    }
  }

  /**
   * Get files by folder
   */
  async getFilesByFolder(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId } = req.params;
      const { folder } = req.query;

      const files = await fileService.getFilesByFolder(
        itemId,
        userId,
        folder as string | undefined
      );

      return res.json({
        success: true,
        data: files,
      });
    } catch (error) {
      console.error('Error fetching files by folder:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch files',
      });
    }
  }

  /**
   * Get folder structure
   */
  async getFolderStructure(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const { itemId } = req.params;
      const folders = await fileService.getFolderStructure(itemId, userId);

      return res.json({
        success: true,
        data: folders,
      });
    } catch (error) {
      console.error('Error fetching folder structure:', error);
      const statusCode = (error as any)?.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch folder structure',
      });
    }
  }
}

export default new FileController();

