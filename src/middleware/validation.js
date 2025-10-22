const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Registration validation
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  validate
];

// Login validation
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate
];

// Profile validation
const validateProfile = [
  body('age')
    .optional()
    .isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('height')
    .optional()
    .isFloat({ min: 50, max: 300 }).withMessage('Height must be between 50 and 300 cm'),
  body('weight')
    .optional()
    .isFloat({ min: 20, max: 500 }).withMessage('Weight must be between 20 and 500 kg'),
  body('activityLevel')
    .optional()
    .isIn(['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active'])
    .withMessage('Invalid activity level'),
  body('goal')
    .optional()
    .isIn(['Lose Weight', 'Maintain Weight', 'Gain Weight', 'Build Muscle', 'Improve Health'])
    .withMessage('Invalid goal'),
  validate
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProfile
};