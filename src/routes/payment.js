const express = require('express');
const router = express.Router();
const { createCheckoutSession, verifySession } = require('../controllers/paymentController');
const { validatePaymentCheckout, sanitizeInput } = require('../middlewares/validation');

// Apply sanitization to all routes
router.use(sanitizeInput);

router.post('/create-checkout-session', validatePaymentCheckout, createCheckoutSession);
router.get('/verify-session/:sessionId', verifySession);

module.exports = router;