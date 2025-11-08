const express = require('express');
const router = express.Router();
const { validateLicense, getUserLicenses, createFreeLicense } = require('../controllers/licenseController');
const { validate } = require('../middlewares/validate');
const { auth } = require('../middlewares/auth');
const Joi = require('joi');

const validateLicenseSchema = Joi.object({
  licenseKey: Joi.string().required(),
  machineId: Joi.string().optional(),
  type: Joi.string().valid('validate', 'syncing').default('validate').optional(),
});

const createFreeLicenseSchema = Joi.object({
  userInfo: Joi.object({
    name: Joi.string().min(2).max(100).required().trim(),
    email: Joi.string().email().required().lowercase().trim(),
    sub: Joi.string().required(),
    picture: Joi.string().uri().optional().allow('')
  }).required()
});

router.post('/validate-license', validate(validateLicenseSchema), validateLicense);
router.get('/user-licenses', auth, getUserLicenses);
router.post('/create-free-license', validate(createFreeLicenseSchema), createFreeLicense);

module.exports = router; 