const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  // Get token from Authorization header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // If no token is found, return a 403 (Forbidden) response
  if (!token) {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    // Verify the token using the JWT_SECRET from .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Add the user info from the token to the request object

    next(); // Call the next middleware or route handler
  } catch (error) {
    // If the token is invalid or expired, return an error message
    res.status(400).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
