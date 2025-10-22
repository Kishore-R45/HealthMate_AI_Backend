const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded._id).select('-password');
    
    if (!user) {
      throw new Error();
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    // Update last active
    user.lastActive = new Date();
    await user.save();
    
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Please authenticate'
    });
  }
};

// Admin middleware
const adminAuth = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Premium middleware
const premiumAuth = async (req, res, next) => {
  if (req.user.role !== 'premium' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Premium subscription required'
    });
  }
  next();
};

module.exports = { auth, adminAuth, premiumAuth };