import prisma from '../../../lib/prisma';

/**
 * File access validation - functional approach
 */
export const checkItemAccess = async (
  itemId: string,
  userId: string
): Promise<boolean> => {
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
    return false;
  }

  // If user created the item, allow access
  if (item.creator?.id === userId) return true;

  const member = item.board.workspace.members[0];
  if (member) return true;

  // Allow platform admins to access files across workspaces
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === 'admin';
};

