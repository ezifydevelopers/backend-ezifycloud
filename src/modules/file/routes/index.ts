import { Router, Response } from 'express';
import { authenticateToken } from '../../../middleware/auth';
import fileController from '../controllers/fileController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Upload file (handles multipart/form-data with file and itemId)
router.post(
  '/upload',
  (req: any, res: Response, next: any) => {
    // For now, we'll accept files as base64 in JSON body or use a file upload library
    // In production, install multer: npm install multer @types/multer
    // Then use: upload.single('file') middleware
    next();
  },
  (req, res) => fileController.uploadFile(req as any, res)
);

// Get files for an item
router.get(
  '/item/:itemId',
  (req, res) => fileController.getItemFiles(req as any, res)
);

// Get file by ID
router.get(
  '/:fileId',
  (req, res) => fileController.getFileById(req as any, res)
);

// Download file
router.get(
  '/:fileId/download',
  (req, res) => fileController.downloadFile(req as any, res)
);

// Delete file
router.delete(
  '/:fileId',
  (req, res) => fileController.deleteFile(req as any, res)
);

// Rename file
router.patch(
  '/:fileId/rename',
  (req, res) => fileController.renameFile(req as any, res)
);

// Move file to another item
router.patch(
  '/:fileId/move',
  (req, res) => fileController.moveFile(req as any, res)
);

// Replace file (versioning)
router.put(
  '/:fileId/replace',
  (req, res) => fileController.replaceFile(req as any, res)
);

// Bulk download
router.post(
  '/bulk-download',
  (req, res) => fileController.bulkDownload(req as any, res)
);

// Get allowed file types configuration
router.get(
  '/allowed-types',
  (req, res) => fileController.getAllowedFileTypes(req as any, res)
);

// Get file versions
router.get(
  '/:fileId/versions',
  (req, res) => fileController.getFileVersions(req as any, res)
);

// Get files by folder
router.get(
  '/item/:itemId/folder',
  (req, res) => fileController.getFilesByFolder(req as any, res)
);

// Get folder structure
router.get(
  '/item/:itemId/folders',
  (req, res) => fileController.getFolderStructure(req as any, res)
);

export default router;

