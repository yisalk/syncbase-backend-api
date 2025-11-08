You are a senior backend developer working on a MERN-based SaaS product that manages licensing for a desktop application called Syncbase QB. Your task is to build a secure, scalable, and production-ready Node.js (Express) backend, connected to MongoDB, to handle the following functionality:

🎯 Project Requirements
1. User Registration (Free License)
Accept a POST request to /register with:

ProAdvisor Name

Company Name

Email

Phone Number

Zip/Postal Code

Save data to MongoDB

Generate a unique license key

Set license type to "free", valid for 10 days, and allow only 1 month of QBO data extraction

Send a download link + license key to the user's email using SendGrid/Postmark/Resend

2. Stripe Payment Integration
Create Stripe checkout sessions for:

Monthly License ($24.99, recurring)

Yearly License ($299, one-time or recurring)

After successful payment:

Upgrade user license to "monthly" or "yearly"

Set correct expiry

Send email confirmation + updated license key

Use Stripe webhooks to listen for:

invoice.paid, invoice.payment_failed, subscription.deleted

On failure/cancellation, suspend or downgrade license

3. License Validation Endpoint (for Desktop App)
/validate-license

Accepts licenseKey and optionally a machine identifier

Returns license status, expiry date, and features

Block if expired or suspended

4. Security Best Practices
Use environment variables via dotenv

Input validation using Joi or express-validator

Sanitize inputs against XSS/NoSQL injection

Rate-limit external endpoints (express-rate-limit)

Store license keys securely (hashed optional or signed JWTs)

5. MongoDB Models
User

name, company, email, phone, zip, createdAt

License

licenseKey, type (free, monthly, yearly), validFrom, validTo, status, userId, machineId, features

📦 Tech Stack
Node.js + Express

MongoDB + Mongoose

Stripe SDK

Email Service (SendGrid / Postmark / Resend)

Validation: Joi or express-validator

Security: Helmet, CORS, Rate Limiting, dotenv

📁 Output Expectation
A modular project structure (routes, controllers, services, models)

Ready-to-deploy Express app (ideally with one-click setup)

Reusable functions (e.g., generateLicenseKey, validateLicense)

Test routes (Postman or curl instructions)

Start with the folder structure and implement endpoints in logical order:

Register & free license

Stripe checkout & webhook

License validation endpoint

Email logic

Security layers

---

## 📂 Folder Structure

- src/
  - app.js              # Express app entry point
  - config/
    - db.js             # MongoDB connection
    - stripe.js         # Stripe config
    - email.js          # Email service config
  - models/
    - User.js           # User Mongoose model
    - License.js        # License Mongoose model
  - routes/
    - auth.js           # Registration/login routes
    - license.js        # License validation routes
    - payment.js        # Stripe payment/webhook routes
  - controllers/
    - authController.js
    - licenseController.js
    - paymentController.js
  - services/
    - licenseService.js # License generation/validation logic
    - emailService.js   # Email sending logic
    - stripeService.js  # Stripe logic
  - middlewares/
    - validate.js       # Input validation
    - rateLimiter.js    # Rate limiting
    - errorHandler.js   # Error handling
    - security.js       # Helmet, CORS, etc.
  - utils/
    - generateLicenseKey.js
    - ...
  - tests/
    - (test files)
.env.example            # Example environment variables
.gitignore
package.json
README.md