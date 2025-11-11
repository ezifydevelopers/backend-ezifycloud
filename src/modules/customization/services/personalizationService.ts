import prisma from '../../../lib/prisma';
import { FavoriteBoard, RecentBoard, CustomView, UserPreferences } from '../types';

export class PersonalizationService {
  /**
   * Add board to favorites
   */
  static async addFavoriteBoard(userId: string, boardId: string): Promise<FavoriteBoard> {
    // Check if already favorited
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM user_favorites 
      WHERE user_id = ${userId} AND board_id = ${boardId}
    `;

    if (existing.length > 0) {
      throw new Error('Board is already in favorites');
    }

    // Get current max position
    const maxPosition = await prisma.$queryRaw<Array<{ max: number | null }>>`
      SELECT MAX(position) as max FROM user_favorites WHERE user_id = ${userId}
    `;

    const position = (maxPosition[0]?.max ?? -1) + 1;

    // Insert favorite
    await prisma.$executeRaw`
      INSERT INTO user_favorites (id, user_id, board_id, position, created_at)
      VALUES (gen_random_uuid(), ${userId}, ${boardId}, ${position}, NOW())
    `;

    return this.getFavoriteBoard(userId, boardId);
  }

  /**
   * Remove board from favorites
   */
  static async removeFavoriteBoard(userId: string, boardId: string): Promise<void> {
    await prisma.$executeRaw`
      DELETE FROM user_favorites 
      WHERE user_id = ${userId} AND board_id = ${boardId}
    `;
  }

  /**
   * Get favorite board
   */
  static async getFavoriteBoard(userId: string, boardId: string): Promise<FavoriteBoard> {
    const result = await prisma.$queryRaw<Array<{
      id: string;
      user_id: string;
      board_id: string;
      position: number;
      created_at: Date;
      board_name: string;
      board_color: string | null;
      board_icon: string | null;
      board_workspace_id: string;
    }>>`
      SELECT 
        uf.id,
        uf.user_id,
        uf.board_id,
        uf.position,
        uf.created_at,
        b.name as board_name,
        b.color as board_color,
        b.icon as board_icon,
        b.workspace_id as board_workspace_id
      FROM user_favorites uf
      JOIN boards b ON uf.board_id = b.id
      WHERE uf.user_id = ${userId} AND uf.board_id = ${boardId}
    `;

    if (result.length === 0) {
      throw new Error('Favorite board not found');
    }

    const row = result[0];
    return {
      id: row.id,
      userId: row.user_id,
      boardId: row.board_id,
      position: row.position,
      createdAt: row.created_at.toISOString(),
      board: {
        id: row.board_id,
        name: row.board_name,
        color: row.board_color || undefined,
        icon: row.board_icon || undefined,
        workspaceId: row.board_workspace_id,
      },
    };
  }

  /**
   * Get all favorite boards for user
   */
  static async getFavoriteBoards(userId: string): Promise<FavoriteBoard[]> {
    const results = await prisma.$queryRaw<Array<{
      id: string;
      user_id: string;
      board_id: string;
      position: number;
      created_at: Date;
      board_name: string;
      board_color: string | null;
      board_icon: string | null;
      board_workspace_id: string;
    }>>`
      SELECT 
        uf.id,
        uf.user_id,
        uf.board_id,
        uf.position,
        uf.created_at,
        b.name as board_name,
        b.color as board_color,
        b.icon as board_icon,
        b.workspace_id as board_workspace_id
      FROM user_favorites uf
      JOIN boards b ON uf.board_id = b.id
      WHERE uf.user_id = ${userId} AND b.deleted_at IS NULL
      ORDER BY uf.position ASC
    `;

    return results.map(row => ({
      id: row.id,
      userId: row.user_id,
      boardId: row.board_id,
      position: row.position,
      createdAt: row.created_at.toISOString(),
      board: {
        id: row.board_id,
        name: row.board_name,
        color: row.board_color || undefined,
        icon: row.board_icon || undefined,
        workspaceId: row.board_workspace_id,
      },
    }));
  }

  /**
   * Reorder favorite boards
   */
  static async reorderFavorites(userId: string, boardIds: string[]): Promise<void> {
    for (let i = 0; i < boardIds.length; i++) {
      await prisma.$executeRaw`
        UPDATE user_favorites 
        SET position = ${i}
        WHERE user_id = ${userId} AND board_id = ${boardIds[i]}
      `;
    }
  }

  /**
   * Track board access (for recent boards)
   */
  static async trackBoardAccess(userId: string, boardId: string): Promise<void> {
    // Check if exists
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM user_recent_boards 
      WHERE user_id = ${userId} AND board_id = ${boardId}
    `;

    if (existing.length > 0) {
      // Update existing
      await prisma.$executeRaw`
        UPDATE user_recent_boards 
        SET last_accessed_at = NOW(), access_count = access_count + 1
        WHERE user_id = ${userId} AND board_id = ${boardId}
      `;
    } else {
      // Insert new
      await prisma.$executeRaw`
        INSERT INTO user_recent_boards (id, user_id, board_id, last_accessed_at, access_count)
        VALUES (gen_random_uuid(), ${userId}, ${boardId}, NOW(), 1)
      `;
    }
  }

  /**
   * Get recent boards
   */
  static async getRecentBoards(userId: string, limit: number = 10): Promise<RecentBoard[]> {
    const results = await prisma.$queryRaw<Array<{
      id: string;
      user_id: string;
      board_id: string;
      last_accessed_at: Date;
      access_count: number;
      board_name: string;
      board_color: string | null;
      board_icon: string | null;
      board_workspace_id: string;
    }>>`
      SELECT 
        urb.id,
        urb.user_id,
        urb.board_id,
        urb.last_accessed_at,
        urb.access_count,
        b.name as board_name,
        b.color as board_color,
        b.icon as board_icon,
        b.workspace_id as board_workspace_id
      FROM user_recent_boards urb
      JOIN boards b ON urb.board_id = b.id
      WHERE urb.user_id = ${userId} AND b.deleted_at IS NULL
      ORDER BY urb.last_accessed_at DESC
      LIMIT ${limit}
    `;

    return results.map(row => ({
      id: row.id,
      userId: row.user_id,
      boardId: row.board_id,
      lastAccessedAt: row.last_accessed_at.toISOString(),
      accessCount: row.access_count,
      board: {
        id: row.board_id,
        name: row.board_name,
        color: row.board_color || undefined,
        icon: row.board_icon || undefined,
        workspaceId: row.board_workspace_id,
      },
    }));
  }

  /**
   * Create custom view
   */
  static async createCustomView(
    userId: string,
    boardId: string,
    name: string,
    viewType: string,
    config: Record<string, unknown>,
    description?: string
  ): Promise<CustomView> {
    const result = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO custom_views (id, user_id, board_id, name, description, view_type, config, created_at, updated_at)
      VALUES (gen_random_uuid(), ${userId}, ${boardId}, ${name}, ${description || null}, ${viewType}, ${JSON.stringify(config)}::jsonb, NOW(), NOW())
      RETURNING id
    `;

    return this.getCustomView(result[0].id);
  }

  /**
   * Get custom view
   */
  static async getCustomView(viewId: string): Promise<CustomView> {
    const result = await prisma.$queryRaw<Array<{
      id: string;
      user_id: string;
      board_id: string;
      name: string;
      description: string | null;
      view_type: string;
      config: unknown;
      is_default: boolean;
      created_at: Date;
      updated_at: Date;
    }>>`
      SELECT * FROM custom_views WHERE id = ${viewId}
    `;

    if (result.length === 0) {
      throw new Error('Custom view not found');
    }

    const row = result[0];
    return {
      id: row.id,
      userId: row.user_id,
      boardId: row.board_id,
      name: row.name,
      description: row.description || undefined,
      viewType: row.view_type as CustomView['viewType'],
      config: row.config as CustomView['config'],
      isDefault: row.is_default,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  /**
   * Get custom views for board
   */
  static async getCustomViews(userId: string, boardId: string): Promise<CustomView[]> {
    const results = await prisma.$queryRaw<Array<{
      id: string;
      user_id: string;
      board_id: string;
      name: string;
      description: string | null;
      view_type: string;
      config: unknown;
      is_default: boolean;
      created_at: Date;
      updated_at: Date;
    }>>`
      SELECT * FROM custom_views 
      WHERE user_id = ${userId} AND board_id = ${boardId}
      ORDER BY is_default DESC, created_at DESC
    `;

    return results.map(row => ({
      id: row.id,
      userId: row.user_id,
      boardId: row.board_id,
      name: row.name,
      description: row.description || undefined,
      viewType: row.view_type as CustomView['viewType'],
      config: row.config as CustomView['config'],
      isDefault: row.is_default,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  /**
   * Update custom view
   */
  static async updateCustomView(
    viewId: string,
    updates: {
      name?: string;
      description?: string;
      config?: Record<string, unknown>;
      isDefault?: boolean;
    }
  ): Promise<CustomView> {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (updates.name !== undefined) {
      setClauses.push(`name = $${values.length + 1}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      setClauses.push(`description = $${values.length + 1}`);
      values.push(updates.description);
    }
    if (updates.config !== undefined) {
      setClauses.push(`config = $${values.length + 1}::jsonb`);
      values.push(JSON.stringify(updates.config));
    }
    if (updates.isDefault !== undefined) {
      setClauses.push(`is_default = $${values.length + 1}`);
      values.push(updates.isDefault);
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(viewId);

    await prisma.$executeRawUnsafe(
      `UPDATE custom_views SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
      ...values
    );

    return this.getCustomView(viewId);
  }

  /**
   * Delete custom view
   */
  static async deleteCustomView(viewId: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM custom_views WHERE id = ${viewId}`;
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const result = await prisma.$queryRaw<Array<{
      preferences: unknown;
      updated_at: Date;
    }>>`
      SELECT preferences, updated_at FROM user_preferences WHERE user_id = ${userId}
    `;

    if (result.length === 0) {
      // Return defaults
      return {
        userId,
        uiPreferences: {
          theme: 'system',
          sidebarCollapsed: false,
          density: 'comfortable',
          fontSize: 'medium',
          showAvatars: true,
          showTimestamps: true,
        },
        notificationPreferences: {
          emailNotifications: true,
          pushNotifications: true,
          itemUpdates: true,
          comments: true,
          mentions: true,
          approvals: true,
          dueDates: true,
          weeklyDigest: false,
        },
        boardPreferences: {
          defaultView: 'table',
          showCompletedItems: true,
          autoSave: true,
        },
        updatedAt: new Date().toISOString(),
      };
    }

    const prefs = result[0].preferences as UserPreferences['uiPreferences'] & UserPreferences['notificationPreferences'] & UserPreferences['boardPreferences'];
    return {
      userId,
      uiPreferences: {
        theme: prefs.theme || 'system',
        sidebarCollapsed: prefs.sidebarCollapsed || false,
        density: prefs.density || 'comfortable',
        fontSize: prefs.fontSize || 'medium',
        showAvatars: prefs.showAvatars !== undefined ? prefs.showAvatars : true,
        showTimestamps: prefs.showTimestamps !== undefined ? prefs.showTimestamps : true,
      },
      notificationPreferences: {
        emailNotifications: prefs.emailNotifications !== undefined ? prefs.emailNotifications : true,
        pushNotifications: prefs.pushNotifications !== undefined ? prefs.pushNotifications : true,
        itemUpdates: prefs.itemUpdates !== undefined ? prefs.itemUpdates : true,
        comments: prefs.comments !== undefined ? prefs.comments : true,
        mentions: prefs.mentions !== undefined ? prefs.mentions : true,
        approvals: prefs.approvals !== undefined ? prefs.approvals : true,
        dueDates: prefs.dueDates !== undefined ? prefs.dueDates : true,
        weeklyDigest: prefs.weeklyDigest || false,
      },
      boardPreferences: {
        defaultView: prefs.defaultView || 'table',
        showCompletedItems: prefs.showCompletedItems !== undefined ? prefs.showCompletedItems : true,
        autoSave: prefs.autoSave !== undefined ? prefs.autoSave : true,
      },
      updatedAt: result[0].updated_at.toISOString(),
    };
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM user_preferences WHERE user_id = ${userId}
    `;

    const prefsData = {
      ...preferences.uiPreferences,
      ...preferences.notificationPreferences,
      ...preferences.boardPreferences,
    };

    if (existing.length > 0) {
      await prisma.$executeRaw`
        UPDATE user_preferences 
        SET preferences = ${JSON.stringify(prefsData)}::jsonb, updated_at = NOW()
        WHERE user_id = ${userId}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO user_preferences (id, user_id, preferences, updated_at)
        VALUES (gen_random_uuid(), ${userId}, ${JSON.stringify(prefsData)}::jsonb, NOW())
      `;
    }

    return this.getUserPreferences(userId);
  }
}

