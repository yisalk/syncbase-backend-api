const crypto = require('crypto');
const License = require('../models/License');
const licenseCrypto = require('./licenseCrypto');

const BASE32_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

exports.generateLicenseKey = () => {
  let result = '';
  const randomBytes = crypto.randomBytes(32);
  
  for (let i = 0; i < 32; i++) {
    const randomIndex = randomBytes[i] % BASE32_ALPHABET.length;
    result += BASE32_ALPHABET[randomIndex];
  }
  return result.match(/.{1,4}/g).join('-');
};


/**
 * Reset remaining syncs for licenses that need daily reset
 */
exports.resetDailySyncs = async () => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Find licenses that need sync reset (monthly/yearly only, not free)
    const licensesToReset = await License.find({
      type: { $in: ['monthly', 'yearly'] },
      status: 'active',
      remainingSyncs: 0,
      lastSyncReset: { $lte: oneDayAgo }
    });
    
    for (const license of licensesToReset) {
      const features = license.features;
      const dailySyncs = features.dailySyncs || 0;
      
      await License.findByIdAndUpdate(license._id, {
        remainingSyncs: dailySyncs,
        lastSyncReset: now
      });
    }
    
    if (licensesToReset.length > 0) {
      console.log(`Reset daily syncs for ${licensesToReset.length} licenses`);
    }
    
    return licensesToReset.length;
  } catch (err) {
    console.error('Error resetting daily syncs:', err);
    return 0;
  }
};

/**
 * Auto-downgrade free licenses after 10 days
 */
exports.autoDowngradeFreeLicenses = async () => {
  try {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    
    const expiredFreeLicenses = await License.find({
      type: 'free',
      status: 'active',
      createdAt: { $lt: tenDaysAgo }
    });
    
    if (expiredFreeLicenses.length > 0) {
      await License.updateMany(
        {
          type: 'free',
          status: 'active',
          createdAt: { $lt: tenDaysAgo }
        },
        {
          $set: {
            status: 'expired',
            features: {
              maxDataMonths: 1,
              maxMachines: 1,
              supportLevel: 'basic',
              readOnly: true
            }
          }
        }
      );
      
      console.log(`Auto-downgraded ${expiredFreeLicenses.length} free licenses`);
    }
    
    return expiredFreeLicenses.length;
  } catch (err) {
    console.error('Error auto-downgrading free licenses:', err);
    return 0;
  }
};

/**
 * Validate license from database
 */
exports.validateLicense = async (licenseKey, machineId = null, type = 'validate') => {
  try {
    // First, run auto-downgrade and sync reset checks
    await exports.autoDowngradeFreeLicenses();
    await exports.resetDailySyncs();
    
    const license = await License.findOne({ 
      licenseKeyHash: licenseCrypto.encryptLicenseKey(licenseKey),
      status: 'active'
    }).populate('userId');
    
    if (!license) {
      return { valid: false, error: 'Invalid license key' };
    }
    
    // Check if expired
    if (new Date() > license.validTo) {
      return { valid: false, error: 'License has expired' };
    }
    
    // Check if not yet valid
    if (new Date() < license.validFrom) {
      return { valid: false, error: 'License not yet valid' };
    }
    
    // Optional machine ID binding
    if (machineId && license.machineId && license.machineId !== machineId) {
      return { valid: false, error: 'License is bound to a different machine' };
    }
    
    // Calculate sync allowed status
    const isActive = license.status === 'active';
    const notExpired = new Date() <= license.validTo;
    const hasRemainingSyncs = license.remainingSyncs > 0;
    const syncAllowed = isActive && notExpired && hasRemainingSyncs;
    
    // Handle different types
    if (type === 'syncing') {
      // Check if sync is allowed
      if (!syncAllowed) {
        const nextResetTime = new Date(license.lastSyncReset.getTime() + 24 * 60 * 60 * 1000);
        return { 
          valid: false, 
          error: 'You have used all your syncs today, it will reset at ' + nextResetTime.toISOString(),
          nextResetTime: nextResetTime
        };
      }
      
      // Decrease remaining syncs
      const updatedLicense = await License.findByIdAndUpdate(
        license._id,
        { 
          $inc: { remainingSyncs: -1, totalSyncsUsed: 1 },
          $set: { lastValidated: new Date() }
        },
        { new: true }
      ).populate('userId');
      
      return {
        valid: true,
        license: {
          licenseKey,
          type: updatedLicense.type,
          status: updatedLicense.status,
          validFrom: updatedLicense.validFrom,
          validTo: updatedLicense.validTo,
          features: {
            ...updatedLicense.features,
            remainingSyncs: updatedLicense.remainingSyncs,
            syncAllowed: true
          },
          machineId: updatedLicense.machineId,
          user: updatedLicense.userId
        }
      };
    } else {
      // For validate type, add machineId if provided and not already set
      if (machineId && !license.machineId) {
        await License.findByIdAndUpdate(license._id, { machineId });
        license.machineId = machineId;
      }
      
      return {
        valid: true,
        license: {
          licenseKey,
          type: license.type,
          status: license.status,
          validFrom: license.validFrom,
          validTo: license.validTo,
          features: {
            ...license.features,
            remainingSyncs: license.remainingSyncs,
            syncAllowed
          },
          machineId: license.machineId,
          user: license.userId
        }
      };
    }
  } catch (err) {
    return { valid: false, error: 'Database error during validation' };
  }
}; 