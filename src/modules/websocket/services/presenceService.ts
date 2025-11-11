// Presence service for tracking active viewers and editors

import { websocketService } from './websocketService';
import { WebSocketEventType, WebSocketMessage } from '../types';

interface ActiveViewer {
  userId: string;
  userName: string;
  userAvatar?: string;
  viewedAt: Date;
}

interface ActiveEditor {
  userId: string;
  userName: string;
  userAvatar?: string;
  cellId?: string;
  columnId?: string;
  editingAt: Date;
}

export class PresenceService {
  private static itemViewers: Map<string, Map<string, ActiveViewer>> = new Map(); // itemId -> userId -> viewer
  private static itemEditors: Map<string, Map<string, ActiveEditor>> = new Map(); // itemId -> userId -> editor
  private static cellEditors: Map<string, Map<string, ActiveEditor>> = new Map(); // cellId -> userId -> editor

  /**
   * Track user viewing an item
   */
  static trackItemView(itemId: string, userId: string, userName: string, userAvatar?: string): void {
    if (!this.itemViewers.has(itemId)) {
      this.itemViewers.set(itemId, new Map());
    }

    const viewers = this.itemViewers.get(itemId)!;
    viewers.set(userId, {
      userId,
      userName,
      userAvatar,
      viewedAt: new Date(),
    });

    // Broadcast viewer joined event
    this.broadcastViewersChanged(itemId);
  }

  /**
   * Track user stopped viewing an item
   */
  static untrackItemView(itemId: string, userId: string): void {
    const viewers = this.itemViewers.get(itemId);
    if (viewers) {
      viewers.delete(userId);
      if (viewers.size === 0) {
        this.itemViewers.delete(itemId);
      } else {
        this.broadcastViewersChanged(itemId);
      }
    }
  }

  /**
   * Track user editing a cell
   */
  static trackCellEdit(
    itemId: string,
    cellId: string,
    columnId: string,
    userId: string,
    userName: string,
    userAvatar?: string
  ): void {
    // Track item editor
    if (!this.itemEditors.has(itemId)) {
      this.itemEditors.set(itemId, new Map());
    }
    const itemEditors = this.itemEditors.get(itemId)!;
    itemEditors.set(userId, {
      userId,
      userName,
      userAvatar,
      cellId,
      columnId,
      editingAt: new Date(),
    });

    // Track cell editor
    if (!this.cellEditors.has(cellId)) {
      this.cellEditors.set(cellId, new Map());
    }
    const cellEditors = this.cellEditors.get(cellId)!;
    cellEditors.set(userId, {
      userId,
      userName,
      userAvatar,
      cellId,
      columnId,
      editingAt: new Date(),
    });

    // Broadcast editor started event
    this.broadcastEditorsChanged(itemId, cellId);
  }

  /**
   * Track user stopped editing a cell
   */
  static untrackCellEdit(itemId: string, cellId: string, userId: string): void {
    // Remove from item editors
    const itemEditors = this.itemEditors.get(itemId);
    if (itemEditors) {
      itemEditors.delete(userId);
      if (itemEditors.size === 0) {
        this.itemEditors.delete(itemId);
      }
    }

    // Remove from cell editors
    const cellEditors = this.cellEditors.get(cellId);
    if (cellEditors) {
      cellEditors.delete(userId);
      if (cellEditors.size === 0) {
        this.cellEditors.delete(cellId);
      }
    }

    // Broadcast editor stopped event
    this.broadcastEditorsChanged(itemId, cellId);
  }

  /**
   * Get active viewers for an item
   */
  static getItemViewers(itemId: string): ActiveViewer[] {
    const viewers = this.itemViewers.get(itemId);
    if (!viewers) return [];

    // Filter out stale viewers (older than 5 minutes)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    
    return Array.from(viewers.values()).filter(
      viewer => viewer.viewedAt > fiveMinutesAgo
    );
  }

  /**
   * Get active editors for an item
   */
  static getItemEditors(itemId: string): ActiveEditor[] {
    const editors = this.itemEditors.get(itemId);
    if (!editors) return [];

    // Filter out stale editors (older than 2 minutes)
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    
    return Array.from(editors.values()).filter(
      editor => editor.editingAt > twoMinutesAgo
    );
  }

  /**
   * Get active editors for a cell
   */
  static getCellEditors(cellId: string): ActiveEditor[] {
    const editors = this.cellEditors.get(cellId);
    if (!editors) return [];

    // Filter out stale editors (older than 2 minutes)
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    
    return Array.from(editors.values()).filter(
      editor => editor.editingAt > twoMinutesAgo
    );
  }

  /**
   * Cleanup stale presence data
   */
  static cleanupStalePresence(): void {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    // Cleanup stale viewers
    this.itemViewers.forEach((viewers, itemId) => {
      viewers.forEach((viewer, userId) => {
        if (viewer.viewedAt < fiveMinutesAgo) {
          viewers.delete(userId);
        }
      });
      if (viewers.size === 0) {
        this.itemViewers.delete(itemId);
      }
    });

    // Cleanup stale editors
    this.itemEditors.forEach((editors, itemId) => {
      editors.forEach((editor, userId) => {
        if (editor.editingAt < twoMinutesAgo) {
          editors.delete(userId);
        }
      });
      if (editors.size === 0) {
        this.itemEditors.delete(itemId);
      }
    });

    this.cellEditors.forEach((editors, cellId) => {
      editors.forEach((editor, userId) => {
        if (editor.editingAt < twoMinutesAgo) {
          editors.delete(userId);
        }
      });
      if (editors.size === 0) {
        this.cellEditors.delete(cellId);
      }
    });
  }

  /**
   * Broadcast viewers changed event
   */
  private static broadcastViewersChanged(itemId: string): void {
    const viewers = this.getItemViewers(itemId);
    
    // Get boardId from item (would need to fetch from DB in real implementation)
    // For now, we'll broadcast to all connected clients
    const message: WebSocketMessage = {
      type: 'presence:viewers_changed',
      payload: {
        itemId,
        viewers: viewers.map(v => ({
          userId: v.userId,
          userName: v.userName,
          userAvatar: v.userAvatar,
        })),
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all clients (in real implementation, would filter by board)
    // For now, we'll need to get boardId from item
    // This is a simplified version
  }

  /**
   * Broadcast editors changed event
   */
  private static broadcastEditorsChanged(itemId: string, cellId?: string): void {
    const itemEditors = this.getItemEditors(itemId);
    const cellEditors = cellId ? this.getCellEditors(cellId) : [];
    
    const message: WebSocketMessage = {
      type: 'presence:editors_changed',
      payload: {
        itemId,
        cellId,
        itemEditors: itemEditors.map(e => ({
          userId: e.userId,
          userName: e.userName,
          userAvatar: e.userAvatar,
          cellId: e.cellId,
          columnId: e.columnId,
        })),
        cellEditors: cellEditors.map(e => ({
          userId: e.userId,
          userName: e.userName,
          userAvatar: e.userAvatar,
          cellId: e.cellId,
          columnId: e.columnId,
        })),
      },
      timestamp: new Date().toISOString(),
    };

    // Broadcast to all clients (in real implementation, would filter by board)
  }

  /**
   * Cleanup when user disconnects
   */
  static cleanupUserPresence(userId: string): void {
    // Remove user from all viewers
    this.itemViewers.forEach((viewers, itemId) => {
      if (viewers.has(userId)) {
        viewers.delete(userId);
        if (viewers.size === 0) {
          this.itemViewers.delete(itemId);
        } else {
          this.broadcastViewersChanged(itemId);
        }
      }
    });

    // Remove user from all editors
    this.itemEditors.forEach((editors, itemId) => {
      if (editors.has(userId)) {
        editors.delete(userId);
        if (editors.size === 0) {
          this.itemEditors.delete(itemId);
        } else {
          this.broadcastEditorsChanged(itemId);
        }
      }
    });

    this.cellEditors.forEach((editors, cellId) => {
      if (editors.has(userId)) {
        editors.delete(userId);
        if (editors.size === 0) {
          this.cellEditors.delete(cellId);
        }
      }
    });
  }
}

// Start cleanup interval
setInterval(() => {
  PresenceService.cleanupStalePresence();
}, 60000); // Cleanup every minute

