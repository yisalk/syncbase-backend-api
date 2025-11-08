const { generateLicenseKey } = require('../services/licenseService');
const licenseCrypto = require('../services/licenseCrypto');
const License = require('../models/License');

exports.createLicense = async (userId, type, validFrom, validTo, features = {}) => {
  try {
    // Generate unique license key
    let licenseKey;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      licenseKey = generateLicenseKey();
      // Encrypt the license key for storage
      const encryptedHash = licenseCrypto.encryptLicenseKey(licenseKey);
      const existingLicense = await License.findOne({ 
        licenseKeyHash: encryptedHash 
      });
      
      if (!existingLicense) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique license key after multiple attempts');
    }

    // Create license in database with encrypted hash
    const encryptedHash = licenseCrypto.encryptLicenseKey(licenseKey);
    const licenseFeatures = exports.getLicenseFeatures(type);
    const license = new License({
      licenseKeyHash: encryptedHash,
      type,
      validFrom,
      validTo,
      userId,
      features: { ...features, ...licenseFeatures },
      status: 'active',
      remainingSyncs: licenseFeatures.remainingSyncs,
      lastSyncReset: new Date(),
      totalSyncsUsed: 0
    });

    await license.save();

    return {
      licenseKey,
      license
    };
  } catch (error) {
    throw new Error(`Failed to create license: ${error.message}`);
  }
};

exports.getLicenseKeyFromHash = (encryptedHash) => {
  try {
    return licenseCrypto.decryptLicenseKey(encryptedHash);
  } catch (error) {
    console.error('Error decrypting license key:', error);
    throw new Error('Failed to decrypt license key');
  }
};

exports.getLicenseFeatures = (type) => {
  const features = {
    free: {
      maxDataMonths: 1,
      maxMachines: 1,
      supportLevel: 'basic',
      features: ['basic_data_extraction'],
      dailySyncs: 1,
      remainingSyncs: 1
    },
    'free trial': {
      maxDataMonths: 1,
      maxMachines: 1,
      supportLevel: 'basic',
      features: ['basic_data_extraction'],
      dailySyncs: 1,
      remainingSyncs: 1
    },
    monthly: {
      maxDataMonths: 12,
      maxMachines: 3,
      supportLevel: 'priority',
      features: ['basic_data_extraction', 'advanced_analytics', 'priority_support'],
      dailySyncs: 2,
      remainingSyncs: 2
    },
    yearly: {
      maxDataMonths: 24,
      maxMachines: 5,
      supportLevel: 'premium',
      features: ['basic_data_extraction', 'advanced_analytics', 'priority_support', 'custom_integrations'],
      dailySyncs: 5,
      remainingSyncs: 5
    }
  };

  return features[type] || features.free;
};
