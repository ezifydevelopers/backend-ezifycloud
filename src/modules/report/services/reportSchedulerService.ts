// Use dynamic import for node-cron (optional dependency)
let cron: any = null;

const getCron = () => {
  if (cron) return cron;
  try {
    cron = require('node-cron');
    return cron;
  } catch (error) {
    console.warn('node-cron not installed. Scheduled reports disabled.');
    return null;
  }
};
import prisma from '../../../lib/prisma';
import { generateReport } from './reportGenerationService';
import { ReportSchedule } from '../types';
import { sendReportEmail } from './emailService';

/**
 * Report scheduling service - functional approach
 */
const scheduledJobs = new Map<string, any>();

export const scheduleReport = (reportId: string, schedule: ReportSchedule) => {
  const cronLib = getCron();
  if (!cronLib) {
    console.warn('Cron scheduling disabled - node-cron not installed');
    return null;
  }

  // Remove existing job if any
  unscheduleReport(reportId);

  let cronExpression = '';

  switch (schedule.frequency) {
    case 'daily':
      cronExpression = '0 9 * * *'; // 9 AM every day
      break;
    case 'weekly':
      cronExpression = '0 9 * * 1'; // 9 AM every Monday
      break;
    case 'monthly':
      cronExpression = '0 9 1 * *'; // 9 AM on 1st of every month
      break;
    case 'custom':
      cronExpression = schedule.cron || '0 9 * * *';
      break;
    default:
      throw new Error(`Invalid frequency: ${schedule.frequency}`);
  }

  const job = cronLib.schedule(cronExpression, async () => {
    await executeScheduledReport(reportId);
  });

  scheduledJobs.set(reportId, job);
  job.start();

  return job;
};

export const unscheduleReport = (reportId: string) => {
  const job = scheduledJobs.get(reportId);
  if (job) {
    job.stop();
    scheduledJobs.delete(reportId);
  }
};

export const executeScheduledReport = async (reportId: string) => {
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        creator: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!report || !report.isActive) {
      return;
    }

    // Generate report
    const result = await generateReport(
      report.boardId || null,
      report.workspaceId || null,
      report.type,
      report.config as any
    );

    // Update last run time
    await prisma.report.update({
      where: { id: reportId },
      data: { lastRunAt: new Date() },
    });

    // Send email if configured
    if (report.schedule) {
      const schedule = report.schedule as any;
      const recipients = schedule.emailRecipients || [];
      if (recipients.length > 0) {
        await sendReportEmail(
          recipients,
          report.name,
          result,
          schedule.format || 'pdf'
        );
      }
    }
  } catch (error) {
    console.error(`Error executing scheduled report ${reportId}:`, error);
  }
};

export const initializeScheduledReports = async () => {
  const reports = await prisma.report.findMany({
    where: {
      isActive: true,
      // filter reports that have a schedule configured (non-null JSON)
      // Prisma does not allow comparing JSON to null in some clients; fetch all and filter in JS if needed
    },
  });

  const schedulable = reports.filter(r => !!r.schedule);

  for (const report of schedulable) {
    if (report.schedule) {
      scheduleReport(report.id, report.schedule as any);
    }
  }

  console.log(`Initialized ${reports.length} scheduled reports`);
};

