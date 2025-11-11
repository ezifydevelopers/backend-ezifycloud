import prisma from '../../../lib/prisma';
import { WidgetConfig, MetricsResult } from '../types';
import { calculateBoardMetrics } from './metricsService';

/**
 * Widget data calculation - functional approach
 */
export const calculateWidgetData = async (
  widget: WidgetConfig,
  userId: string
): Promise<unknown> => {
  switch (widget.type) {
    case 'kpi_card':
      return await calculateKPICard(widget, userId);
    
    case 'bar_chart':
    case 'line_chart':
    case 'area_chart':
      return await calculateChartData(widget, userId);
    
    case 'pie_chart':
      return await calculatePieChart(widget, userId);
    
    case 'gauge_chart':
      return await calculateGaugeChart(widget, userId);
    
    case 'summary_table':
      return await calculateSummaryTable(widget, userId);
    
    case 'trend_line':
      return await calculateTrendLine(widget, userId);
    
    case 'status_distribution':
      return await calculateStatusDistribution(widget, userId);
    
    default:
      throw new Error(`Unknown widget type: ${widget.type}`);
  }
};

const calculateKPICard = async (
  widget: WidgetConfig,
  userId: string
): Promise<{ value: number; label: string; change?: number }> => {
  if (widget.dataSource.type !== 'board' || !widget.dataSource.boardId) {
    throw new Error('Board ID required for KPI card');
  }

  const metrics = await calculateBoardMetrics(
    widget.dataSource.boardId,
    widget.filters
  );

  const aggregation = widget.dataSource.aggregation || 'count';
  
  let value = 0;
  let label = '';

  switch (aggregation) {
    case 'count':
      value = metrics.totalItems;
      label = 'Total Items';
      break;
    case 'sum':
      value = metrics.totalValue;
      label = 'Total Value';
      break;
    case 'average':
      value = metrics.averageValue;
      label = 'Average Value';
      break;
  }

  return { value, label };
};

const calculateChartData = async (
  widget: WidgetConfig,
  userId: string
): Promise<Array<{ label: string; value: number }>> => {
  if (widget.dataSource.type !== 'board' || !widget.dataSource.boardId) {
    throw new Error('Board ID required for chart');
  }

  const metrics = await calculateBoardMetrics(
    widget.dataSource.boardId,
    widget.filters
  );

  if (widget.dataSource.columnId) {
    // Group by specific column
    return Object.entries(metrics.itemsByStatus).map(([label, value]) => ({
      label,
      value,
    }));
  }

  // Default: group by date
  return metrics.itemsByDate.map(({ date, count }) => ({
    label: date,
    value: count,
  }));
};

const calculatePieChart = async (
  widget: WidgetConfig,
  userId: string
): Promise<Array<{ label: string; value: number; percentage: number }>> => {
  if (widget.dataSource.type !== 'board' || !widget.dataSource.boardId) {
    throw new Error('Board ID required for pie chart');
  }

  const metrics = await calculateBoardMetrics(
    widget.dataSource.boardId,
    widget.filters
  );

  const total = Object.values(metrics.itemsByStatus).reduce((a, b) => a + b, 0);

  return Object.entries(metrics.itemsByStatus).map(([label, value]) => ({
    label,
    value,
    percentage: total > 0 ? (value / total) * 100 : 0,
  }));
};

const calculateSummaryTable = async (
  widget: WidgetConfig,
  userId: string
): Promise<Array<Record<string, unknown>>> => {
  if (widget.dataSource.type !== 'board' || !widget.dataSource.boardId) {
    throw new Error('Board ID required for summary table');
  }

  const metrics = await calculateBoardMetrics(
    widget.dataSource.boardId,
    widget.filters
  );

  return metrics.topItems;
};

const calculateTrendLine = async (
  widget: WidgetConfig,
  userId: string
): Promise<Array<{ date: string; value: number }>> => {
  if (widget.dataSource.type !== 'board' || !widget.dataSource.boardId) {
    throw new Error('Board ID required for trend line');
  }

  const metrics = await calculateBoardMetrics(
    widget.dataSource.boardId,
    widget.filters
  );

  return metrics.itemsByDate.map(({ date, value }) => ({
    date,
    value,
  }));
};

const calculateGaugeChart = async (
  widget: WidgetConfig,
  userId: string
): Promise<{ value: number; min: number; max: number; target?: number }> => {
  if (widget.dataSource.type !== 'board' || !widget.dataSource.boardId) {
    throw new Error('Board ID required for gauge chart');
  }

  const metrics = await calculateBoardMetrics(
    widget.dataSource.boardId,
    widget.filters
  );

  const aggregation = widget.dataSource.aggregation || 'count';
  let value = 0;

  switch (aggregation) {
    case 'count':
      value = metrics.totalItems;
      break;
    case 'sum':
      value = metrics.totalValue;
      break;
    case 'average':
      value = metrics.averageValue;
      break;
  }

  // Get min/max from settings or calculate from data
  const min = (widget.settings?.min as number) || 0;
  const max = (widget.settings?.max as number) || value * 1.5 || 100;
  const target = widget.settings?.target as number | undefined;

  return { value, min, max, target };
};

const calculateStatusDistribution = async (
  widget: WidgetConfig,
  userId: string
): Promise<Array<{ status: string; count: number; percentage: number; color?: string }>> => {
  if (widget.dataSource.type !== 'board' || !widget.dataSource.boardId) {
    throw new Error('Board ID required for status distribution');
  }

  const metrics = await calculateBoardMetrics(
    widget.dataSource.boardId,
    widget.filters
  );

  const total = Object.values(metrics.itemsByStatus).reduce((a, b) => a + b, 0);

  // Color mapping for common statuses
  const statusColors: Record<string, string> = {
    pending: '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    completed: '#3b82f6',
    in_progress: '#8b5cf6',
    ...(widget.settings?.colors as Record<string, string> || {}),
  };

  return Object.entries(metrics.itemsByStatus).map(([status, count]) => ({
    status,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
    color: statusColors[status.toLowerCase()] || '#6b7280',
  }));
};

