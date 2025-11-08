const Contact = require('../models/Contact');
const sendEmail = require('../services/emailService');
const { asyncHandler, ValidationError, AppError } = require('../utils/errorHandler');
const rateLimit = require('express-rate-limit');

const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    error: {
      message: 'Too many contact form submissions. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitContact = asyncHandler(async (req, res) => {
  const { name, email, company, phone, address, message } = req.body;
  
  if (!name || !email || !message) {
    throw new ValidationError('Name, email, and message are required');
  }

  const sanitizedData = {
    name: name.trim().substring(0, 100),
    email: email.trim().toLowerCase().substring(0, 100),
    company: company ? company.trim().substring(0, 100) : '',
    phone: phone ? phone.trim().substring(0, 20) : '',
    address: address ? address.trim().substring(0, 200) : '',
    message: message.trim().substring(0, 1000),
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown'
  };

  const spamPatterns = [
    /(?:viagra|cialis|casino|poker|lottery|winner|congratulations)/i,
    /(?:click here|buy now|free money|make money)/i,
    /(?:http|www\.|\.com|\.net|\.org)/i
  ];

  const isSpam = spamPatterns.some(pattern => 
    pattern.test(sanitizedData.message) || 
    pattern.test(sanitizedData.name) ||
    pattern.test(sanitizedData.company)
  );

  if (isSpam) {
    throw new ValidationError('Message appears to be spam and cannot be submitted');
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const duplicate = await Contact.findOne({
    email: sanitizedData.email,
    message: sanitizedData.message,
    createdAt: { $gte: oneHourAgo }
  });

  if (duplicate) {
    throw new ValidationError('Duplicate submission detected. Please wait before submitting again.');
  }

  const contact = new Contact(sanitizedData);
  await contact.save();

  try {
    const emailSubject = `New Contact Form Submission from ${sanitizedData.name}`;
    const emailText = `
      New contact form submission:

      Name: ${sanitizedData.name}
      Email: ${sanitizedData.email}
      Company: ${sanitizedData.company || 'Not provided'}
      Phone: ${sanitizedData.phone || 'Not provided'}
      Address: ${sanitizedData.address || 'Not provided'}

      Message:
      ${sanitizedData.message}

      Submitted at: ${contact.createdAt}
      IP Address: ${sanitizedData.ipAddress}
    `;

    const emailHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${sanitizedData.name}</p>
      <p><strong>Email:</strong> ${sanitizedData.email}</p>
      <p><strong>Company:</strong> ${sanitizedData.company || 'Not provided'}</p>
      <p><strong>Phone:</strong> ${sanitizedData.phone || 'Not provided'}</p>
      <p><strong>Address:</strong> ${sanitizedData.address || 'Not provided'}</p>
      <p><strong>Message:</strong></p>
      <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${sanitizedData.message}</p>
      <hr>
      <p><small>Submitted at: ${contact.createdAt}</small></p>
      <p><small>IP Address: ${sanitizedData.ipAddress}</small></p>
    `;

    await sendEmail(
      process.env.CONTACT_EMAIL || 'contact@syncbase.com',
      emailSubject,
      emailText,
      emailHtml
    );
  } catch (emailError) {
    console.error('Failed to send contact form notification email:', emailError);
  }

  try {
    const confirmationSubject = 'Thank you for contacting SyncBase';
    const confirmationText = `
      Hello ${sanitizedData.name},

      Thank you for contacting SyncBase! We have received your message and will get back to you within 24 hours.

      Your message:
      ${sanitizedData.message}

      Best regards,
      SyncBase Team
    `;

    const confirmationHtml = `
      <h2>Thank you for contacting SyncBase!</h2>
      <p>Hello ${sanitizedData.name},</p>
      <p>We have received your message and will get back to you within 24 hours.</p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <strong>Your message:</strong><br>
        <span style="white-space: pre-wrap;">${sanitizedData.message}</span>
      </div>
      <p>Best regards,<br>SyncBase Team</p>
    `;

    await sendEmail(
      sanitizedData.email,
      confirmationSubject,
      confirmationText,
      confirmationHtml
    );
  } catch (emailError) {
    console.error('Failed to send confirmation email:', emailError);
  }

  res.json({
    success: true,
    message: 'Thank you for your message! We will get back to you within 24 hours.',
    data: {
      id: contact._id,
      submittedAt: contact.createdAt
    }
  });
});

const getContacts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = 'all' } = req.query;
  
  const query = status !== 'all' ? { status } : {};
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const contacts = await Contact.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .select('-__v');
  
  const total = await Contact.countDocuments(query);
  
  res.json({
    success: true,
    data: {
      contacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }
  });
});

const updateContactStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  if (!['new', 'read', 'replied', 'closed'].includes(status)) {
    throw new ValidationError('Invalid status. Must be one of: new, read, replied, closed');
  }
  
  const contact = await Contact.findByIdAndUpdate(
    id,
    { status, updatedAt: new Date() },
    { new: true, runValidators: true }
  );
  
  if (!contact) {
    throw new AppError('Contact not found', 404);
  }
  
  res.json({
    success: true,
    message: 'Contact status updated successfully',
    data: contact
  });
});

module.exports = {
  submitContact,
  getContacts,
  updateContactStatus,
  contactRateLimit
};
