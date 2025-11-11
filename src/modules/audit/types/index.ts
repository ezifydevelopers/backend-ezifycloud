export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
  fieldType?: string;
}

export interface CreateAuditLogInput {
  userId: string;
  userName: string;
  action: string;
  targetId?: string;
  targetType?: string;
  resourceId?: string;
  resourceType?: string;
  fieldChanges?: FieldChange[];
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  statusCode?: number;
}

export interface AuditLogQueryFilters {
  userId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface AuditLogExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  filters?: AuditLogQueryFilters;
}

