// Admin Dashboard Types
export interface AdminDashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaveRequests: number;
  approvedLeaveRequests: number;
  rejectedLeaveRequests: number;
  totalLeaveDays: number;
  usedLeaveDays: number;
  upcomingHolidays: number;
  departmentStats: DepartmentStats[];
  recentActivities: RecentActivity[];
  monthlyLeaveTrend: MonthlyLeaveTrend[];
}

export interface DepartmentStats {
  department: string;
  totalEmployees: number;
  activeEmployees: number;
  onLeave: number;
  leaveRequests: number;
  leaveDaysUsed: number;
  leaveDaysRemaining: number;
}

export interface RecentActivity {
  id: string;
  type: 'leave_request' | 'employee_created' | 'employee_updated' | 'policy_updated' | 'system_event';
  title: string;
  description: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MonthlyLeaveTrend {
  month: string;
  year: number;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDays: number;
  averageDaysPerRequest: number;
}

// Employee Management Types
export interface EmployeeFilters {
  search?: string;
  department?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: PaginationInfo;
  filters: EmployeeFilters;
  totalCount: number;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  role: 'admin' | 'manager' | 'employee';
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  joinDate: Date;
  lastLogin?: Date;
  leaveBalance: LeaveBalance;
  avatar?: string;
  bio?: string;
  skills?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveBalance {
  annual: number;
  sick: number;
  casual: number;
  emergency: number;
  maternity?: number;
  paternity?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Leave Request Management Types
export interface LeaveRequestFilters {
  search?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  leaveType?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeaveRequestListResponse {
  leaveRequests: LeaveRequest[];
  pagination: PaginationInfo;
  filters: LeaveRequestFilters;
  totalCount: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    avatar?: string;
  };
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  emergencyContact?: string;
  workHandover?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerName?: string;
  comments?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Leave Policy Types
export interface LeavePolicy {
  id: string;
  name: string;
  description: string;
  leaveType: string;
  maxDays: number;
  carryForwardDays: number;
  requiresApproval: boolean;
  advanceNoticeDays: number;
  maxConsecutiveDays: number;
  isActive: boolean;
  applicableRoles: string[];
  applicableDepartments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeavePolicyCreateData {
  name: string;
  description: string;
  leaveType: string;
  maxDays: number;
  carryForwardDays: number;
  requiresApproval: boolean;
  advanceNoticeDays: number;
  maxConsecutiveDays: number;
  applicableRoles: string[];
  applicableDepartments: string[];
}

// Reports Types
export interface ReportFilters {
  startDate: string;
  endDate: string;
  department?: string;
  leaveType?: string;
  status?: string;
  format?: 'pdf' | 'excel' | 'csv';
}

export interface LeaveReport {
  summary: LeaveReportSummary;
  departmentBreakdown: DepartmentLeaveStats[];
  employeeBreakdown: EmployeeLeaveStats[];
  monthlyTrend: MonthlyLeaveData[];
  topRequesters: TopRequester[];
}

export interface LeaveReportSummary {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  totalDays: number;
  averageDaysPerRequest: number;
  approvalRate: number;
  rejectionRate: number;
}

export interface DepartmentLeaveStats {
  department: string;
  totalEmployees: number;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDays: number;
  averageDaysPerEmployee: number;
}

export interface EmployeeLeaveStats {
  employeeId: string;
  employeeName: string;
  department: string;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDays: number;
  averageDaysPerRequest: number;
}

export interface MonthlyLeaveData {
  month: string;
  year: number;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDays: number;
}

export interface TopRequester {
  employeeId: string;
  employeeName: string;
  department: string;
  totalRequests: number;
  totalDays: number;
  approvalRate: number;
}

// Audit Log Types
export interface AuditLogFilters {
  search?: string;
  action?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuditLogListResponse {
  auditLogs: AuditLog[];
  pagination: PaginationInfo;
  filters: AuditLogFilters;
  totalCount: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Settings Types
export interface SystemSettings {
  company: CompanySettings;
  leave: LeaveSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  system: SystemConfigSettings;
}

export interface CompanySettings {
  name: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  logo?: string;
  timezone: string;
}

export interface LeaveSettings {
  defaultAnnualLeave: number;
  defaultSickLeave: number;
  defaultCasualLeave: number;
  allowCarryForward: boolean;
  maxCarryForwardDays: number;
  requireManagerApproval: boolean;
  allowHalfDayLeave: boolean;
  maxConsecutiveDays: number;
  advanceNoticeDays: number;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  notifyOnNewRequest: boolean;
  notifyOnApproval: boolean;
  notifyOnRejection: boolean;
  notifyOnReminder: boolean;
  notifyOnSystemUpdate: boolean;
}

export interface SecuritySettings {
  sessionTimeout: number;
  requireTwoFactor: boolean;
  passwordExpiry: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  enableAuditLogs: boolean;
  dataRetentionDays: number;
}

export interface SystemConfigSettings {
  maintenanceMode: boolean;
  autoBackup: boolean;
  backupFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  logRetentionDays: number;
  systemVersion: string;
  lastUpdate: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: PaginationInfo;
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
  code?: string;
  details?: Record<string, any>;
}

// Utility Types
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: any;
}

export interface QueryOptions {
  filters?: FilterOptions;
  sort?: SortOptions;
  pagination?: {
    page: number;
    limit: number;
  };
}
