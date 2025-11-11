import prisma from '../../../lib/prisma';
import { WorkspaceRole } from '@prisma/client';
import { ItemFileQueryFilters } from '../types';
import { checkItemAccess } from './fileAccessService';
import { saveFile, deleteFileFromDisk } from './fileStorageService';
import { FileLike } from './fileStorageService';

/**
 * File CRUD operations - functional approach
 */
export const uploadFile = async (
  userId: string,
  itemId: string,
  file: FileLike
) => {
  const hasAccess = await checkItemAccess(itemId, userId);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const filePath = saveFile(itemId, file);

  return await prisma.itemFile.create({
    data: {
      itemId,
      fileName: file.originalname,
      filePath,
      fileSize: file.size,
      mimeType: file.mimetype,
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
};

export const getItemFiles = async (
  itemId: string,
  userId: string,
  filters?: ItemFileQueryFilters
) => {
  const hasAccess = await checkItemAccess(itemId, userId);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  const where: any = {
    itemId: filters?.itemId || itemId,
    ...(filters?.uploadedBy && { uploadedBy: filters.uploadedBy }),
  };

  return await prisma.itemFile.findMany({
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
};

export const getFileById = async (
  fileId: string,
  userId: string
) => {
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
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== 'admin') {
      throw new Error('Access denied');
    }
  }

  return file;
};

export const deleteFile = async (
  fileId: string,
  userId: string
) => {
  const file = await getFileById(fileId, userId);
  const member = file.item.board.workspace.members[0];
  
  const canDelete =
    file.uploadedBy === userId ||
    (member && (member.role === WorkspaceRole.owner || member.role === WorkspaceRole.admin)) ||
    (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === 'admin';

  if (!canDelete) {
    throw new Error('Access denied');
  }

  deleteFileFromDisk(file.filePath);

  await prisma.itemFile.delete({
    where: { id: fileId },
  });

  return { success: true };
};

