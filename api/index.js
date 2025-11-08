// Vercel serverless function entry point
// Note: dotenv is already loaded in app.js, but Vercel will use environment variables
// from the Vercel dashboard, so dotenv is mainly for local development

// Import the Express app (MongoDB connection is handled in app.js)
const app = require('../src/app');

// Export the Express app as a serverless function
module.exports = app;

