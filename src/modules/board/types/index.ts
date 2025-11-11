import { BoardType, ColumnType, ViewType } from '@prisma/client';

export type { BoardType, ColumnType, ViewType };

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  type: BoardType;
  description?: string;
  color?: string;
  icon?: string;
  isPublic: boolean;
  isArchived: boolean;
  permissions?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  type: ColumnType;
  position: number;
  width?: number;
  required: boolean;
  defaultValue?: unknown;
  settings?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Item {
  id: string;
  boardId: string;
  name: string;
  status?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Cell {
  id: string;
  itemId: string;
  columnId: string;
  value?: unknown;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBoardInput {
  workspaceId: string;
  name: string;
  type: BoardType;
  description?: string;
  color?: string;
  icon?: string;
  permissions?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface UpdateBoardInput {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  isPublic?: boolean;
  isArchived?: boolean;
  permissions?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface CreateColumnInput {
  name: string;
  type: ColumnType;
  position?: number;
  width?: number;
  required?: boolean;
  defaultValue?: unknown;
  settings?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
}

export interface UpdateColumnInput {
  name?: string;
  type?: ColumnType;
  position?: number;
  width?: number;
  required?: boolean;
  defaultValue?: unknown;
  settings?: Record<string, unknown>;
  permissions?: Record<string, unknown>;
  isHidden?: boolean;
}

export interface CreateItemInput {
  name: string;
  status?: string;
  cells?: Record<string, unknown>; // columnId -> value
}

export interface UpdateItemInput {
  name?: string;
  status?: string;
  cells?: Record<string, unknown>; // columnId -> value
}

export interface CreateViewInput {
  name: string;
  type: ViewType;
  settings?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface UpdateViewInput {
  name?: string;
  type?: ViewType;
  settings?: Record<string, unknown>;
  isDefault?: boolean;
}

export interface BoardWithDetails extends Board {
  columns: Column[];
  items?: Item[];
  views?: View[];
  _count?: {
    items: number;
    columns: number;
  };
}

export interface View {
  id: string;
  boardId: string;
  name: string;
  type: ViewType;
  settings?: Record<string, unknown>;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

