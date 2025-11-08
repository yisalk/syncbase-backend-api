const stripe = require('../config/stripe');
const prices = require('../config/prices');

exports.createCheckoutSession = async (email, planType, additionalData = {}) => {
  const priceId = prices[planType];
  if (!priceId) {
    throw new Error('Invalid plan type');
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        { price: priceId, quantity: 1 }
      ],
      success_url: process.env.FRONTEND_SUCCESS_URL || 'https://www.syncbase.io/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: process.env.FRONTEND_CANCEL_URL || 'https://www.syncbase.io/cancel',
      metadata: { 
        planType: String(planType),
        userId: String(additionalData.userId || ''),
        planName: String(additionalData.planName || ''),
        planPrice: String(additionalData.planPrice || ''),
        planPeriod: String(additionalData.planPeriod || ''),
        auth0Id: String(additionalData.auth0Id || '')
      },
    });
    return { url: session.url };
  } catch (err) {
    throw err;
  }
};