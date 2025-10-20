export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  department?: string;
  manager_id?: string;
  profile_picture?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  leave_type: 'annual' | 'sick' | 'casual' | 'maternity' | 'paternity' | 'emergency';
  start_date: Date;
  end_date: Date;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated';
  submitted_at: Date;
  approved_by?: string;
  approved_at?: Date;
  rejected_reason?: string;
  documents?: string[];
  is_half_day: boolean;
  half_day_period?: 'morning' | 'afternoon';
  comments?: string;
}

export interface LeaveBalance {
  user_id: string;
  annual: {
    total: number;
    used: number;
    remaining: number;
  };
  sick: {
    total: number;
    used: number;
    remaining: number;
  };
  casual: {
    total: number;
    used: number;
    remaining: number;
  };
  year: number;
}

export interface LeavePolicy {
  id: string;
  leave_type: string;
  total_days_per_year: number;
  can_carry_forward: boolean;
  max_carry_forward_days?: number;
  requires_approval: boolean;
  allow_half_day: boolean;
  description: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: any;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
