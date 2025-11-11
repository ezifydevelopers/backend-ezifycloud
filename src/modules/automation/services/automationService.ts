import { PrismaClient, Prisma } from '@prisma/client';
import { CreateAutomationInput, UpdateAutomationInput, AutomationQueryFilters } from '../types';

const prisma = new PrismaClient();

export class AutomationService {
  /**
   * Create a new automation
   */
  static async createAutomation(userId: string, data: CreateAutomationInput) {
    // Verify board access
    const board = await prisma.board.findUnique({
      where: { id: data.boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: board.workspaceId,
        userId,
      },
    });

    if (!workspaceMember || !['owner', 'admin'].includes(workspaceMember.role)) {
      throw new Error('You do not have permission to create automations');
    }

    const automation = await prisma.automation.create({
      data: {
        boardId: data.boardId,
        name: data.name,
        trigger: data.trigger as unknown as Prisma.InputJsonValue,
        actions: data.actions as unknown as Prisma.InputJsonValue,
        conditions: data.conditions ? (data.conditions as unknown as Prisma.InputJsonValue) : {},
        isActive: data.isActive ?? true,
      },
      include: {
        board: true,
      },
    });

    return automation;
  }

  /**
   * Get automations for a board
   */
  static async getAutomations(filters: AutomationQueryFilters) {
    const where: Prisma.AutomationWhereInput = {};

    if (filters.boardId) {
      where.boardId = filters.boardId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const [automations, total] = await Promise.all([
      prisma.automation.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          board: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.automation.count({ where }),
    ]);

    return {
      data: automations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get automation by ID
   */
  static async getAutomationById(automationId: string) {
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      include: {
        board: true,
      },
    });

    if (!automation) {
      throw new Error('Automation not found');
    }

    return automation;
  }

  /**
   * Update automation
   */
  static async updateAutomation(userId: string, automationId: string, data: UpdateAutomationInput) {
    const automation = await this.getAutomationById(automationId);

    // Verify board access
    const board = await prisma.board.findUnique({
      where: { id: automation.boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: board.workspaceId,
        userId,
      },
    });

    if (!workspaceMember || !['owner', 'admin'].includes(workspaceMember.role)) {
      throw new Error('You do not have permission to update automations');
    }

    const updateData: Prisma.AutomationUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.trigger !== undefined) {
      updateData.trigger = data.trigger as unknown as Prisma.InputJsonValue;
    }

    if (data.actions !== undefined) {
      updateData.actions = data.actions as unknown as Prisma.InputJsonValue;
    }

    if (data.conditions !== undefined) {
      updateData.conditions = data.conditions as unknown as Prisma.InputJsonValue;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    const updated = await prisma.automation.update({
      where: { id: automationId },
      data: updateData,
      include: {
        board: true,
      },
    });

    return updated;
  }

  /**
   * Delete automation
   */
  static async deleteAutomation(userId: string, automationId: string) {
    const automation = await this.getAutomationById(automationId);

    // Verify board access
    const board = await prisma.board.findUnique({
      where: { id: automation.boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: board.workspaceId,
        userId,
      },
    });

    if (!workspaceMember || !['owner', 'admin'].includes(workspaceMember.role)) {
      throw new Error('You do not have permission to delete automations');
    }

    await prisma.automation.delete({
      where: { id: automationId },
    });

    return { success: true };
  }

  /**
   * Toggle automation active status
   */
  static async toggleAutomation(userId: string, automationId: string, isActive: boolean) {
    const automation = await this.getAutomationById(automationId);

    // Verify board access
    const board = await prisma.board.findUnique({
      where: { id: automation.boardId },
    });

    if (!board) {
      throw new Error('Board not found');
    }

    // Check workspace access
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: board.workspaceId,
        userId,
      },
    });

    if (!workspaceMember || !['owner', 'admin'].includes(workspaceMember.role)) {
      throw new Error('You do not have permission to modify automations');
    }

    const updated = await prisma.automation.update({
      where: { id: automationId },
      data: { isActive },
      include: {
        board: true,
      },
    });

    return updated;
  }

  /**
   * Execute automation (called by automation engine)
   */
  static async executeAutomation(automationId: string, itemId: string, context: Record<string, unknown>) {
    const automation = await this.getAutomationById(automationId);

    if (!automation.isActive) {
      return { executed: false, reason: 'Automation is disabled' };
    }

    // Check conditions
    if (automation.conditions && Object.keys(automation.conditions as Record<string, unknown>).length > 0) {
      const conditions = automation.conditions as { type?: string; conditions?: Array<Record<string, unknown>> };
      if (conditions.conditions) {
        const results = conditions.conditions.map(cond => {
          // Evaluate condition logic here
          // This is simplified - in production, implement full condition evaluation
          return true;
        });

        const shouldExecute = conditions.type === 'and' 
          ? results.every(r => r)
          : results.some(r => r);

        if (!shouldExecute) {
          return { executed: false, reason: 'Conditions not met' };
        }
      }
    }

    // Execute actions
    const actions = automation.actions as Array<{ type: string; config?: Record<string, unknown> }>;
    const results = [];

    for (const action of actions) {
      try {
        await this.executeAction(action, itemId, context);
        results.push({ action: action.type, status: 'success' });
      } catch (error) {
        results.push({ 
          action: action.type, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return { executed: true, results };
  }

  /**
   * Execute a single action
   */
  private static async executeAction(
    action: { type: string; config?: Record<string, unknown> },
    itemId: string,
    context: Record<string, unknown>
  ) {
    const { type, config } = action;

    switch (type) {
      case 'change_status':
      case 'set_status':
        // Both actions set status to a specific value
        if (config?.status) {
          await prisma.item.update({
            where: { id: itemId },
            data: { status: String(config.status) },
          });
        }
        break;

      case 'move_to_board':
        if (config?.targetBoardId) {
          // Get the item to move
          const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
              cells: true,
            },
          });

          if (!item) {
            throw new Error('Item not found');
          }

          // Verify target board exists
          const targetBoard = await prisma.board.findUnique({
            where: { id: String(config.targetBoardId) },
          });

          if (!targetBoard) {
            throw new Error('Target board not found');
          }

          // Get old boardId for activity logging
          const oldBoardId = item.boardId;

          // Update item's boardId
          await prisma.item.update({
            where: { id: itemId },
            data: {
              boardId: String(config.targetBoardId),
            },
          });

          // Log activity for the move
          try {
            const userId = (context?.userId as string) || item.createdBy;
            await prisma.activity.create({
              data: {
                itemId: item.id,
                userId,
                action: 'field_updated',
                fieldName: 'board',
                oldValue: oldBoardId as any,
                newValue: String(config.targetBoardId) as any,
                details: {
                  action: 'moved_to_board',
                  oldBoardId,
                  newBoardId: String(config.targetBoardId),
                } as any,
              },
            });
          } catch (error) {
            console.error('Error logging move activity:', error);
            // Don't fail the move if activity logging fails
          }

          // Note: Cells remain with the item, but columns may need to be mapped
          // For now, we just move the item. Column mapping can be handled separately
        }
        break;

      case 'update_field':
        if (config?.columnId && config?.value !== undefined) {
          await prisma.cell.upsert({
            where: {
              itemId_columnId: {
                itemId,
                columnId: String(config.columnId),
              },
            },
            update: {
              value: config.value as Prisma.InputJsonValue,
            },
            create: {
              itemId,
              columnId: String(config.columnId),
              value: config.value as Prisma.InputJsonValue,
            },
          });
        }
        break;

      case 'clear_field':
        if (config?.columnId) {
          await prisma.cell.deleteMany({
            where: {
              itemId,
              columnId: String(config.columnId),
            },
          });
        }
        break;

      case 'calculate_formula':
        if (config?.columnId && config?.formula) {
          // Get item data for formula evaluation
          const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
            },
          });

          if (item) {
            // Build context for formula evaluation
            const formulaContext: Record<string, unknown> = {
              itemId: item.id,
              name: item.name,
              status: item.status,
            };
            item.cells.forEach(cell => {
              formulaContext[cell.columnId] = cell.value;
              formulaContext[cell.column.name.toLowerCase()] = cell.value;
            });

            // Simple formula evaluation (supports basic math and field references)
            // For production, use a proper formula parser like math.js
            let calculatedValue: unknown;
            try {
              // Replace field references with actual values
              let formula = String(config.formula);
              for (const [key, value] of Object.entries(formulaContext)) {
                const regex = new RegExp(`\\{${key}\\}`, 'gi');
                formula = formula.replace(regex, String(value || 0));
              }

              // Evaluate the formula (basic math only for now)
              // In production, use a safer evaluation method
              calculatedValue = eval(`(${formula})`);
            } catch (error) {
              console.error('Error calculating formula:', error);
              throw new Error(`Invalid formula: ${config.formula}`);
            }

            // Save calculated value
            await prisma.cell.upsert({
              where: {
                itemId_columnId: {
                  itemId,
                  columnId: String(config.columnId),
                },
              },
              update: {
                value: calculatedValue as Prisma.InputJsonValue,
              },
              create: {
                itemId,
                columnId: String(config.columnId),
                value: calculatedValue as Prisma.InputJsonValue,
              },
            });
          }
        }
        break;

      case 'copy_field':
        if (config?.columnId && config?.sourceColumnId) {
          const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
              cells: {
                where: {
                  columnId: String(config.sourceColumnId),
                },
              },
            },
          });

          if (item && item.cells.length > 0) {
            const sourceValue = item.cells[0].value;
            await prisma.cell.upsert({
              where: {
                itemId_columnId: {
                  itemId,
                  columnId: String(config.columnId),
                },
              },
              update: {
                value: sourceValue as Prisma.InputJsonValue,
              },
              create: {
                itemId,
                columnId: String(config.columnId),
                value: sourceValue as Prisma.InputJsonValue,
              },
            });
          }
        }
        break;

      case 'assign_user':
        if (config?.columnId && config?.userIds) {
          const userIds = Array.isArray(config.userIds) ? config.userIds : [config.userIds];
          await prisma.cell.upsert({
            where: {
              itemId_columnId: {
                itemId,
                columnId: String(config.columnId),
              },
            },
            update: {
              value: userIds as Prisma.InputJsonValue,
            },
            create: {
              itemId,
              columnId: String(config.columnId),
              value: userIds as Prisma.InputJsonValue,
            },
          });
        }
        break;

      case 'send_notification':
        // Send in-app notification
        if (config?.userIds && config?.title && config?.message) {
          try {
            const { NotificationService } = await import('../../notification/services/notificationService');
            const userIds = Array.isArray(config.userIds) ? config.userIds : [config.userIds];
            
            // Get item for link
            const item = await prisma.item.findUnique({
              where: { id: itemId },
              select: {
                id: true,
                name: true,
                boardId: true,
                board: {
                  select: {
                    workspaceId: true,
                  },
                },
              },
            });

            const link = (typeof config?.link === 'string' ? config.link : undefined) || (item ? `/boards/${item.boardId}/items/${item.id}` : undefined);

            for (const userId of userIds) {
              await NotificationService.createNotification({
                userId,
                type: (config?.notificationType as any) || 'approval_requested',
                title: String(config.title),
                message: String(config.message),
                link,
                metadata: {
                  itemId,
                  itemName: item?.name,
                  boardId: item?.boardId,
                  workspaceId: item?.board?.workspaceId,
                  automation: true,
                },
              });
            }
          } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
          }
        }
        break;

      case 'notify_users':
        // Notify specific users
        if (config?.userIds && config?.title && config?.message) {
          try {
            const { NotificationService } = await import('../../notification/services/notificationService');
            const userIds = Array.isArray(config.userIds) ? config.userIds : [config.userIds];
            
            const item = await prisma.item.findUnique({
              where: { id: itemId },
              select: {
                id: true,
                name: true,
                boardId: true,
                board: {
                  select: {
                    workspaceId: true,
                  },
                },
              },
            });

            const link = (typeof config?.link === 'string' ? config.link : undefined) || (item ? `/boards/${item.boardId}/items/${item.id}` : undefined);

            for (const userId of userIds) {
              await NotificationService.createNotification({
                userId,
                type: (config?.notificationType as any) || 'approval_requested',
                title: String(config.title),
                message: String(config.message),
                link,
                metadata: {
                  itemId,
                  itemName: item?.name,
                  boardId: item?.boardId,
                  workspaceId: item?.board?.workspaceId,
                  automation: true,
                },
              });
            }
          } catch (error) {
            console.error('Error notifying users:', error);
            throw error;
          }
        }
        break;

      case 'notify_assignees':
        // Notify users assigned to the item
        try {
          const { NotificationService } = await import('../../notification/services/notificationService');
          
          // Get item with cells to find PEOPLE columns
          const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
              board: {
                select: {
                  workspaceId: true,
                },
              },
            },
          });

          if (!item) {
            throw new Error('Item not found');
          }

          // Collect all assigned user IDs from PEOPLE columns
          const assignedUserIds = new Set<string>();
          item.cells.forEach(cell => {
            if (cell.column.type === 'PEOPLE' && cell.value) {
              const userIds = Array.isArray(cell.value) 
                ? cell.value.map(id => String(id))
                : [String(cell.value)];
              userIds.forEach(id => assignedUserIds.add(id));
            }
          });

          if (assignedUserIds.size > 0 && config?.title && config?.message) {
            const link = (typeof config?.link === 'string' ? config.link : undefined) || `/boards/${item.boardId}/items/${item.id}`;
            
            for (const userId of assignedUserIds) {
              await NotificationService.createNotification({
                userId,
                type: (config?.notificationType as any) || 'assignment',
                title: String(config.title),
                message: String(config.message),
                link,
                metadata: {
                  itemId,
                  itemName: item.name,
                  boardId: item.boardId,
                  workspaceId: item.board.workspaceId,
                  automation: true,
                },
              });
            }
          }
        } catch (error) {
          console.error('Error notifying assignees:', error);
          throw error;
        }
        break;

      case 'send_email':
        // Email sending integration
        // Note: This is a placeholder - actual email sending would require email service integration
        if (config?.email || config?.emails) {
          const emails = config?.emails 
            ? (Array.isArray(config.emails) ? config.emails : [config.emails])
            : [config?.email];
          
          const subject = config?.subject || 'Automation Notification';
          const message = config?.message || 'You have a new notification from an automation.';
          
          // In production, integrate with email service (SendGrid, AWS SES, etc.)
          console.log('Send email:', {
            to: emails,
            subject,
            message,
            itemId,
          });
          
          // Placeholder for email service integration
          // await EmailService.sendEmail({
          //   to: emails,
          //   subject,
          //   html: message,
          // });
        }
        break;

      case 'call_webhook':
        if (config?.webhookUrl) {
          try {
            // Get item data to include in webhook body
            const item = await prisma.item.findUnique({
              where: { id: itemId },
              include: {
                cells: {
                  include: {
                    column: true,
                  },
                },
                board: {
                  select: {
                    id: true,
                    name: true,
                    workspaceId: true,
                  },
                },
              },
            });

            // Build webhook body with item data
            const defaultBody = item ? {
              itemId: item.id,
              itemName: item.name,
              status: item.status,
              boardId: item.boardId,
              boardName: item.board.name,
              workspaceId: item.board.workspaceId,
              cells: item.cells.reduce((acc, cell) => {
                acc[cell.column.name] = cell.value;
                return acc;
              }, {} as Record<string, unknown>),
              timestamp: new Date().toISOString(),
            } : { itemId };

            const body = config.webhookBody 
              ? { ...defaultBody, ...config.webhookBody }
              : defaultBody;

            const response = await fetch(String(config.webhookUrl), {
              method: (config.webhookMethod as string) || 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(config.webhookHeaders as Record<string, string> || {}),
              },
              body: JSON.stringify(body),
            });

            if (!response.ok) {
              throw new Error(`Webhook call failed: ${response.statusText}`);
            }
          } catch (error) {
            console.error('Webhook execution error:', error);
            throw error;
          }
        }
        break;

      case 'api_call':
        // Generic API call action
        if (config?.apiUrl) {
          try {
            const item = await prisma.item.findUnique({
              where: { id: itemId },
              include: {
                cells: {
                  include: {
                    column: true,
                  },
                },
              },
            });

            const defaultBody = item ? {
              itemId: item.id,
              itemName: item.name,
              status: item.status,
              cells: item.cells.reduce((acc, cell) => {
                acc[cell.column.name] = cell.value;
                return acc;
              }, {} as Record<string, unknown>),
            } : { itemId };

            const body = config.apiBody 
              ? { ...defaultBody, ...config.apiBody }
              : defaultBody;

            const response = await fetch(String(config.apiUrl), {
              method: (config.apiMethod as string) || 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(config.apiHeaders as Record<string, string> || {}),
              },
              body: JSON.stringify(body),
            });

            if (!response.ok) {
              throw new Error(`API call failed: ${response.statusText}`);
            }
          } catch (error) {
            console.error('API call execution error:', error);
            throw error;
          }
        }
        break;

      case 'create_external_task':
        // Create task in external system (placeholder - requires integration)
        if (config?.externalSystem && config?.externalTaskData) {
          // In production, integrate with external systems (Jira, Asana, Trello, etc.)
          console.log('Create external task:', {
            system: config.externalSystem,
            data: config.externalTaskData,
            itemId,
          });
          
          // Placeholder for external system integration
          // await ExternalSystemService.createTask(config.externalSystem, {
          //   ...config.externalTaskData,
          //   itemId,
          // });
        }
        break;

      case 'update_external_system':
        // Update external system (placeholder - requires integration)
        if (config?.externalSystem && config?.externalUpdateData) {
          console.log('Update external system:', {
            system: config.externalSystem,
            data: config.externalUpdateData,
            itemId,
          });
          
          // Placeholder for external system integration
          // await ExternalSystemService.update(config.externalSystem, {
          //   ...config.externalUpdateData,
          //   itemId,
          // });
        }
        break;

      case 'create_item':
        if (config?.targetBoardId) {
          const item = await prisma.item.findUnique({
            where: { id: itemId },
            include: {
              cells: {
                include: {
                  column: true,
                },
              },
            },
          });

          if (item) {
            // Use userId from context if available, otherwise use the original item's creator
            const userId = (context?.userId as string) || item.createdBy;
            
            // Determine item name
            const newItemName = config?.itemName 
              ? String(config.itemName)
              : `Automated: ${item.name}`;
            
            // Create new item
            const newItem = await prisma.item.create({
              data: {
                boardId: String(config.targetBoardId),
                name: newItemName,
                status: config?.status ? String(config.status) : item.status,
                createdBy: userId,
              },
            });

            // Copy cells if requested
            if (config?.copyCells === true && item.cells.length > 0) {
              // Get columns from target board to map by name
              const targetBoardColumns = await prisma.column.findMany({
                where: { boardId: String(config.targetBoardId) },
              });

              const columnMap = new Map(
                targetBoardColumns.map(col => [col.name.toLowerCase(), col.id])
              );

              // Copy cells, mapping by column name
              const cellsToCreate = [];
              for (const cell of item.cells) {
                const columnName = cell.column.name.toLowerCase();
                const targetColumn = targetBoardColumns.find(
                  col => col.name.toLowerCase() === columnName
                );
                
                if (targetColumn && targetColumn.type === cell.column.type) {
                  // Only copy if column exists in target board and has same type
                  cellsToCreate.push({
                    itemId: newItem.id,
                    columnId: targetColumn.id,
                    value: cell.value,
                  });
                }
              }

              if (cellsToCreate.length > 0) {
                await prisma.cell.createMany({
                  data: cellsToCreate.map(cell => ({
                    ...cell,
                    value: cell.value as Prisma.InputJsonValue,
                  })),
                });
              }
            }

            // Note: Automations for the newly created item will be triggered
            // through the normal item creation flow if needed
            // We avoid circular imports by not triggering here
          }
        }
        break;

      default:
        console.warn(`Unknown action type: ${type}`);
    }
  }
}

