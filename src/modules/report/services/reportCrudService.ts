import prisma from '../../../lib/prisma';
import { Prisma, ReportType } from '@prisma/client';
import { CreateReportInput, UpdateReportInput } from '../types';
import { checkWorkspaceAccess } from '../../board/services/boardAccessService';

/**
 * Report CRUD operations - functional approach
 */
export const createReport = async (
  userId: string,
  data: CreateReportInput
) => {
  // Validate workspace access if provided
  if (data.workspaceId) {
    const role = await checkWorkspaceAccess(data.workspaceId, userId);
    if (!role) {
      throw new Error('You do not have access to this workspace');
    }
  }

  const report = await prisma.report.create({
    data: {
      workspaceId: data.workspaceId || null,
      boardId: data.boardId || null,
      name: data.name,
      type: data.type,
      config: data.config as unknown as Prisma.InputJsonValue,
      schedule: data.schedule ? (data.schedule as unknown as Prisma.InputJsonValue) : undefined,
      isActive: data.isActive ?? true,
      createdBy: userId,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Schedule report if configured
  if (report.schedule && report.isActive) {
    const { scheduleReport } = await import('./reportSchedulerService');
    scheduleReport(report.id, report.schedule as any);
  }

  return report;
};

export const getReportById = async (
  reportId: string,
  userId: string
) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      workspace: true,
      board: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  // Check access
  if (report.workspaceId) {
    const role = await checkWorkspaceAccess(report.workspaceId, userId);
    if (!role) {
      throw new Error('You do not have access to this report');
    }
  }

  return report;
};

export const getWorkspaceReports = async (
  workspaceId: string,
  userId: string
) => {
  const role = await checkWorkspaceAccess(workspaceId, userId);
  if (!role) {
    throw new Error('You do not have access to this workspace');
  }

  return await prisma.report.findMany({
    where: {
      workspaceId,
      OR: [
        { createdBy: userId },
        { isActive: true },
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
};

export const updateReport = async (
  reportId: string,
  userId: string,
  data: UpdateReportInput
) => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  if (report.createdBy !== userId) {
    throw new Error('Only the creator can edit this report');
  }

  const updatedReport = await prisma.report.update({
    where: { id: reportId },
    data: {
      name: data.name,
      config: data.config ? (data.config as unknown as Prisma.InputJsonValue) : undefined,
      schedule: data.schedule
        ? (data.schedule as unknown as Prisma.InputJsonValue)
        : undefined,
      isActive: data.isActive,
    },
  });

  // Update schedule if changed
  if (data.schedule) {
    const { scheduleReport, unscheduleReport } = await import('./reportSchedulerService');
    unscheduleReport(reportId);
    if (updatedReport.isActive) {
      scheduleReport(reportId, data.schedule);
    }
  } else if (data.isActive === false) {
    const { unscheduleReport } = await import('./reportSchedulerService');
    unscheduleReport(reportId);
  }

  return updatedReport;
};

export const deleteReport = async (
  reportId: string,
  userId: string
): Promise<void> => {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  if (report.createdBy !== userId) {
    throw new Error('Only the creator can delete this report');
  }

  await prisma.report.delete({
    where: { id: reportId },
  });
};

