/**
 * Board Service - Re-exports all board operations
 * All services follow functional programming approach
 */
export * from './boardAccessService';
export * from './boardCrudService';
export * from './columnService';
export * from './itemService';

// Legacy class-based service wrapper for backward compatibility
import * as BoardAccessService from './boardAccessService';
import * as BoardCrudService from './boardCrudService';
import * as ColumnService from './columnService';
import * as ItemService from './itemService';

export class BoardService {
  // Access checks
  private static checkWorkspaceAccess = BoardAccessService.checkWorkspaceAccess;
  private static canEditBoard = BoardAccessService.canEditBoard;
  private static canViewBoard = BoardAccessService.canViewBoard;

  // Board CRUD
  static createBoard = BoardCrudService.createBoard;
  static getBoardById = BoardCrudService.getBoardById;
  static getWorkspaceBoards = BoardCrudService.getWorkspaceBoards;
  static updateBoard = BoardCrudService.updateBoard;
  static deleteBoard = BoardCrudService.deleteBoard;

  // Columns
  static createColumn = ColumnService.createColumn;
  static updateColumn = ColumnService.updateColumn;
  static deleteColumn = ColumnService.deleteColumn;
  static getBoardColumns = ColumnService.getBoardColumns;

  // Items
  static createItem = ItemService.createItem;
  static getBoardItems = ItemService.getBoardItems;
  static updateItem = ItemService.updateItem;
  static deleteItem = ItemService.deleteItem;
}

