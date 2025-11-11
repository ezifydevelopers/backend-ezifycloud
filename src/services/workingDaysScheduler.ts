// Working Days Scheduler - Runs monthly to calculate working days for the next month
// Use dynamic import for node-cron (optional dependency)
let cron: any = null;

const getCron = () => {
  if (cron) return cron;
  try {
    cron = require('node-cron');
    return cron;
  } catch {
    console.warn('node-cron not installed. Scheduled working days calculation disabled.');
    return null;
  }
};

let scheduledJob: any = null;

/**
 * Start the working days calculation scheduler
 * Runs on the 1st of each month at 1 AM to calculate working days for the current month
 */
export const startWorkingDaysScheduler = () => {
  const cronLib = getCron();
  if (!cronLib) {
    console.warn('Working days calculation scheduling disabled - node-cron not installed');
    return;
  }

  // Stop existing job if any
  stopWorkingDaysScheduler();

  // Schedule job to run on the 1st of each month at 1 AM
  // This will calculate working days for the current month
  scheduledJob = cronLib.schedule('0 1 1 * *', async () => {
    console.log('[WorkingDaysScheduler] Running monthly working days calculation...');
    try {
      const { WorkingDaysService } = await import('./workingDaysService');
      
      // Process current month
      const currentResult = await WorkingDaysService.processCurrentMonth();
      console.log(`[WorkingDaysScheduler] Current month (${currentResult.month}/${currentResult.year}): ${currentResult.workingDays} working days`);
      
      // Process next month
      const nextResult = await WorkingDaysService.processNextMonth();
      console.log(`[WorkingDaysScheduler] Next month (${nextResult.month}/${nextResult.year}): ${nextResult.workingDays} working days`);
      
      console.log('[WorkingDaysScheduler] Monthly working days calculation completed');
    } catch (error) {
      console.error('[WorkingDaysScheduler] Error processing working days:', error);
    }
  });

  console.log('[WorkingDaysScheduler] Started - will run on the 1st of each month at 1 AM');
};

/**
 * Stop the working days calculation scheduler
 */
export const stopWorkingDaysScheduler = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('[WorkingDaysScheduler] Stopped');
  }
};

/**
 * Manually trigger working days calculation
 */
export const triggerWorkingDaysCalculation = async (
  year?: number,
  month?: number
) => {
  try {
    const { WorkingDaysService } = await import('./workingDaysService');
    
    if (year && month) {
      const result = await WorkingDaysService.processMonthlyWorkingDays(year, month);
      return { success: true, result };
    } else {
      // Process current and next month
      const currentResult = await WorkingDaysService.processCurrentMonth();
      const nextResult = await WorkingDaysService.processNextMonth();
      return {
        success: true,
        currentMonth: currentResult,
        nextMonth: nextResult,
      };
    }
  } catch (error) {
    console.error('[WorkingDaysScheduler] Error triggering calculation:', error);
    throw error;
  }
};

