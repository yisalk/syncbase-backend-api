const stripeService = require('../services/stripeService');
const userService = require('../services/userService');
const { generateLicenseKey } = require('../services/licenseService');
const licenseCrypto = require('../services/licenseCrypto');
const { getLicenseKeyFromHash } = require('../utils/licenseUtils');
const { createLicense, getLicenseFeatures } = require('../utils/licenseUtils');
const sendEmail = require('../services/emailService');
const { asyncHandler, AppError, NotFoundError, ValidationError, ExternalServiceError } = require('../utils/errorHandler');
const stripe = require('../config/stripe');

exports.createCheckoutSession = asyncHandler(async (req, res) => {
  const { 
    email, 
    planType, 
    planName, 
    planPrice, 
    planPeriod, 
    userInfo 
  } = req.body;
  
  // Validate required fields
  if (!email || !planType || !planName || !planPrice || !planPeriod) {
    throw new ValidationError('Missing required fields: email, planType, planName, planPrice, planPeriod');
  }

  if (!userInfo || !userInfo.email || !userInfo.name) {
    throw new ValidationError('Invalid user information provided');
  }

  try {
    const normalizedPlanName = planName.toLowerCase();
    const normalizedPlanPeriod = planPeriod.replace('per ', '');
    
    const user = await userService.createOrUpdateUser(userInfo, {
      planName: normalizedPlanName,
      planPrice,
      planPeriod: normalizedPlanPeriod
    });

    const session = await stripeService.createCheckoutSession(email, planType, {
      userId: user._id.toString(),
      planName: normalizedPlanName,
      planPrice: planPrice,
      planPeriod: normalizedPlanPeriod,
      auth0Id: userInfo.sub
    });

    res.json({
      success: true,
      data: {
        url: session.url
      }
    });

  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    throw new ExternalServiceError('Stripe', 'Failed to create checkout session');
  }
});

exports.verifySession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new ValidationError('Session ID is required');
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      throw new NotFoundError('Session not found or expired');
    }

    if (session.payment_status !== 'paid') {
      throw new ValidationError('Payment not completed');
    }

    let userId = session.metadata?.userId;
    let user;
    
    if (userId) {
      user = await userService.getUserById(userId);
    } else {
      const userEmail = session.customer_email || session.metadata?.userEmail;
      if (!userEmail) {
        throw new ValidationError('Invalid session metadata - no userId or email found');
      }
      user = await userService.getUserByEmail(userEmail);
      userId = user._id.toString();
    }
    const License = require('../models/License');
    const licenses = await License.find({ userId }).sort({ createdAt: -1 });

    const desiredPlanType = (session.metadata?.planType || 'monthly');

    if (licenses.length === 0) {
      const licenseData = {
        userId: user._id,
        type: desiredPlanType,
        validFrom: new Date(),
        validTo: new Date(Date.now() + (desiredPlanType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
        features: getLicenseFeatures(desiredPlanType)
      };

      const license = await createLicense(
        licenseData.userId,
        licenseData.type,
        licenseData.validFrom,
        licenseData.validTo,
        licenseData.features
      );

      licenses.push(license);
    } else {
      const current = licenses[0];
      if (current.type !== desiredPlanType) {
        current.type = desiredPlanType;
        current.validFrom = new Date();
        current.validTo = new Date(Date.now() + (desiredPlanType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
        current.features = getLicenseFeatures(desiredPlanType);
        current.status = 'active';
        try {
          const newPlainKey = generateLicenseKey();
          const newEncrypted = licenseCrypto.encryptLicenseKey(newPlainKey);
          current.licenseKeyHash = newEncrypted;
        } catch (e) {
          console.error('Failed to regenerate license key on upgrade:', e);
        }
        await current.save();
      }
    }

    const license = await License.findOne({ userId }).sort({ createdAt: -1 });

    const formattedLicense = {
      id: license._id,
      type: license.type,
      status: license.status,
      validFrom: license.validFrom,
      validTo: license.validTo,
      features: license.features,
      createdAt: license.createdAt,
      licenseKey: license.licenseKeyHash ? getLicenseKeyFromHash(license.licenseKeyHash) : null
    };

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          company: user.company
        },
        license: formattedLicense
      }
    });

  } catch (error) {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    
    if (error.type === 'StripeInvalidRequestError') {
      throw new NotFoundError('Invalid session ID');
    }
    
    console.error('Stripe verify session error:', error);
    throw new ExternalServiceError('Stripe', `Failed to verify session: ${error.message}`);
  }
});

exports.stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    throw new AppError('Webhook secret not configured', 500);
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    throw new ValidationError(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    default:
      break;
  }

  res.json({ received: true });
});

async function handleCheckoutSessionCompleted(session) {
  try {
    const userId = session.metadata?.userId;
    const userEmail = session.metadata?.userEmail;
    const planType = session.metadata?.planType;

    if (!userId || !userEmail || !planType) {
      throw new ValidationError('Invalid session metadata');
    }

    const user = await userService.getUserById(userId);
    
    const License = require('../models/License');
    let license = await License.findOne({ userId, status: 'active' });

    if (license) {
      const validTo = new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
      license.validTo = validTo;
      license.type = planType;
      license.features = getLicenseFeatures(planType);
      license.updatedAt = new Date();
      await license.save();
    } else {
      const validFrom = new Date();
      const validTo = new Date(Date.now() + (planType === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);
      
      license = await createLicense(
        user._id,
        planType,
        validFrom,
        validTo,
        getLicenseFeatures(planType)
      );
    }

    if (license.licenseKeyHash) {
      const licenseKey = getLicenseKeyFromHash(license.licenseKeyHash);
      await sendEmail(
        userEmail,
        'Your SyncBase License Key',
        `Your license key is: ${licenseKey}`,
        `<h1>Your SyncBase License</h1><p>Your license key is: <code>${licenseKey}</code></p>`
      );
    }

  } catch (error) {
    console.error('Error processing webhook:', error);
  }
}