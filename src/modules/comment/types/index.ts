export interface CreateCommentInput {
  itemId: string;
  content: string;
  mentions?: string[];
  isPrivate?: boolean;
  parentId?: string;
}

export interface UpdateCommentInput {
  content?: string;
  mentions?: string[];
  isPrivate?: boolean;
}

export interface CommentQueryFilters {
  itemId?: string;
  userId?: string;
  parentId?: string | null;
  includeDeleted?: boolean;
}

export interface CommentWithReplies {
  id: string;
  itemId: string;
  userId: string;
  content: string;
  mentions: string[];
  reactions?: Record<string, string[]>;
  isPrivate: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  replies?: CommentWithReplies[];
}

