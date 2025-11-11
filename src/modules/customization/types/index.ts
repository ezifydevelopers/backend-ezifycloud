export interface FavoriteBoard {
  id: string;
  userId: string;
  boardId: string;
  position: number;
  createdAt: string;
  board?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    workspaceId: string;
  };
}

export interface RecentBoard {
  id: string;
  userId: string;
  boardId: string;
  lastAccessedAt: string;
  accessCount: number;
  board?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    workspaceId: string;
  };
}

export interface CustomView {
  id: string;
  userId: string;
  boardId: string;
  name: string;
  description?: string;
  viewType: 'table' | 'kanban' | 'calendar' | 'gallery' | 'timeline';
  config: {
    filters?: unknown[];
    sorting?: unknown[];
    grouping?: unknown;
    columns?: string[];
    [key: string]: unknown;
  };
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  userId: string;
  uiPreferences: {
    theme: 'light' | 'dark' | 'system';
    sidebarCollapsed: boolean;
    density: 'compact' | 'comfortable' | 'spacious';
    fontSize: 'small' | 'medium' | 'large';
    showAvatars: boolean;
    showTimestamps: boolean;
  };
  notificationPreferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    itemUpdates: boolean;
    comments: boolean;
    mentions: boolean;
    approvals: boolean;
    dueDates: boolean;
    weeklyDigest: boolean;
  };
  boardPreferences: {
    defaultView: 'table' | 'kanban' | 'calendar' | 'gallery';
    showCompletedItems: boolean;
    autoSave: boolean;
  };
  updatedAt: string;
}

export interface BoardColorScheme {
  boardId: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
}

export interface ColumnColor {
  columnId: string;
  color?: string;
  backgroundColor?: string;
}

export interface StatusColor {
  status: string;
  color: string;
  backgroundColor?: string;
}

