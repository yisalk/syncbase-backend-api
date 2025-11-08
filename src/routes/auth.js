const express = require('express');
const router = express.Router();
const { register } = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().required(),
  company: Joi.string().required(),
  email: Joi.string().email().required(),
  phone: Joi.string().required(),
  zip: Joi.string().required(),
});

router.post('/register', validate(registerSchema), register);

module.exports = router;