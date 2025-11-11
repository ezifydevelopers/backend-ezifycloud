export interface KeyMetrics {
  totalInvoices: number;
  totalAmount: number;
  pendingApprovalsCount: number;
  overdueInvoicesCount: number;
  averageApprovalTime: number; // in hours
  paymentRate: number; // percentage
}

export interface TrendDataPoint {
  date: string;
  value: number;
  count?: number;
}

export interface Trends {
  invoiceVolume: TrendDataPoint[];
  amountTrends: TrendDataPoint[];
  approvalTimeTrends: TrendDataPoint[];
  paymentTrends: TrendDataPoint[];
}

export interface AnalyticsResult {
  keyMetrics: KeyMetrics;
  trends: Trends;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface AnalyticsFilters {
  workspaceId?: string;
  boardId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string[];
}

