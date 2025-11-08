const cron = require('node-cron');
const licenseService = require('./licenseService');

/**
 * Initialize cron jobs for license management
 */
exports.initializeCronJobs = () => {
  // Run auto-downgrade check every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running daily license auto-downgrade check...');
    try {
      const downgradedCount = await licenseService.autoDowngradeFreeLicenses();
      console.log(`Auto-downgrade completed. ${downgradedCount} licenses processed.`);
    } catch (error) {
      console.error('Error in auto-downgrade cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Run sync reset check every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly sync reset check...');
    try {
      const resetCount = await licenseService.resetDailySyncs();
      if (resetCount > 0) {
        console.log(`Sync reset completed. ${resetCount} licenses reset.`);
      }
    } catch (error) {
      console.error('Error in sync reset cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  // Run every hour to check for licenses that need downgrading
  cron.schedule('0 * * * *', async () => {
    console.log('Running hourly license check...');
    try {
      await licenseService.autoDowngradeFreeLicenses();
    } catch (error) {
      console.error('Error in hourly license check:', error);
    }
  }, {
    scheduled: true,
    timezone: "UTC"
  });

  console.log('Cron jobs initialized successfully');
};

