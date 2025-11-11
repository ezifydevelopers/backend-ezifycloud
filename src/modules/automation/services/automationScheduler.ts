// Automation Scheduler - Runs scheduled checks for date-based triggers
import { AutomationEngine } from './automationEngine';

export class AutomationScheduler {
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the automation scheduler
   * Checks date triggers daily at midnight
   */
  static start(): void {
    // Check date triggers immediately on startup
    this.checkDateTriggers();

    // Then check daily at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      // Run at midnight
      this.checkDateTriggers();

      // Then run every 24 hours
      this.intervalId = setInterval(() => {
        this.checkDateTriggers();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, msUntilMidnight);
  }

  /**
   * Stop the automation scheduler
   */
  static stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Manually trigger date trigger check
   */
  static async checkDateTriggers(): Promise<void> {
    console.log('[AutomationScheduler] Checking date triggers...');
    await AutomationEngine.checkDateTriggers();
    console.log('[AutomationScheduler] Date trigger check completed');
  }
}

