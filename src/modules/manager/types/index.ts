// Manager Dashboard Types
export interface ManagerDashboardStats {
  teamSize: number;
  activeTeamMembers: number;
  pendingApprovals: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  teamLeaveBalance: TeamLeaveBalance;
  upcomingLeaves: UpcomingLeave[];
  recentActivities: ManagerActivity[];
  teamPerformance: TeamPerformanceMetrics;
  departmentStats: ManagerDepartmentStats[];
}

export interface TeamLeaveBalance {
  totalAnnual: number;
  usedAnnual: number;
  remainingAnnual: number;
  totalSick: number;
  usedSick: number;
  remainingSick: number;
  totalCasual: number;
  usedCasual: number;
  remainingCasual: number;
  utilizationRate: number;
}

export interface UpcomingLeave {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  submittedAt: Date;
  avatar?: string;
}

export interface ManagerActivity {
  id: string;
  type: 'leave_approval' | 'leave_rejection' | 'team_member_join' | 'team_member_update' | 'leave_request';
  title: string;
  description: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TeamPerformanceMetrics {
  averageResponseTime: number; // in hours
  approvalRate: number; // percentage
  teamSatisfaction: number; // 1-5 scale
  productivityScore: number; // 1-10 scale
  leaveUtilization: number; // percentage
}

export interface ManagerDepartmentStats {
  department: string;
  totalMembers: number;
  activeMembers: number;
  onLeave: number;
  leaveRequests: number;
  averageResponseTime: number;
  approvalRate: number;
}

// Team Management Types
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  role: 'manager' | 'employee';
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  joinDate: Date;
  lastLogin?: Date;
  leaveBalance: LeaveBalance;
  avatar?: string;
  bio?: string;
  skills?: string[];
  performance: PerformanceMetrics;
  recentLeaves: RecentLeave[];
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

export interface PerformanceMetrics {
  overall: number; // 1-5 scale
  attendance: number; // 1-5 scale
  productivity: number; // 1-5 scale
  teamwork: number; // 1-5 scale
  communication: number; // 1-5 scale
  lastReviewDate: Date;
  nextReviewDate: Date;
}

export interface RecentLeave {
  id: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
}

export interface TeamFilters {
  search?: string;
  department?: string;
  role?: string;
  status?: 'active' | 'inactive' | 'all';
  performance?: 'high' | 'medium' | 'low' | 'all';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TeamListResponse {
  teamMembers: TeamMember[];
  pagination: PaginationInfo;
  filters: TeamFilters;
  totalCount: number;
}

// Leave Approval Types
export interface LeaveApproval {
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

export interface ApprovalFilters {
  search?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  leaveType?: string;
  priority?: 'low' | 'medium' | 'high' | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ApprovalListResponse {
  approvals: LeaveApproval[];
  pagination: PaginationInfo;
  filters: ApprovalFilters;
  totalCount: number;
}

export interface ApprovalAction {
  requestId: string;
  action: 'approve' | 'reject';
  comments?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface BulkApprovalAction {
  requestIds: string[];
  action: 'approve' | 'reject';
  comments?: string;
}

// Team Calendar Types
export interface TeamCalendarEvent {
  id: string;
  title: string;
  type: 'leave' | 'holiday' | 'meeting' | 'event';
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  employeeId?: string;
  employeeName?: string;
  leaveType?: string;
  status?: 'pending' | 'approved' | 'rejected';
  color?: string;
  description?: string;
  location?: string;
}

export interface CalendarFilters {
  startDate: string;
  endDate: string;
  employeeId?: string;
  leaveType?: string;
  status?: string;
  eventType?: 'leave' | 'holiday' | 'meeting' | 'event' | 'all';
}

export interface CalendarResponse {
  events: TeamCalendarEvent[];
  holidays: Holiday[];
  teamMembers: TeamMember[];
  filters: CalendarFilters;
}

export interface Holiday {
  id: string;
  name: string;
  date: Date;
  type: 'national' | 'company' | 'religious';
  description?: string;
  isRecurring: boolean;
}

// Team Overview Types
export interface TeamOverview {
  teamId: string;
  teamName: string;
  managerId: string;
  managerName: string;
  department: string;
  totalMembers: number;
  activeMembers: number;
  onLeave: number;
  averagePerformance: number;
  leaveUtilization: number;
  recentHires: TeamMember[];
  topPerformers: TeamMember[];
  upcomingReviews: UpcomingReview[];
  teamGoals: TeamGoal[];
}

export interface UpcomingReview {
  employeeId: string;
  employeeName: string;
  reviewDate: Date;
  reviewType: 'quarterly' | 'annual' | 'probation';
  status: 'scheduled' | 'in_progress' | 'completed';
}

export interface TeamGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number; // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  assignedTo: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Manager Settings Types
export interface ManagerSettings {
  profile: ManagerProfile;
  notifications: ManagerNotificationSettings;
  approval: ApprovalSettings;
  team: TeamSettings;
  calendar: CalendarSettings;
  security: ManagerSecuritySettings;
}

export interface ManagerProfile {
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  bio?: string;
  avatar?: string;
  timezone: string;
  workingHours: {
    start: string;
    end: string;
    days: string[];
  };
}

export interface ManagerNotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  notifyOnNewRequest: boolean;
  notifyOnUrgentRequest: boolean;
  notifyOnTeamUpdate: boolean;
  notifyOnSystemUpdate: boolean;
  notifyOnHoliday: boolean;
  notifyOnReview: boolean;
  digestFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

export interface ApprovalSettings {
  autoApprove: boolean;
  autoApproveTypes: string[];
  autoApproveMaxDays: number;
  requireComments: boolean;
  requireWorkHandover: boolean;
  escalationDays: number;
  escalationManagerId?: string;
  approvalWorkflow: 'sequential' | 'parallel';
  delegationEnabled: boolean;
  delegationManagerId?: string;
}

export interface TeamSettings {
  allowSelfApproval: boolean;
  allowOverlappingLeaves: boolean;
  maxConcurrentLeaves: number;
  requireAdvanceNotice: boolean;
  advanceNoticeDays: number;
  allowHalfDayLeaves: boolean;
  allowEmergencyLeaves: boolean;
  teamGoalsEnabled: boolean;
  performanceTracking: boolean;
}

export interface CalendarSettings {
  defaultView: 'month' | 'week' | 'day';
  showWeekends: boolean;
  showHolidays: boolean;
  showTeamLeaves: boolean;
  showPersonalEvents: boolean;
  workingDays: string[];
  timeFormat: '12h' | '24h';
  timezone: string;
}

export interface ManagerSecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  loginNotifications: boolean;
  deviceManagement: boolean;
  auditLogs: boolean;
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
export interface PaginationInfo {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

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

// Manager-specific enums
export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum LeavePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum TeamMemberStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ON_LEAVE = 'on_leave'
}

export enum PerformanceLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum EventType {
  LEAVE = 'leave',
  HOLIDAY = 'holiday',
  MEETING = 'meeting',
  EVENT = 'event'
}
