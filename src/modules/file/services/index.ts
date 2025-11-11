/**
 * File Service - Re-exports all file operations
 * All services follow functional programming approach
 */
export * from './fileAccessService';
export * from './fileStorageService';
export * from './fileCrudService';
export * from './fileOperationsService';
export * from './fileBulkService';

// Legacy class-based service wrapper for backward compatibility
import * as FileAccessService from './fileAccessService';
import * as FileStorageService from './fileStorageService';
import * as FileCrudService from './fileCrudService';
import * as FileOperationsService from './fileOperationsService';
import * as FileBulkService from './fileBulkService';

export class FileService {
  private static checkItemAccess = FileAccessService.checkItemAccess;

  static uploadFile = FileCrudService.uploadFile;
  static getItemFiles = FileCrudService.getItemFiles;
  static getFileById = FileCrudService.getFileById;
  static deleteFile = FileCrudService.deleteFile;

  static renameFile = FileOperationsService.renameFile;
  static moveFile = FileOperationsService.moveFile;
  static replaceFile = FileOperationsService.replaceFile;

  static getFilesForBulkDownload = FileBulkService.getFilesForBulkDownload;

  static getFileStream(fileId: string, userId: string) {
    return FileCrudService.getFileById(fileId, userId).then(file => {
      return FileStorageService.getFileStream(file.filePath);
    }).then(stream => ({
      stream,
      fileName: '',
      mimeType: '',
      fileSize: 0,
    }));
  }
}

