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
    select: false
  },
  
  // Profile Information
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
    dietaryPreferences: [{
      type: String,
      enum: ['Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Gluten-Free', 'Dairy-Free', 'Halal', 'Kosher']
    }],
    healthConditions: [{
      type: String,
      enum: ['Diabetes', 'Hypertension', 'Heart Disease', 'Asthma', 'Allergies', 'None']
    }],
    profileImage: {
      type: String,
      default: null
    }
  },
  
  // Calculated Fields
  bmi: {
    type: Number,
    default: 0
  },
  bmr: {
    type: Number,
    default: 0
  },
  dailyCalorieGoal: {
    type: Number,
    default: 2000
  },
  
  // Gamification
  gamification: {
    points: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: 1
    },
    streak: {
      current: {
        type: Number,
        default: 0
      },
      longest: {
        type: Number,
        default: 0
      }
    },
    badges: [{
      badgeId: String,
      name: String,
      earnedAt: Date
    }],
    achievements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    }]
  },
  
  // Settings
  settings: {
    notifications: {
      water: { type: Boolean, default: true },
      meals: { type: Boolean, default: true },
      exercise: { type: Boolean, default: true },
      sleep: { type: Boolean, default: true },
      challenges: { type: Boolean, default: true }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['Public', 'Friends', 'Private'],
        default: 'Friends'
      },
      shareProgress: { type: Boolean, default: true }
    },
    units: {
      weight: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
      height: { type: String, enum: ['cm', 'ft'], default: 'cm' },
      distance: { type: String, enum: ['km', 'miles'], default: 'km' }
    }
  },
  
  // Social
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    sentAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Authentication
  role: {
    type: String,
    enum: ['user', 'premium', 'admin'],
    default: 'user'
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Subscription
  subscription: {
    type: {
      type: String,
      enum: ['free', 'premium'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    autoRenew: {
      type: Boolean,
      default: false
    }
  },
  
  // Tracking
  lastActive: {
    type: Date,
    default: Date.now
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  
  // Device tokens for push notifications
  deviceTokens: [{
    token: String,
    platform: {
      type: String,
      enum: ['ios', 'android', 'web']
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'profile.age': 1, 'profile.gender': 1 });
userSchema.index({ 'gamification.points': -1 });
userSchema.index({ lastActive: -1 });

// Virtual for full profile completion
userSchema.virtual('profileCompletion').get(function() {
  const requiredFields = ['profile.age', 'profile.gender', 'profile.height', 'profile.weight', 'profile.goal'];
  const completed = requiredFields.filter(field => {
    const value = field.split('.').reduce((obj, key) => obj?.[key], this);
    return value !== undefined && value !== null;
  });
  return Math.round((completed.length / requiredFields.length) * 100);
});

// Calculate BMI and BMR before saving
userSchema.pre('save', function(next) {
  if (this.profile.height && this.profile.weight) {
    // Calculate BMI
    const heightInMeters = this.profile.height / 100;
    this.bmi = this.profile.weight / (heightInMeters * heightInMeters);
    
    // Calculate BMR using Mifflin-St Jeor Equation
    if (this.profile.age && this.profile.gender) {
      if (this.profile.gender === 'Male') {
        this.bmr = 10 * this.profile.weight + 6.25 * this.profile.height - 5 * this.profile.age + 5;
      } else {
        this.bmr = 10 * this.profile.weight + 6.25 * this.profile.height - 5 * this.profile.age - 161;
      }
      
      // Calculate daily calorie goal based on activity level and goal
      let activityMultiplier = 1.2;
      switch(this.profile.activityLevel) {
        case 'Lightly Active': activityMultiplier = 1.375; break;
        case 'Moderately Active': activityMultiplier = 1.55; break;
        case 'Very Active': activityMultiplier = 1.725; break;
        case 'Extra Active': activityMultiplier = 1.9; break;
      }
      
      let tdee = this.bmr * activityMultiplier;
      
      // Adjust for goal
      switch(this.profile.goal) {
        case 'Lose Weight': this.dailyCalorieGoal = tdee - 500; break;
        case 'Gain Weight': this.dailyCalorieGoal = tdee + 500; break;
        default: this.dailyCalorieGoal = tdee;
      }
    }
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      _id: this._id,
      email: this.email,
      role: this.role
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Add points method
userSchema.methods.addPoints = async function(points, reason) {
  this.gamification.points += points;
  
  // Level up logic (every 1000 points = 1 level)
  const newLevel = Math.floor(this.gamification.points / 1000) + 1;
  if (newLevel > this.gamification.level) {
    this.gamification.level = newLevel;
    // You can emit an event here for level up notification
  }
  
  await this.save();
  return this.gamification;
};

// Update streak
userSchema.methods.updateStreak = async function() {
  const lastActive = new Date(this.lastActive);
  const today = new Date();
  const diffDays = Math.floor((today - lastActive) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    this.gamification.streak.current += 1;
    if (this.gamification.streak.current > this.gamification.streak.longest) {
      this.gamification.streak.longest = this.gamification.streak.current;
    }
  } else if (diffDays > 1) {
    this.gamification.streak.current = 1;
  }
  
  this.lastActive = today;
  await this.save();
};

module.exports = mongoose.model('User', userSchema);