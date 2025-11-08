// Simple auth middleware - in production, you'd verify the Auth0 token properly
const auth = (req, res, next) => {
  try {
    // For now, we'll get user email from headers or query params
    // In production, you'd verify the Auth0 JWT token here
    const userEmail = req.headers['x-user-email'] || req.query.email;
    
    if (!userEmail) {
      return res.status(401).json({ message: 'User email is required' });
    }
    
    req.userEmail = userEmail;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = { auth };
