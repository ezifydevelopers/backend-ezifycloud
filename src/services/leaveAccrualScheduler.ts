// Leave Accrual Scheduler - Runs daily to check for employees whose joining date matches today
// Use dynamic import for node-cron (optional dependency)
let cron: any = null;

const getCron = () => {
  if (cron) return cron;
  try {
    cron = require('node-cron');
    return cron;
  } catch {
    console.warn('node-cron not installed. Scheduled leave accrual disabled.');
    return null;
  }
};

let scheduledJob: any = null;

/**
 * Start the leave accrual scheduler
 * Runs daily at 2 AM to process accruals for employees whose joining date matches today
 */
export const startLeaveAccrualScheduler = () => {
  const cronLib = getCron();
  if (!cronLib) {
    console.warn('Leave accrual scheduling disabled - node-cron not installed');
    return;
  }

  // Stop existing job if any
  stopLeaveAccrualScheduler();

  // Schedule job to run daily at 2 AM
  // This will check all employees and process accrual for those whose joining date day matches today
  scheduledJob = cronLib.schedule('0 2 * * *', async () => {
    console.log('[LeaveAccrualScheduler] Running daily accrual check...');
    try {
      const { LeaveAccrualService } = await import('./leaveAccrualService');
      const result = await LeaveAccrualService.processAllEligibleAccruals();
      console.log(`[LeaveAccrualScheduler] Processed: ${result.processed}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
      if (result.errors.length > 0) {
        console.error('[LeaveAccrualScheduler] Errors:', result.errors);
      }
    } catch (error) {
      console.error('[LeaveAccrualScheduler] Error processing accruals:', error);
    }
  });

  console.log('[LeaveAccrualScheduler] Started - will run daily at 2 AM');
};

/**
 * Stop the leave accrual scheduler
 */
export const stopLeaveAccrualScheduler = () => {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('[LeaveAccrualScheduler] Stopped');
  }
};

/**
 * Manually trigger accrual processing for all eligible employees
 */
export const triggerAccrualProcessing = async () => {
  try {
    const { LeaveAccrualService } = await import('./leaveAccrualService');
    const result = await LeaveAccrualService.processAllEligibleAccruals();
    return result;
  } catch (error) {
    console.error('[LeaveAccrualScheduler] Error triggering accrual:', error);
    throw error;
  }
};

