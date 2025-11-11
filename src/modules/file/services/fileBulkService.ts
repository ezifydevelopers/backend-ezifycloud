import prisma from '../../../lib/prisma';
import { checkItemAccess } from './fileAccessService';

/**
 * Bulk file operations - functional approach
 */
export const getFilesForBulkDownload = async (
  itemIds: string[],
  userId: string
) => {
  // Verify access to all items
  for (const itemId of itemIds) {
    const hasAccess = await checkItemAccess(itemId, userId);
    if (!hasAccess) {
      throw new Error(`Access denied to item ${itemId}`);
    }
  }

  return await prisma.itemFile.findMany({
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
};

