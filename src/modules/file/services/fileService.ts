import prisma from '../../../lib/prisma';
import { CreateItemFileInput, ItemFileQueryFilters } from '../types';
import { WorkspaceRole } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { APP_CONFIG } from '../../../config/app';
import { StorageFactory } from '../storage/StorageFactory';
import { IStorageProvider } from '../storage/IStorageProvider';

// File-like interface for base64 uploads (compatible with Multer.File structure)
export interface FileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class FileService {
  /**
   * Check if user has access to item's workspace
   */
  private static async checkItemAccess(itemId: string, userId: string): Promise<{ hasAccess: boolean; itemNotFound?: boolean }> {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: {
        creator: true,
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
      return { hasAccess: false, itemNotFound: true };
    }

    // If user created the item, allow access
    if (item.creator?.id === userId) {
      return { hasAccess: true, itemNotFound: false };
    }

    // Check if user is a workspace member
    const member = item.board.workspace.members[0];
    if (member) {
      return { hasAccess: true, itemNotFound: false };
    }

    // Allow platform admins to access files across workspaces
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'admin') {
      return { hasAccess: true, itemNotFound: false };
    }

    return { hasAccess: false, itemNotFound: false };
  }

  /**
   * Validate file type and size
   */
  private static validateFile(file: FileLike): { isValid: boolean; error?: string } {
    const { ALLOWED_TYPES, MAX_FILE_SIZE, ENABLED_CATEGORIES } = APP_CONFIG.UPLOAD;
    
    // Get file extension
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    // Check if any category allows this file type
    let isAllowed = false;
    let categoryMaxSize = MAX_FILE_SIZE;

    // Check images
    if (ENABLED_CATEGORIES.images) {
      if (
        (ALLOWED_TYPES.IMAGES.mimeTypes as unknown as string[]).includes(file.mimetype) ||
        (ALLOWED_TYPES.IMAGES.extensions as unknown as string[]).includes(fileExtension)
      ) {
        isAllowed = true;
        categoryMaxSize = ALLOWED_TYPES.IMAGES.maxSize;
      }
    }

    // Check documents
    if (!isAllowed && ENABLED_CATEGORIES.documents) {
      if (
        (ALLOWED_TYPES.DOCUMENTS.mimeTypes as unknown as string[]).includes(file.mimetype) ||
        (ALLOWED_TYPES.DOCUMENTS.extensions as unknown as string[]).includes(fileExtension)
      ) {
        isAllowed = true;
        categoryMaxSize = ALLOWED_TYPES.DOCUMENTS.maxSize;
      }
    }

    // Check spreadsheets
    if (!isAllowed && ENABLED_CATEGORIES.spreadsheets) {
      if (
        (ALLOWED_TYPES.SPREADSHEETS.mimeTypes as unknown as string[]).includes(file.mimetype) ||
        (ALLOWED_TYPES.SPREADSHEETS.extensions as unknown as string[]).includes(fileExtension)
      ) {
        isAllowed = true;
        categoryMaxSize = ALLOWED_TYPES.SPREADSHEETS.maxSize;
      }
    }

    // Check other
    if (!isAllowed && ENABLED_CATEGORIES.other) {
      if (
        (ALLOWED_TYPES.OTHER.mimeTypes as unknown as string[]).includes(file.mimetype) ||
        (ALLOWED_TYPES.OTHER.extensions as unknown as string[]).includes(fileExtension)
      ) {
        isAllowed = true;
        categoryMaxSize = ALLOWED_TYPES.OTHER.maxSize;
      }
    }

    if (!isAllowed) {
      return {
        isValid: false,
        error: `File type "${fileExtension || file.mimetype}" is not allowed. Supported types: Images (JPG, PNG, GIF), Documents (PDF, DOC, DOCX), Spreadsheets (XLS, XLSX, CSV), and Other configurable types.`,
      };
    }

    // Check category-specific size limit
    if (file.size > categoryMaxSize) {
      return {
        isValid: false,
        error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds category maximum (${(categoryMaxSize / 1024 / 1024).toFixed(2)}MB)`,
      };
    }

    return { isValid: true };
  }

  /**
   * Generate storage key for file
   */
  private static generateStorageKey(
    itemId: string,
    fileName: string,
    folder?: string,
    version?: number
  ): string {
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const versionSuffix = version ? `_v${version}` : '';
    const uniqueFileName = `${timestamp}_${sanitizedFileName}${versionSuffix}`;
    
    // Build path: folder/itemId/filename or itemId/filename
    if (folder) {
      // Sanitize folder path
      const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/._-]/g, '_').replace(/\/+/g, '/');
      return `${sanitizedFolder}/${itemId}/${uniqueFileName}`;
    }
    
    return `${itemId}/${uniqueFileName}`;
  }

  async uploadFile(
    userId: string,
    itemId: string,
    file: FileLike,
    options?: {
      folder?: string;
      replaceFileId?: string; // If replacing/updating a file, create new version
    }
  ) {
    // Check access
    const accessCheck = await FileService.checkItemAccess(itemId, userId);
    if (!accessCheck.hasAccess) {
      if (accessCheck.itemNotFound) {
        const error = new Error('Item not found');
        (error as any).statusCode = 404;
        throw error;
      }
      const error = new Error('Access denied');
      (error as any).statusCode = 403;
      throw error;
    }

    // Validate file type and size
    const validation = FileService.validateFile(file);
    if (!validation.isValid) {
      const error = new Error(validation.error || 'File validation failed');
      (error as any).statusCode = 400;
      throw error;
    }

    // Get storage provider
    const storageProvider: IStorageProvider = StorageFactory.getDefaultProvider();
    const storageType = APP_CONFIG.UPLOAD.STORAGE_PROVIDER;

    // Handle versioning if replacing a file
    let parentFileId: string | undefined;
    let version = 1;
    let isLatest = true;

    if (options?.replaceFileId) {
      // Get existing file to create a new version
      const existingFile = await prisma.itemFile.findUnique({
        where: { id: options.replaceFileId },
      });

      if (existingFile) {
        const existingFileWithVersion = existingFile as any;
        parentFileId = existingFileWithVersion.parentFileId || existingFile.id;
        
        // Get latest version number
        const latestVersion = await prisma.itemFile.findFirst({
          where: {
            OR: [
              { id: parentFileId },
              { parentFileId: parentFileId as any },
            ],
          } as any,
          orderBy: { version: 'desc' } as any,
        });

        version = ((latestVersion as any)?.version || 0) + 1;

        // Mark previous versions as not latest
        await prisma.itemFile.updateMany({
          where: {
            OR: [
              { id: parentFileId },
              { parentFileId: parentFileId as any },
            ],
          } as any,
          data: { isLatest: false } as any,
        });
      }
    }

    // Generate storage key
    const storageKey = FileService.generateStorageKey(
      itemId,
      file.originalname,
      options?.folder,
      version
    );

    // Upload to storage
    const uploadResult = await storageProvider.upload(
      file.buffer,
      storageKey,
      {
        'original-name': file.originalname,
        'mime-type': file.mimetype,
        'file-size': file.size.toString(),
        'uploaded-by': userId,
        'item-id': itemId,
      }
    );

    // Determine file path (for local storage, use relative path; for S3, use storage key)
    const filePath = storageType === 'local' 
      ? uploadResult.key 
      : uploadResult.key;

    // Create database record
    const itemFile = await prisma.itemFile.create({
      data: {
        itemId,
        fileName: file.originalname,
        filePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
        version: version as any,
        folder: options?.folder || null,
        storageProvider: storageType as any,
        storageKey: uploadResult.key,
        parentFileId: parentFileId || null,
        isLatest: isLatest as any,
      } as any,
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

    return itemFile;
  }

  async getItemFiles(itemId: string, userId: string, filters?: ItemFileQueryFilters) {
    // Check access
    const accessCheck = await FileService.checkItemAccess(itemId, userId);
    if (!accessCheck.hasAccess) {
      if (accessCheck.itemNotFound) {
        const error = new Error('Item not found');
        (error as any).statusCode = 404;
        throw error;
      }
      const error = new Error('Access denied');
      (error as any).statusCode = 403;
      throw error;
    }

    const where: any = {
      itemId: filters?.itemId || itemId,
      ...(filters?.uploadedBy && { uploadedBy: filters.uploadedBy }),
      ...(filters?.folder !== undefined && { folder: filters.folder || null }),
      // Only return latest versions by default
      ...(filters?.includeVersions !== true && { isLatest: true }),
    };

    const files = await prisma.itemFile.findMany({
      where,
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

  async getFileById(fileId: string, userId: string) {
    const file = await prisma.itemFile.findUnique({
      where: { id: fileId },
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

    if (!file) {
      throw new Error('File not found');
    }

    const member = file.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    return file;
  }

  async deleteFile(fileId: string, userId: string) {
    const file = await prisma.itemFile.findUnique({
      where: { id: fileId },
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

    if (!file) {
      throw new Error('File not found');
    }

    const member = file.item.board.workspace.members[0];
    if (!member) {
      throw new Error('Access denied');
    }

    // Only file uploader or workspace admin/owner can delete
    const canDelete =
      file.uploadedBy === userId ||
      member.role === WorkspaceRole.owner ||
      member.role === WorkspaceRole.admin;

    if (!canDelete) {
      throw new Error('Access denied');
    }

    // Delete physical file from storage
    const fileWithStorage = file as any;
    const storageProvider = StorageFactory.getProvider((fileWithStorage.storageProvider || 'local') as 'local' | 's3');
    const storageKey = fileWithStorage.storageKey || file.filePath;
    
    try {
      await storageProvider.delete(storageKey);
    } catch (error) {
      console.error('Error deleting file from storage:', error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete database record
    await prisma.itemFile.delete({
      where: { id: fileId },
    });

    return { success: true };
  }

  async getFileStream(fileId: string, userId: string) {
    const file = await this.getFileById(fileId, userId);
    const fileWithStorage = file as any;
    
    // Get storage provider
    const storageProvider = StorageFactory.getProvider((fileWithStorage.storageProvider || 'local') as 'local' | 's3');
    
    // Use storageKey if available (for S3), otherwise use filePath
    const storageKey = fileWithStorage.storageKey || file.filePath;
    
    const stream = await storageProvider.getStream(storageKey);
    
    return {
      stream,
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSize: file.fileSize,
    };
  }

  async renameFile(fileId: string, newFileName: string, userId: string) {
    const file = await this.getFileById(fileId, userId);
    
    // Only file uploader or workspace admin/owner can rename
    const member = file.item.board.workspace.members[0];
    const canRename =
      file.uploadedBy === userId ||
      member.role === WorkspaceRole.owner ||
      member.role === WorkspaceRole.admin;

    if (!canRename) {
      throw new Error('Access denied');
    }

    // Update database record
    const updated = await prisma.itemFile.update({
      where: { id: fileId },
      data: { fileName: newFileName },
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

    return updated;
  }

  async moveFile(fileId: string, targetItemId: string, userId: string) {
    const file = await this.getFileById(fileId, userId);
    
    // Check access to target item
    const targetAccessCheck = await FileService.checkItemAccess(targetItemId, userId);
    if (!targetAccessCheck.hasAccess) {
      if (targetAccessCheck.itemNotFound) {
        const error = new Error('Target item not found');
        (error as any).statusCode = 404;
        throw error;
      }
      const error = new Error('Access denied to target item');
      (error as any).statusCode = 403;
      throw error;
    }

    // Only file uploader or workspace admin/owner can move
    const member = file.item.board.workspace.members[0];
    const canMove =
      file.uploadedBy === userId ||
      member.role === WorkspaceRole.owner ||
      member.role === WorkspaceRole.admin;

    if (!canMove) {
      throw new Error('Access denied');
    }

    // Move file in storage
    const fileWithStorage = file as any;
    const storageProvider = StorageFactory.getProvider((fileWithStorage.storageProvider || 'local') as 'local' | 's3');
    const oldStorageKey = fileWithStorage.storageKey || file.filePath;
    
    // Generate new storage key for target item
    const newStorageKey = FileService.generateStorageKey(
      targetItemId,
      file.fileName,
      fileWithStorage.folder || undefined,
      fileWithStorage.version || 1
    );

    // Copy file to new location
    try {
      const fileBuffer = await storageProvider.download(oldStorageKey);
      await storageProvider.upload(fileBuffer, newStorageKey);
      
      // Delete old file
      await storageProvider.delete(oldStorageKey);
    } catch (error) {
      console.error('Error moving file in storage:', error);
      throw new Error('Failed to move file in storage');
    }

    // Update database record
    const updated = await prisma.itemFile.update({
      where: { id: fileId },
      data: {
        itemId: targetItemId,
        filePath: newStorageKey,
        storageKey: newStorageKey as any,
      } as any,
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

    return updated;
  }

  async replaceFile(fileId: string, newFile: FileLike, userId: string) {
    const file = await this.getFileById(fileId, userId);
    
    // Only file uploader or workspace admin/owner can replace
    const member = file.item.board.workspace.members[0];
    const canReplace =
      file.uploadedBy === userId ||
      member.role === WorkspaceRole.owner ||
      member.role === WorkspaceRole.admin;

    if (!canReplace) {
      throw new Error('Access denied');
    }

    // Validate new file
    const validation = FileService.validateFile(newFile);
    if (!validation.isValid) {
      const error = new Error(validation.error || 'File validation failed');
      (error as any).statusCode = 400;
      throw error;
    }

    // Use uploadFile with replaceFileId to create a new version
    const fileWithStorage = file as any;
    const newVersion = await this.uploadFile(
      userId,
      file.itemId,
      newFile,
      {
        folder: fileWithStorage.folder || undefined,
        replaceFileId: fileId,
      }
    );

    return newVersion;
  }

  async getFilesForBulkDownload(itemIds: string[], userId: string) {
    // Verify access to all items
    for (const itemId of itemIds) {
      const accessCheck = await FileService.checkItemAccess(itemId, userId);
      if (!accessCheck.hasAccess) {
        if (accessCheck.itemNotFound) {
          const error = new Error(`Item ${itemId} not found`);
          (error as any).statusCode = 404;
          throw error;
        }
        const error = new Error(`Access denied to item ${itemId}`);
        (error as any).statusCode = 403;
        throw error;
      }
    }

    const files = await prisma.itemFile.findMany({
      where: {
        itemId: { in: itemIds },
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        item: {
          select: {
            id: true,
            name: true,
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
   * Get file versions
   */
  async getFileVersions(fileId: string, userId: string) {
    const file = await this.getFileById(fileId, userId);
    const fileWithStorage = file as any;
    
    // Get parent file ID (original file or the file itself)
    const parentFileId = fileWithStorage.parentFileId || file.id;
    
    // Get all versions
    const versions = await prisma.itemFile.findMany({
      where: {
        OR: [
          { id: parentFileId },
          { parentFileId: parentFileId as any },
        ],
      } as any,
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
        version: 'desc' as any,
      } as any,
    });

    return versions;
  }

  /**
   * Get files by folder
   */
  async getFilesByFolder(itemId: string, userId: string, folder?: string) {
    // Check access
    const accessCheck = await FileService.checkItemAccess(itemId, userId);
    if (!accessCheck.hasAccess) {
      if (accessCheck.itemNotFound) {
        const error = new Error('Item not found');
        (error as any).statusCode = 404;
        throw error;
      }
      const error = new Error('Access denied');
      (error as any).statusCode = 403;
      throw error;
    }

    const where: any = {
      itemId,
      ...(folder ? { folder } : { folder: null }),
    };

    const files = await prisma.itemFile.findMany({
      where,
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
   * Get folder structure for an item
   */
  async getFolderStructure(itemId: string, userId: string) {
    // Check access
    const accessCheck = await FileService.checkItemAccess(itemId, userId);
    if (!accessCheck.hasAccess) {
      if (accessCheck.itemNotFound) {
        const error = new Error('Item not found');
        (error as any).statusCode = 404;
        throw error;
      }
      const error = new Error('Access denied');
      (error as any).statusCode = 403;
      throw error;
    }

    const files = await prisma.itemFile.findMany({
      where: { itemId },
      select: {
        id: true,
        folder: true as any,
      } as any,
    });

    // Build folder tree
    const folders: string[] = [];
    files.forEach((file: any) => {
      if (file.folder) {
        // Add folder and all parent folders
        const parts = file.folder.split('/');
        let currentPath = '';
        parts.forEach((part: string) => {
          currentPath = currentPath ? `${currentPath}/${part}` : part;
          if (!folders.includes(currentPath)) {
            folders.push(currentPath);
          }
        });
      }
    });

    return folders.sort();
  }
}

export default new FileService();

