const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false // Don't return password by default
  },
  
  // Profile Information (collected after registration)
  profile: {
    age: {
      type: Number,
      min: 13,
      max: 120
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other']
    },
    height: {
      type: Number, // in cm
      min: 50,
      max: 300
    },
    weight: {
      type: Number, // in kg
      min: 20,
      max: 500
    },
    activityLevel: {
      type: String,
      enum: ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extra Active'],
      default: 'Moderately Active'
    },
    goal: {
      type: String,
      enum: ['Lose Weight', 'Maintain Weight', 'Gain Weight', 'Build Muscle', 'Improve Health'],
      default: 'Improve Health'
    },
    profileImage: String
  },
  
  // Calculated Fields
  bmi: Number,
  bmr: Number,
  dailyCalorieGoal: {
    type: Number,
    default: 2000
  },
  
  // Account Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Authentication Tokens
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Timestamps
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
userSchema.index({ email: 1 });

// Calculate BMI and BMR before saving
userSchema.pre('save', function(next) {
  if (this.profile.height && this.profile.weight) {
    // Calculate BMI
    const heightInMeters = this.profile.height / 100;
    this.bmi = parseFloat((this.profile.weight / (heightInMeters * heightInMeters)).toFixed(2));
    
    // Calculate BMR using Mifflin-St Jeor Equation
    if (this.profile.age && this.profile.gender) {
      if (this.profile.gender === 'Male') {
        this.bmr = Math.round(10 * this.profile.weight + 6.25 * this.profile.height - 5 * this.profile.age + 5);
      } else {
        this.bmr = Math.round(10 * this.profile.weight + 6.25 * this.profile.height - 5 * this.profile.age - 161);
      }
      
      // Calculate daily calorie goal
      let activityMultiplier = 1.2;
      switch(this.profile.activityLevel) {
        case 'Lightly Active': activityMultiplier = 1.375; break;
        case 'Moderately Active': activityMultiplier = 1.55; break;
        case 'Very Active': activityMultiplier = 1.725; break;
        case 'Extra Active': activityMultiplier = 1.9; break;
      }
      
      let tdee = this.bmr * activityMultiplier;
      
      switch(this.profile.goal) {
        case 'Lose Weight': this.dailyCalorieGoal = Math.round(tdee - 500); break;
        case 'Gain Weight': this.dailyCalorieGoal = Math.round(tdee + 500); break;
        default: this.dailyCalorieGoal = Math.round(tdee);
      }
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    _id: this._id,
    email: this.email,
    name: this.name
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
  const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailVerificationToken = verificationToken;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verificationToken;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  this.passwordResetToken = resetToken;
  this.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
  return resetToken;
};

module.exports = mongoose.model('User', userSchema);