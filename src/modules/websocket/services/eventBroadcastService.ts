// Event broadcasting service for real-time updates

import { websocketService } from './websocketService';
import {
  WebSocketEventType,
  WebSocketMessage,
  ItemCreatedPayload,
  ItemUpdatedPayload,
  ItemDeletedPayload,
  StatusChangedPayload,
  CommentAddedPayload,
  ApprovalActionPayload,
  UserJoinedPayload,
  UserLeftPayload,
} from '../types';

export class EventBroadcastService {
  /**
   * Broadcast item created event
   */
  static broadcastItemCreated(payload: ItemCreatedPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.ITEM_CREATED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    websocketService.broadcastToBoard(payload.boardId, message);
  }

  /**
   * Broadcast item updated event
   */
  static broadcastItemUpdated(payload: ItemUpdatedPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.ITEM_UPDATED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    websocketService.broadcastToBoard(payload.boardId, message);
  }

  /**
   * Broadcast item deleted event
   */
  static broadcastItemDeleted(payload: ItemDeletedPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.ITEM_DELETED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    websocketService.broadcastToBoard(payload.boardId, message);
  }

  /**
   * Broadcast status changed event
   */
  static broadcastStatusChanged(payload: StatusChangedPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.ITEM_STATUS_CHANGED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    websocketService.broadcastToBoard(payload.boardId, message);
  }

  /**
   * Broadcast comment added event
   */
  static broadcastCommentAdded(payload: CommentAddedPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.COMMENT_ADDED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    websocketService.broadcastToBoard(payload.boardId, message);
  }

  /**
   * Broadcast approval requested event
   */
  static broadcastApprovalRequested(payload: ApprovalActionPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.APPROVAL_REQUESTED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    // Broadcast to board and notify approver
    websocketService.broadcastToBoard(payload.boardId, message);
    if (payload.approval.approverId) {
      websocketService.broadcastToUser(payload.approval.approverId, message);
    }
  }

  /**
   * Broadcast approval approved event
   */
  static broadcastApprovalApproved(payload: ApprovalActionPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.APPROVAL_APPROVED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    websocketService.broadcastToBoard(payload.boardId, message);
  }

  /**
   * Broadcast approval rejected event
   */
  static broadcastApprovalRejected(payload: ApprovalActionPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.APPROVAL_REJECTED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    websocketService.broadcastToBoard(payload.boardId, message);
  }

  /**
   * Broadcast user joined event
   */
  static broadcastUserJoined(payload: UserJoinedPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.USER_JOINED,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    if (payload.boardId) {
      websocketService.broadcastToBoard(payload.boardId, message);
    } else if (payload.workspaceId) {
      websocketService.broadcastToWorkspace(payload.workspaceId, message);
    }
  }

  /**
   * Broadcast user left event
   */
  static broadcastUserLeft(payload: UserLeftPayload): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.USER_LEFT,
      payload,
      timestamp: new Date().toISOString(),
      boardId: payload.boardId,
      workspaceId: payload.workspaceId,
    };

    if (payload.boardId) {
      websocketService.broadcastToBoard(payload.boardId, message);
    } else if (payload.workspaceId) {
      websocketService.broadcastToWorkspace(payload.workspaceId, message);
    }
  }

  /**
   * Broadcast board updated event
   */
  static broadcastBoardUpdated(boardId: string, workspaceId: string, changes: Record<string, unknown>): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.BOARD_UPDATED,
      payload: { boardId, changes },
      timestamp: new Date().toISOString(),
      boardId,
      workspaceId,
    };

    websocketService.broadcastToBoard(boardId, message);
  }

  /**
   * Broadcast column updated event
   */
  static broadcastColumnUpdated(boardId: string, workspaceId: string, columnId: string, changes: Record<string, unknown>): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.COLUMN_UPDATED,
      payload: { columnId, changes },
      timestamp: new Date().toISOString(),
      boardId,
      workspaceId,
    };

    websocketService.broadcastToBoard(boardId, message);
  }

  /**
   * Broadcast column deleted event
   */
  static broadcastColumnDeleted(boardId: string, workspaceId: string, columnId: string): void {
    const message: WebSocketMessage = {
      type: WebSocketEventType.COLUMN_DELETED,
      payload: { columnId },
      timestamp: new Date().toISOString(),
      boardId,
      workspaceId,
    };

    websocketService.broadcastToBoard(boardId, message);
  }
}

