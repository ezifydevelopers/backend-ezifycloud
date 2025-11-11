// WebSocket types and interfaces

import { WebSocket as WS } from 'ws';

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: string;
  userId?: string;
  boardId?: string;
  workspaceId?: string;
}

export interface WebSocketClient {
  id: string;
  userId: string;
  socket: WS; // WebSocket instance
  connectedAt: Date;
  lastPing: Date;
  subscribedBoards: Set<string>;
  subscribedWorkspaces: Set<string>;
}

export enum WebSocketEventType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  PING = 'ping',
  PONG = 'pong',
  
  // Item events
  ITEM_CREATED = 'item:created',
  ITEM_UPDATED = 'item:updated',
  ITEM_DELETED = 'item:deleted',
  ITEM_STATUS_CHANGED = 'item:status_changed',
  
  // Comment events
  COMMENT_ADDED = 'comment:added',
  COMMENT_UPDATED = 'comment:updated',
  COMMENT_DELETED = 'comment:deleted',
  
  // Approval events
  APPROVAL_REQUESTED = 'approval:requested',
  APPROVAL_APPROVED = 'approval:approved',
  APPROVAL_REJECTED = 'approval:rejected',
  
  // User events
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
  
  // Board events
  BOARD_UPDATED = 'board:updated',
  COLUMN_UPDATED = 'column:updated',
  COLUMN_DELETED = 'column:deleted',
  
  // Presence events
  PRESENCE_VIEWERS_CHANGED = 'presence:viewers_changed',
  PRESENCE_EDITORS_CHANGED = 'presence:editors_changed',
  
  // Notification events
  NOTIFICATION_NEW = 'notification:new',
  NOTIFICATION_READ = 'notification:read',
  
  // Conflict events
  CONFLICT_DETECTED = 'conflict:detected',
  
  // Error events
  ERROR = 'error',
}

export interface ItemCreatedPayload {
  item: {
    id: string;
    name: string;
    boardId: string;
    status?: string;
    createdBy: string;
    createdAt: string;
  };
  boardId: string;
  workspaceId: string;
}

export interface ItemUpdatedPayload {
  item: {
    id: string;
    name?: string;
    status?: string;
    updatedAt: string;
  };
  changes: Record<string, { old: unknown; new: unknown }>;
  boardId: string;
  workspaceId: string;
}

export interface ItemDeletedPayload {
  itemId: string;
  boardId: string;
  workspaceId: string;
}

export interface StatusChangedPayload {
  itemId: string;
  oldStatus: string;
  newStatus: string;
  boardId: string;
  workspaceId: string;
}

export interface CommentAddedPayload {
  comment: {
    id: string;
    content: string;
    itemId: string;
    userId: string;
    createdAt: string;
  };
  itemId: string;
  boardId: string;
  workspaceId: string;
}

export interface ApprovalActionPayload {
  approval: {
    id: string;
    itemId: string;
    level: string;
    status: string;
    approverId: string;
  };
  itemId: string;
  boardId: string;
  workspaceId: string;
}

export interface UserJoinedPayload {
  userId: string;
  userName: string;
  boardId?: string;
  workspaceId?: string;
}

export interface UserLeftPayload {
  userId: string;
  userName: string;
  boardId?: string;
  workspaceId?: string;
}

