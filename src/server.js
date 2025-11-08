const loadSecrets = require('./config/loadSecrets');
const cronService = require('./services/cronService');

(async () => {
  try {
    // Check if we're in production (Google Cloud) or local development
    if (process.env.NODE_ENV === 'production' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Loading secrets from Google Cloud Secret Manager...');
      await loadSecrets();
    } else {
      console.log('Using local environment variables from .env file...');
      // dotenv is already loaded in app.js, so we can proceed
    }
    
    const app = require('./app');
    const PORT = process.env.PORT || 5000;
    
    // Initialize cron jobs for license management
    cronService.initializeCronJobs();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('License auto-downgrade cron jobs started');
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})(); 