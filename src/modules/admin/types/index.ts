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
  averageResponseTime: number;
  totalLeaveDays: number;
  leaveDaysUsed: number;
  leaveDaysRemaining: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  title: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userEmail: string;
  metadata?: any;
}

export interface MonthlyLeaveTrend {
  month: string;
  year: number;
  approved: number;
  rejected: number;
  pending: number;
  totalRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  totalDays: number;
  averageDaysPerRequest: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// Employee Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  position: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
  avatar?: string;
  phone?: string;
  bio?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  employeeId?: string;
  joinDate: Date;
  lastLogin?: Date;
  leaveBalance?: LeaveBalance[];
  probationStatus?: 'active' | 'completed' | 'extended' | 'terminated' | null;
  probationStartDate?: Date | null;
  probationEndDate?: Date | null;
  probationDuration?: number | null;
  probationCompletedAt?: Date | null;
  employeeType?: 'onshore' | 'offshore' | null;
  region?: string | null;
  timezone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmployeeListResponse {
  employees: Employee[];
  pagination: PaginationInfo;
  totalCount: number;
  filters: EmployeeFilters;
}

export interface EmployeeFilters {
  search?: string;
  department?: string;
  role?: string;
  isActive?: boolean;
  status?: 'active' | 'inactive' | 'all';
  probationStatus?: 'active' | 'completed' | 'extended' | 'terminated' | 'all';
  employeeType?: 'onshore' | 'offshore' | 'all';
  region?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface LeaveBalance {
  leaveType: string;
  totalDays: number;
  usedDays: number;
  remainingDays: number;
  pendingDays: number;
}

// Leave Request Types
export interface LeaveRequestListResponse {
  leaveRequests: LeaveRequest[];
  pagination: PaginationInfo;
  totalCount: number;
  filters: LeaveRequestFilters;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  leaveType: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  isPaid: boolean;
  submittedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedReason?: string;
  isHalfDay: boolean;
  halfDayPeriod?: 'morning' | 'afternoon';
  comments?: string;
  employeeId: string;
  employee: {
    id: string;
    name: string;
    email: string;
    department: string;
    position: string;
    avatar?: string;
    employeeType?: 'onshore' | 'offshore' | null;
  };
  emergencyContact?: string;
  workHandover?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaveRequestFilters {
  search?: string;
  status?: string;
  leaveType?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Leave Policy Types
export interface LeavePolicy {
  id: string;
  leaveType: string;
  totalDaysPerYear: number;
  canCarryForward: boolean;
  maxCarryForwardDays?: number;
  requiresApproval: boolean;
  allowHalfDay: boolean;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeavePolicyListResponse {
  policies: LeavePolicy[];
  pagination: PaginationInfo;
  totalCount: number;
}

export interface LeavePolicyFilters {
  search?: string;
  leaveType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Attendance Types
export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  position: string;
  avatar?: string;
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  hoursWorked: number;
  overtimeHours: number;
  notes?: string;
  isHoliday: boolean;
  isWeekend: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceStats {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  halfDayCount: number;
  onLeaveCount: number;
  attendanceRate: number;
  totalHoursWorked: number;
  totalOvertimeHours: number;
  averageHoursPerDay: number;
}

export interface AttendanceFilters {
  search?: string;
  status?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AttendanceListResponse {
  records: AttendanceRecord[];
  pagination: PaginationInfo;
  totalCount: number;
}

// Holiday Types
export interface Holiday {
  id: string;
  name: string;
  description?: string;
  date: Date;
  type: 'public' | 'company' | 'religious' | 'national';
  isRecurring: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HolidayListResponse {
  holidays: Holiday[];
  pagination: PaginationInfo;
  totalCount: number;
}

export interface HolidayFilters {
  search?: string;
  type?: string;
  isActive?: boolean;
  year?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}