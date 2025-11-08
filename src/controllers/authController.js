const User = require('../models/User');
const { createLicense, getLicenseFeatures } = require('../utils/licenseUtils');
const sendEmail = require('../services/emailService');

exports.register = async (req, res) => {
  try {
    const { name, company, email, phone, zip } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Create user
    let user;
    try {
      user = await User.create({ name, company, email, phone, zip });
    } catch (userErr) {
      return res.status(500).json({ message: 'Failed to create user', error: userErr.message });
    }

    // Create license using the new system
    const now = new Date();
    const validTo = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days
    const features = getLicenseFeatures('free');

    let licenseData;
    try {
      licenseData = await createLicense(user._id, 'free', now, validTo, features);
    } catch (licenseErr) {
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: 'Failed to create license', error: licenseErr.message });
    }

    // Send email (optional: handle errors separately)
    const downloadUrl = process.env.CLIENT_DOWNLOAD_URL || 'https://your-download-link.com';
    await sendEmail(
      email,
      'Your Syncbase QB Free License',
      `Download: ${downloadUrl}\nLicense Key: ${licenseData.licenseKey}`,
      `<p>Download: <a href="${downloadUrl}">${downloadUrl}</a><br>License Key: <b>${licenseData.licenseKey}</b></p>`
    );

    res.status(200).json({
      message: 'Registration successful',
      user: { name, company, email, phone, zip },
      license: { 
        licenseKey: licenseData.licenseKey, 
        type: 'free', 
        validFrom: now, 
        validTo, 
        features 
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal Server error' });
  }
}