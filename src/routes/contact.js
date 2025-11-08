const express = require('express');
const router = express.Router();
const { submitContact, getContacts, updateContactStatus, contactRateLimit } = require('../controllers/contactController');
const { validate, sanitizeInput } = require('../middlewares/validation');
const Joi = require('joi');

const contactSubmissionSchema = Joi.object({
  name: Joi.string().min(2).max(100).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  company: Joi.string().max(100).optional().allow('').trim(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow('').trim(),
  address: Joi.string().max(200).optional().allow('').trim(),
  message: Joi.string().min(10).max(1000).required().trim()
});

const contactStatusSchema = Joi.object({
  status: Joi.string().valid('new', 'read', 'replied', 'closed').required()
});

router.use(sanitizeInput);

router.post('/submit', contactRateLimit, validate(contactSubmissionSchema), submitContact);

router.get('/admin/contacts', getContacts);
router.put('/admin/contacts/:id/status', validate(contactStatusSchema), updateContactStatus);

module.exports = router;
