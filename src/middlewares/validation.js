const Joi = require('joi');
const { ValidationError } = require('../utils/errorHandler');

const schemas = {
  userRegistration: Joi.object({
    name: Joi.string().min(2).max(100).required().trim(),
    email: Joi.string().email().required().lowercase().trim(),
    company: Joi.string().min(2).max(100).optional().trim(),
    phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().trim(),
    zip: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).optional().trim()
  }),

  licenseValidation: Joi.object({
    licenseKey: Joi.string().min(10).max(100).required().trim(),
    machineId: Joi.string().min(1).max(50).optional().trim()
  }),

  paymentCheckout: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    planType: Joi.string().valid('monthly', 'yearly', 'free trial').required(),
    planName: Joi.string().valid('Monthly', 'Yearly', 'monthly', 'yearly', 'Free Trial').required(),
    planPrice: Joi.alternatives().try(
      Joi.number().min(0),
      Joi.string().pattern(/^\$?\d+(\.\d{2})?$/).custom((value, helpers) => {
        const numValue = parseFloat(value.replace('$', ''));
        if (isNaN(numValue)) {
          return helpers.error('any.invalid');
        }
        return numValue;
      })
    ).required(),
    planPeriod: Joi.string().valid('month', 'year', 'per month', 'per year', '10 days').required(),
    userInfo: Joi.object({
      name: Joi.string().min(2).max(100).required().trim(),
      email: Joi.string().email().required().lowercase().trim(),
      sub: Joi.string().optional(),
      picture: Joi.string().uri().optional(),
      company: Joi.string().min(2).max(100).optional().trim(),
      phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().trim(),
      zip: Joi.string().pattern(/^[0-9]{5}(-[0-9]{4})?$/).optional().trim()
    }).required()
  }),

  stripeWebhook: Joi.object({
    id: Joi.string().required(),
    type: Joi.string().required(),
    data: Joi.object().required(),
    created: Joi.number().required()
  }),

  licenseCreation: Joi.object({
    userId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
    type: Joi.string().valid('monthly', 'yearly', 'free').required(),
    validFrom: Joi.date().required(),
    validTo: Joi.date().greater(Joi.ref('validFrom')).required(),
    features: Joi.object({
      maxDataMonths: Joi.number().integer().min(1).max(120).required(),
      maxMachines: Joi.number().integer().min(1).max(100).required(),
      supportLevel: Joi.string().valid('basic', 'premium', 'enterprise').required(),
      features: Joi.array().items(Joi.string()).required()
    }).required()
  }),

  userEmail: Joi.object({
    email: Joi.string().email().required().lowercase().trim()
  }),

  mongoId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),

  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().valid('createdAt', 'updatedAt', 'validTo').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  })
};

const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      const validationError = new ValidationError('Validation failed', details);
      return next(validationError);
    }

    req[property] = value;
    next();
  };
};

const validateUserRegistration = validate(schemas.userRegistration, 'body');
const validateLicenseValidation = validate(schemas.licenseValidation, 'body');
const validatePaymentCheckout = validate(schemas.paymentCheckout, 'body');
const validateStripeWebhook = validate(schemas.stripeWebhook, 'body');
const validateLicenseCreation = validate(schemas.licenseCreation, 'body');
const validateUserEmail = validate(schemas.userEmail, 'body');
const validateMongoId = validate(schemas.mongoId, 'params');
const validatePagination = validate(schemas.pagination, 'query');

const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .trim()
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  };

  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = typeof value === 'string' ? sanitizeString(value) : sanitizeObject(value);
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  next();
};

const validateRateLimit = (req, res, next) => {
  const rateLimitInfo = {
    limit: req.rateLimit?.limit,
    remaining: req.rateLimit?.remaining,
    reset: req.rateLimit?.reset
  };

  if (rateLimitInfo.limit) {
    res.set({
      'X-RateLimit-Limit': rateLimitInfo.limit,
      'X-RateLimit-Remaining': rateLimitInfo.remaining,
      'X-RateLimit-Reset': rateLimitInfo.reset
    });
  }
  next();
};

module.exports = {
  validate,
  validateUserRegistration,
  validateLicenseValidation,
  validatePaymentCheckout,
  validateStripeWebhook,
  validateLicenseCreation,
  validateUserEmail,
  validateMongoId,
  validatePagination,
  sanitizeInput,
  validateRateLimit,
  
  schemas
};
