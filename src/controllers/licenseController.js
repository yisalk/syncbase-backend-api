const { validateLicense } = require('../services/licenseService');
const { getLicenseKeyFromHash, createLicense } = require('../utils/licenseUtils');
const License = require('../models/License');
const User = require('../models/User');
const userService = require('../services/userService');
const { asyncHandler, ValidationError, NotFoundError } = require('../utils/errorHandler');

exports.validateLicense = async (req, res) => {
  try {
    const { licenseKey, machineId, type = 'validate' } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ 
        valid: false, 
        message: 'licenseKey is required' 
      });
    }

    if (!type || !['validate', 'syncing'].includes(type)) {
      return res.status(400).json({ 
        valid: false, 
        message: 'type must be either "validate" or "syncing"' 
      });
    }

    const cleanKey = licenseKey.replace(/-/g, '');
    if (cleanKey.length !== 32 || !/^[A-Z2-9]+$/.test(cleanKey)) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Invalid license key format' 
      });
    }

    const result = await validateLicense(licenseKey, machineId, type);    
    if (!result.valid) {
      return res.status(401).json({ 
        valid: false, 
        message: result.error || 'Invalid license key',
        nextResetTime: result.nextResetTime || null
      });
    }

    return res.json({
      valid: true,
      licenseInfo: result,
    });
  } catch (err) {
    console.error('License validation error:', err);
    res.status(500).json({ 
      valid: false, 
      message: 'Internal server error' 
    });
  }
};

exports.getUserLicenses = async (req, res) => {
  try {
    // Get user email from auth middleware
    const userEmail = req.userEmail;

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    // Find all licenses for this user
    const licenses = await License.find({ userId: user._id });
    
    // Format licenses for frontend with decrypted license keys
    const formattedLicenses = licenses.map(license => {
      let licenseKey = null;
      try {
        // Decrypt the license key from the stored hash
        licenseKey = getLicenseKeyFromHash(license.licenseKeyHash);
      } catch (error) {
        console.error('Error decrypting license key for license:', license._id, error.message);
        // Continue without license key if decryption fails
      }
      
      return {
        id: license._id,
        type: license.type,
        status: license.status,
        validFrom: license.validFrom,
        validTo: license.validTo,
        features: license.features,
        createdAt: license.createdAt,
        licenseKey // Include the decrypted license key
      };
    });

    res.json(formattedLicenses);
  } catch (err) {
    console.error('Get user licenses error:', err);
    res.status(500).json({ 
      message: 'Internal server error' 
    });
  }
};

exports.createFreeLicense = asyncHandler(async (req, res) => {
  const { userInfo } = req.body;

  if (!userInfo || !userInfo.email || !userInfo.name) {
    throw new ValidationError('User information is required');
  }
  const user = await userService.createOrUpdateUser(userInfo, {
    planName: 'Free Trial',
    planPrice: 0,
    planPeriod: '10 days'
  });
  const existingLicense = await License.findOne({ 
    userId: user._id, 
    type: 'free trial' 
  });

  if (existingLicense) {
    let licenseKey = null;
    try {
      licenseKey = getLicenseKeyFromHash(existingLicense.licenseKeyHash);
    } catch (error) {
      console.error('Error decrypting existing license key:', error);
    }
    
    return res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          company: user.company
        },
        license: {
          id: existingLicense._id,
          type: existingLicense.type,
          status: existingLicense.status,
          validFrom: existingLicense.validFrom,
          validTo: existingLicense.validTo,
          features: existingLicense.features,
          createdAt: existingLicense.createdAt,
          licenseKey
        }
      }
    });
  }

  const validFrom = new Date();
  const validTo = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

  const { licenseKey, license } = await createLicense(
    user._id,
    'free trial',
    validFrom,
    validTo
  );

  res.json({
    success: true,
    data: {
      user: {
        name: user.name,
        email: user.email,
        company: user.company
      },
      license: {
        id: license._id,
        type: license.type,
        status: license.status,
        validFrom: license.validFrom,
        validTo: license.validTo,
        features: license.features,
        createdAt: license.createdAt,
        licenseKey
      }
    }
  });
});