require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const connectDB = require('./config/db');
const limiter = require('./middlewares/rateLimiter');
const security = require('./middlewares/security');
const { globalErrorHandler, notFoundHandler, validationErrorHandler, databaseErrorHandler } = require('./utils/errorHandler');
const paymentController = require('./controllers/paymentController');

connectDB();
const app = express();

// Trust proxy - Required for Vercel and other reverse proxies
// This allows Express to correctly identify the client's IP address
app.set('trust proxy', true);

security(app);
app.use(limiter);

app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), paymentController.stripeWebhook);

app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/license', require('./routes/license'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/quickbooks', require('./routes/quickbooks'));

app.use(validationErrorHandler);
app.use(databaseErrorHandler);
app.use(notFoundHandler);
app.use(globalErrorHandler);

module.exports = app;
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}