import { ApprovalLevel, ApprovalStatus } from '@prisma/client';

export interface CreateApprovalInput {
  itemId: string;
  level: ApprovalLevel;
  approverId?: string;
}

export interface UpdateApprovalInput {
  status: ApprovalStatus;
  comments?: string;
  approverId?: string;
}

export interface ApprovalQueryFilters {
  itemId?: string;
  level?: ApprovalLevel;
  status?: ApprovalStatus;
  approverId?: string;
}

export interface ApprovalWithDetails {
  id: string;
  itemId: string;
  level: ApprovalLevel;
  approverId?: string;
  status: ApprovalStatus;
  comments?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  item?: {
    id: string;
    name: string;
    boardId: string;
  };
  approver?: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
}

export interface ItemApprovalStatus {
  level1: ApprovalWithDetails | null;
  level2: ApprovalWithDetails | null;
  level3: ApprovalWithDetails | null;
  overallStatus: 'pending' | 'approved' | 'rejected' | 'in_progress';
  isComplete: boolean;
}

