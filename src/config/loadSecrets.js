const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');

const client = new SecretManagerServiceClient();

// List of secret short names (matches your env variable names)
const secretNames = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MONGODB_URI',
  'LICENSE_SECRET_KEY',
  'LICENSE_ENCRYPTION_KEY',
  'CLIENT_DOWNLOAD_URL',
  'QUICKBOOKS_CLIENT_ID',
  'QUICKBOOKS_CLIENT_SECRET',
  'QUICKBOOKS_REDIRECT_URI',
  'STRIPE_PRICE_ID_MONTHLY',
  'STRIPE_PRICE_ID_YEARLY',
  'LICENSE_API_KEY',
  'EMAIL_SERVICE_HOST',
  'EMAIL_SERVICE_PORT',
  'EMAIL_SERVICE_USER',
  'EMAIL_SERVICE_PASS',
  'EMAIL_FROM'
];

async function accessSecret(projectId, secretShortName) {
  const name = `projects/${projectId}/secrets/${secretShortName}/versions/latest`;
  const [version] = await client.accessSecretVersion({ name });
  return version.payload.data.toString('utf8');
}

async function loadSecrets() {
  const projectId = await client.getProjectId();
  for (const envVar of secretNames) {
    try {
      process.env[envVar] = await accessSecret(projectId, envVar);
    } catch (err) {
      console.warn(`Could not load secret for ${envVar}:`, err.message);
    }
  }
}

module.exports = loadSecrets; 