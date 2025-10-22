const { body, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
const userValidationRules = {
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/\d/).withMessage('Password must contain at least one number'),
  ],
  
  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Invalid email format')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required'),
  ],
  
  updateProfile: [
    body('age').optional().isInt({ min: 13, max: 120 }).withMessage('Age must be between 13 and 120'),
    body('height').optional().isFloat({ min: 50, max: 300 }).withMessage('Height must be between 50 and 300 cm'),
    body('weight').optional().isFloat({ min: 20, max: 500 }).withMessage('Weight must be between 20 and 500 kg'),
    body('gender').optional().isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
    body('activityLevel').optional().isIn(['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active']).withMessage('Invalid activity level'),
    body('goal').optional().isIn(['Lose Weight', 'Maintain Weight', 'Gain Weight', 'Build Muscle', 'Improve Health']).withMessage('Invalid goal'),
  ]
};

// Food validation rules
const foodValidationRules = {
  addEntry: [
    body('foodName').notEmpty().withMessage('Food name is required'),
    body('mealType').isIn(['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drink']).withMessage('Invalid meal type'),
    body('quantity').isFloat({ min: 0.1 }).withMessage('Quantity must be greater than 0'),
    body('nutrition.calories').isFloat({ min: 0 }).withMessage('Calories must be 0 or greater'),
  ]
};

// Health metrics validation rules
const healthValidationRules = {
  addMetrics: [
    body('weight.value').optional().isFloat({ min: 20, max: 500 }).withMessage('Invalid weight'),
    body('steps.count').optional().isInt({ min: 0 }).withMessage('Steps must be 0 or greater'),
    body('water.consumed').optional().isInt({ min: 0 }).withMessage('Water consumed must be 0 or greater'),
    body('sleep.duration').optional().isFloat({ min: 0, max: 24 }).withMessage('Sleep duration must be between 0 and 24 hours'),
  ]
};

module.exports = {
  validate,
  userValidationRules,
  foodValidationRules,
  healthValidationRules
};