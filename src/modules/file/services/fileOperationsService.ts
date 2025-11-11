import prisma from '../../../lib/prisma';
import { WorkspaceRole } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { getFileById } from './fileCrudService';
import { checkItemAccess } from './fileAccessService';
import { saveFile, deleteFileFromDisk } from './fileStorageService';
import { FileLike } from './fileStorageService';

/**
 * File operations (rename, move, replace) - functional approach
 */
export const renameFile = async (
  fileId: string,
  newFileName: string,
  userId: string
) => {
  const file = await getFileById(fileId, userId);
  
  const member = file.item.board.workspace.members[0];
  const canRename =
    file.uploadedBy === userId ||
    member.role === WorkspaceRole.owner ||
    member.role === WorkspaceRole.admin;

  if (!canRename) {
    throw new Error('Access denied');
  }

  return await prisma.itemFile.update({
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
};

export const moveFile = async (
  fileId: string,
  targetItemId: string,
  userId: string
) => {
  const file = await getFileById(fileId, userId);
  
  const hasTargetAccess = await checkItemAccess(targetItemId, userId);
  if (!hasTargetAccess) {
    throw new Error('Access denied to target item');
  }

  const member = file.item.board.workspace.members[0];
  const canMove =
    file.uploadedBy === userId ||
    member.role === WorkspaceRole.owner ||
    member.role === WorkspaceRole.admin;

  if (!canMove) {
    throw new Error('Access denied');
  }

  const oldFullPath = path.join(process.cwd(), file.filePath);
  const newUploadDir = path.join(process.cwd(), 'uploads', targetItemId);
  
  if (!fs.existsSync(newUploadDir)) {
    fs.mkdirSync(newUploadDir, { recursive: true });
  }
  
  const timestamp = Date.now();
  const sanitizedFileName = file.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const newFileName = `${timestamp}_${sanitizedFileName}`;
  const newFilePath = path.join(newUploadDir, newFileName);

  if (fs.existsSync(oldFullPath)) {
    fs.renameSync(oldFullPath, newFilePath);
  }

  return await prisma.itemFile.update({
    where: { id: fileId },
    data: {
      itemId: targetItemId,
      filePath: path.relative(process.cwd(), newFilePath).replace(/\\/g, '/'),
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
};

export const replaceFile = async (
  fileId: string,
  newFile: FileLike,
  userId: string
) => {
  const file = await getFileById(fileId, userId);
  
  const member = file.item.board.workspace.members[0];
  const canReplace =
    file.uploadedBy === userId ||
    member.role === WorkspaceRole.owner ||
    member.role === WorkspaceRole.admin;

  if (!canReplace) {
    throw new Error('Access denied');
  }

  deleteFileFromDisk(file.filePath);

  const uploadDir = path.dirname(
    path.join(process.cwd(), file.filePath)
  );
  const timestamp = Date.now();
  const sanitizedOriginalName = newFile.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFileName = `${timestamp}_${sanitizedOriginalName}`;
  const newFilePath = path.join(uploadDir, uniqueFileName);

  fs.writeFileSync(newFilePath, newFile.buffer);

  return await prisma.itemFile.update({
    where: { id: fileId },
    data: {
      fileName: newFile.originalname,
      filePath: path.relative(process.cwd(), newFilePath).replace(/\\/g, '/'),
      fileSize: newFile.size,
      mimeType: newFile.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date(),
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
};

