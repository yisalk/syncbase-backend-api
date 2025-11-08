const crypto = require('crypto');

class LicenseCrypto {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.secretKey = process.env.LICENSE_ENCRYPTION_KEY || "302eb561c91cb9fbbe82afac5b9e680bc33c5f4da1d51b73db08752b8296d584";
  }

  generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  getKey() {
    return crypto.scryptSync(this.secretKey, 'salt', 32);
  }

  encryptLicenseKey(licenseKey) {
    try {
      const iv = Buffer.from('1234567890123456');
      const key = this.getKey();
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      let encrypted = cipher.update(licenseKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Error encrypting license key:', error);
      throw new Error('Failed to encrypt license key');
    }
  }

  decryptLicenseKey(encryptedHash) {
    try {
      const parts = encryptedHash.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted hash format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = this.getKey();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting license key:', error);
      throw new Error('Failed to decrypt license key');
    }
  }

  verifyLicenseKey(licenseKey, storedHash) {
    try {
      const decryptedKey = this.decryptLicenseKey(storedHash);
      return licenseKey === decryptedKey;
    } catch (error) {
      console.error('Error verifying license key:', error);
      return false;
    }
  }
}

module.exports = new LicenseCrypto();