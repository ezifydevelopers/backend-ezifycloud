// Employee Dashboard Types
export interface EmployeeDashboardStats {
  personalInfo: PersonalInfo;
  leaveBalance: LeaveBalance;
  recentRequests: RecentLeaveRequest[];
  upcomingHolidays: Holiday[];
  teamInfo: TeamInfo;
  performance: PerformanceMetrics;
  notifications: Notification[];
  quickStats: QuickStats;
}

export interface PersonalInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  managerName?: string;
  joinDate: Date;
  avatar?: string;
  bio?: string;
  isActive: boolean;
}

export interface LeaveBalance {
  [leaveType: string]: LeaveBalanceDetail | LeaveBalanceSummary;
  total: LeaveBalanceSummary;
}

export interface LeaveBalanceDetail {
  total: number;
  used: number;
  remaining: number;
  pending: number;
  utilizationRate: number;
}

export interface LeaveBalanceSummary {
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
  overallUtilization: number;
}

export interface RecentLeaveRequest {
  id: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  submittedAt: Date;
  reviewedAt?: Date;
  comments?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: Date;
  type: 'national' | 'company' | 'religious';
  description?: string;
  isRecurring: boolean;
}

export interface TeamInfo {
  teamSize: number;
  managerName: string;
  managerEmail: string;
  department: string;
  teamMembers: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  position: string;
  avatar?: string;
  isOnLeave: boolean;
  leaveEndDate?: Date;
}

export interface PerformanceMetrics {
  overall: number;
  attendance: number;
  productivity: number;
  teamwork: number;
  communication: number;
  lastReviewDate: Date;
  nextReviewDate: Date;
  goals: PerformanceGoal[];
  achievements: Achievement[];
}

export interface PerformanceGoal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'award' | 'milestone' | 'certification' | 'recognition';
  date: Date;
  issuer: string;
  badge?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface QuickStats {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  daysUsedThisYear: number;
  daysRemaining: number;
  averageResponseTime: number;
  approvalRate: number;
}

// Leave Request Management Types
export interface LeaveRequestFormData {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  emergencyContact?: string;
  workHandover?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  attachments?: string[];
}

export interface LeaveRequestResponse {
  id: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  isPaid: boolean;
  priority: 'low' | 'medium' | 'high';
  emergencyContact?: string;
  workHandover?: string;
  isHalfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerName?: string;
  comments?: string;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequestFilters {
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  leaveType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeaveRequestListResponse {
  leaveRequests: LeaveRequestResponse[];
  pagination: PaginationInfo;
  filters: LeaveRequestFilters;
  totalCount: number;
}

// Leave History Types
export interface LeaveHistory {
  id: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewerName?: string;
  comments?: string;
  attachments?: string[];
}

export interface LeaveHistoryFilters {
  year?: number;
  leaveType?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface LeaveHistoryResponse {
  leaveHistory: LeaveHistory[];
  pagination: PaginationInfo;
  filters: LeaveHistoryFilters;
  totalCount: number;
  summary: LeaveHistorySummary;
}

export interface LeaveHistorySummary {
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingRequests: number;
  totalDays: number;
  approvedDays: number;
  rejectedDays: number;
  pendingDays: number;
  byLeaveType: { [key: string]: number };
  byMonth: { [key: string]: number };
  averageDaysPerRequest: number;
  approvalRate: number;
}

// Calendar Types
export interface CalendarEvent {
  id: string;
  title: string;
  type: 'leave' | 'holiday' | 'meeting' | 'event';
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  leaveType?: string;
  status?: 'pending' | 'approved' | 'rejected';
  color?: string;
  description?: string;
  location?: string;
}

export interface CalendarFilters {
  startDate: string;
  endDate: string;
  eventType?: 'leave' | 'holiday' | 'meeting' | 'event' | 'all';
  leaveType?: string;
  status?: string;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  holidays: Holiday[];
  filters: CalendarFilters;
  monthStats: MonthStats;
}

export interface MonthStats {
  totalDays: number;
  workingDays: number;
  leaveDays: number;
  holidayDays: number;
  leaveUtilization: number;
}

// Profile Management Types
export interface EmployeeProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  managerId?: string;
  managerName?: string;
  joinDate: Date;
  avatar?: string;
  bio?: string;
  address?: string;
  emergencyContact?: string;
  preferences: UserPreferences;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface UserPreferences {
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  theme: string;
  weekStartsOn: string;
  notifications: NotificationPreferences;
  calendar: CalendarPreferences;
  privacy: PrivacySettings;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  leaveRequestAlerts: boolean;
  approvalNotifications: boolean;
  reminderNotifications: boolean;
  systemUpdates: boolean;
}

export interface CalendarPreferences {
  defaultView: 'month' | 'week' | 'day';
  showWeekends: boolean;
  showHolidays: boolean;
  workingDays: string[];
  startTime: string;
  endTime: string;
}

export interface PrivacySettings {
  showLeaveDetails: boolean;
  showContactInfo: boolean;
  showPerformance: boolean;
  allowDirectMessages: boolean;
}

// Settings Types
export interface EmployeeSettings {
  profile: EmployeeProfile;
  notifications: NotificationPreferences;
  calendar: CalendarPreferences;
  privacy: PrivacySettings;
  security: SecuritySettings;
  preferences: UserPreferences;
  appPreferences: AppPreferences;
}

export interface AppPreferences {
  theme: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  weekStartsOn: string;
}

export interface DataManagementSettings {
  exportData: boolean;
  importData: boolean;
  deleteAccount: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotificationsEnabled: boolean;
  passwordChangeRequired: boolean;
  sessionTimeoutMinutes: number;
  passwordLastChanged: Date;
  loginHistory: LoginHistory[];
  activeSessions: ActiveSession[];
  securityQuestions: SecurityQuestion[];
}

export interface LoginHistory {
  id: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location: string;
  success: boolean;
}

export interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
}

export interface SecurityQuestion {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
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

// Employee-specific enums
export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  CASUAL = 'casual',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  EMERGENCY = 'emergency'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export enum EventType {
  LEAVE = 'leave',
  HOLIDAY = 'holiday',
  MEETING = 'meeting',
  EVENT = 'event'
}

export enum AchievementType {
  AWARD = 'award',
  MILESTONE = 'milestone',
  CERTIFICATION = 'certification',
  RECOGNITION = 'recognition'
}

export enum GoalStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  OVERDUE = 'overdue'
}
