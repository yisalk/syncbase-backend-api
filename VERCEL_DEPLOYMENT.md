# Vercel Deployment Guide

This guide will help you deploy your Express backend to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Vercel CLI installed (optional, for CLI deployment):
   ```bash
   npm i -g vercel
   ```

## Deployment Steps

### 1. Prepare Your Repository

Make sure your code is committed and pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Connect Your Project to Vercel

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect the project settings

#### Option B: Via Vercel CLI

```bash
cd /Users/square63/MERN/server
vercel
```

Follow the prompts to link your project.

### 3. Configure Environment Variables

In the Vercel dashboard, go to your project settings → Environment Variables and add all the following variables:

#### Required Environment Variables

```
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=production
```

#### Stripe Configuration
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRICE_ID_MONTHLY=your_monthly_price_id
STRIPE_PRICE_ID_YEARLY=your_yearly_price_id
```

#### License & Encryption
```
LICENSE_SECRET_KEY=your_license_secret_key
LICENSE_ENCRYPTION_KEY=your_license_encryption_key
LICENSE_API_KEY=your_license_api_key
```

#### QuickBooks Integration
```
QUICKBOOKS_CLIENT_ID=your_quickbooks_client_id
QUICKBOOKS_CLIENT_SECRET=your_quickbooks_client_secret
QUICKBOOKS_REDIRECT_URI=your_quickbooks_redirect_uri
```

#### Email Service
```
EMAIL_SERVICE_HOST=your_email_host
EMAIL_SERVICE_PORT=your_email_port
EMAIL_SERVICE_USER=your_email_user
EMAIL_SERVICE_PASS=your_email_password
EMAIL_FROM=your_from_email_address
```

#### Other
```
CLIENT_DOWNLOAD_URL=your_client_download_url
```

**Important Notes:**
- Add these variables for **Production**, **Preview**, and **Development** environments as needed
- For sensitive values, mark them as "Encrypted"
- After adding variables, you'll need to redeploy for them to take effect

### 4. Configure Build Settings

Vercel should auto-detect your Node.js project. The build settings should be:
- **Framework Preset:** Other
- **Build Command:** (leave empty or use `npm install`)
- **Output Directory:** (leave empty)
- **Install Command:** `npm install`

### 5. Deploy

#### Via Dashboard:
- Push to your main branch, and Vercel will auto-deploy
- Or click "Redeploy" in the dashboard

#### Via CLI:
```bash
vercel --prod
```

### 6. Update Webhook URLs

After deployment, update your external service webhook URLs:

- **Stripe Webhooks:** Update the webhook endpoint to:
  `https://your-project.vercel.app/api/payment/webhook`

- **QuickBooks Redirect URI:** Update to:
  `https://your-project.vercel.app/api/quickbooks/callback` (or your configured path)

## Important Considerations

### Cron Jobs

⚠️ **Note:** The cron jobs in `src/services/cronService.js` will **NOT** work in Vercel's serverless environment because:
- Serverless functions are stateless and don't run continuously
- `node-cron` requires a persistent process

**Solutions:**

1. **Use Vercel Cron Jobs** (Recommended):
   - Create a `vercel.json` cron configuration
   - Set up scheduled functions for your cron tasks
   - See [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)

2. **Use External Cron Service:**
   - Use services like [cron-job.org](https://cron-job.org) or [EasyCron](https://www.easycron.com)
   - Set up HTTP requests to your API endpoints that trigger the cron logic

3. **Create Separate Cron Endpoints:**
   - Create API endpoints that can be called by external cron services
   - Example: `/api/cron/daily-downgrade`, `/api/cron/hourly-reset`

### MongoDB Connection

The MongoDB connection is optimized for serverless:
- Connection pooling is enabled
- Connections are cached and reused
- The connection will be established on the first request

### Google Cloud Secret Manager

The code checks for Google Cloud Secret Manager, but on Vercel, you should use Vercel's environment variables instead. The code will automatically use environment variables when `GOOGLE_APPLICATION_CREDENTIALS` is not set.

## Testing Your Deployment

1. Check the deployment logs in Vercel dashboard
2. Test your API endpoints:
   ```bash
   curl https://your-project.vercel.app/api/auth/health
   ```
3. Monitor function logs in the Vercel dashboard

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors:**
   - Verify `MONGODB_URI` is set correctly
   - Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for Vercel)
   - Ensure MongoDB connection string includes authentication

2. **Environment Variables Not Working:**
   - Make sure variables are added for the correct environment (Production/Preview/Development)
   - Redeploy after adding new variables
   - Check variable names match exactly (case-sensitive)

3. **Function Timeout:**
   - Vercel has execution time limits (10s for Hobby, 60s for Pro)
   - Optimize slow database queries
   - Consider breaking up large operations

4. **CORS Issues:**
   - Update CORS settings in `src/middlewares/security.js` to include your frontend domain

## Project Structure for Vercel

```
server/
├── api/
│   └── index.js          # Vercel serverless function entry point
├── src/
│   ├── app.js            # Express app configuration
│   ├── server.js         # Local development server
│   └── ...               # Your application code
├── vercel.json           # Vercel configuration
└── package.json          # Dependencies
```

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review function logs in the Vercel dashboard
3. Verify all environment variables are set correctly
4. Test endpoints individually to isolate issues

