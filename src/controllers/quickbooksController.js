const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');

const CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI; // e.g. https://yourdomain.com/api/quickbooks/callback
const AUTH_URL = 'https://appcenter.intuit.com/connect/oauth2';
const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
const SCOPE = 'com.intuit.quickbooks.accounting openid profile email phone address';

// In-memory state store for demo (use Redis or DB for production)
const stateStore = {};

exports.connect = (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  stateStore[state] = Date.now();
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    state,
  });
  res.redirect(`${AUTH_URL}?${params.toString()}`);
};

exports.callback = async (req, res) => {
  const { code, state, realmId } = req.query;
  if (!code || !state || !realmId) {
    return res.status(400).send('Missing code, state, or realmId');
  }
  // Validate state
  if (!stateStore[state]) {
    return res.status(400).send('Invalid state');
  }
  delete stateStore[state];

  try {
    // Exchange code for tokens
    const tokenRes = await axios.post(TOKEN_URL, querystring.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }), {
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    const {
      access_token,
      refresh_token,
      expires_in,
      x_refresh_token_expires_in
    } = tokenRes.data;

    // Redirect to desktop app listener with tokens and expiration info
    const redirectUrl = `http://localhost:8888?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}&realmId=${encodeURIComponent(realmId)}&access_token_expiry=${encodeURIComponent(expires_in)}&refresh_token_expiry=${encodeURIComponent(x_refresh_token_expires_in)}`;
    res.redirect(redirectUrl);
  } catch (err) {
    res.status(500).send('Token exchange failed: ' + err.message);
  }
};

exports.refreshToken = async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ message: 'refresh_token is required' });
  }
  try {
    const tokenRes = await axios.post(TOKEN_URL, querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token,
    }), {
      auth: {
        username: CLIENT_ID,
        password: CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
    });
    const {
      access_token,
      refresh_token: new_refresh_token,
      expires_in,
      x_refresh_token_expires_in
    } = tokenRes.data;
    res.json({
      access_token,
      refresh_token: new_refresh_token,
      expires_in,
      x_refresh_token_expires_in
    });
  } catch (err) {
    res.status(500).json({ message: 'Token refresh failed', error: err.message });
  }
};