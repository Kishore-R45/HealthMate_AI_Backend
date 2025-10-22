const mongoose = require('mongoose');

const healthMetricSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Physical Metrics
  weight: {
    value: Number, // in kg
    unit: {
      type: String,
      enum: ['kg', 'lbs'],
      default: 'kg'
    }
  },
  
  bodyMeasurements: {
    chest: Number,
    waist: Number,
    hips: Number,
    thighs: Number,
    arms: Number,
    neck: Number
  },
  
  // Activity Metrics
  steps: {
    count: {
      type: Number,
      default: 0
    },
    goal: {
      type: Number,
      default: 10000
    },
    distance: Number, // in km
    activeMinutes: Number,
    caloriesBurned: Number
  },
  
  // Water Intake
  water: {
    consumed: {
      type: Number,
      default: 0
    },
    goal: {
      type: Number,
      default: 8
    },
    unit: {
      type: String,
      enum: ['glasses', 'ml', 'oz'],
      default: 'glasses'
    },
    reminders: [{
      time: Date,
      consumed: Boolean
    }]
  },
  
  // Sleep Data
  sleep: {
    duration: Number, // in hours
    quality: {
      type: String,
      enum: ['Poor', 'Fair', 'Good', 'Excellent']
    },
    bedTime: Date,
    wakeTime: Date,
    deepSleep: Number, // in hours
    lightSleep: Number,
    remSleep: Number,
    awakeTime: Number,
    interruptions: Number
  },
  
  // Vital Signs
  vitals: {
    heartRate: {
      resting: Number,
      average: Number,
      max: Number,
      min: Number,
      measurements: [{
        value: Number,
        timestamp: Date
      }]
    },
    bloodPressure: {
      systolic: Number,
      diastolic: Number,
      pulse: Number,
      timestamp: Date
    },
    bloodSugar: {
      value: Number,
      type: {
        type: String,
        enum: ['Fasting', 'Post-Meal', 'Random'],
        default: 'Random'
      },
      timestamp: Date
    },
    temperature: {
      value: Number,
      unit: {
        type: String,
        enum: ['C', 'F'],
        default: 'C'
      }
    },
    oxygenSaturation: Number
  },
  
  // Mental Wellness
  mood: {
    rating: {
      type: Number,
      min: 1,
      max: 10
    },
    emotions: [{
      type: String,
      enum: ['Happy', 'Sad', 'Anxious', 'Stressed', 'Calm', 'Energetic', 'Tired', 'Motivated']
    }],
    notes: String,
    stressLevel: {
      type: Number,
      min: 1,
      max: 10
    }
  },
  
  // Exercise
  exercises: [{
    type: {
      type: String,
      enum: ['Cardio', 'Strength', 'Flexibility', 'Sports', 'Yoga', 'Other']
    },
    name: String,
    duration: Number, // in minutes
    caloriesBurned: Number,
    intensity: {
      type: String,
      enum: ['Low', 'Moderate', 'High']
    },
    notes: String
  }],
  
  // Symptoms Tracking
  symptoms: [{
    name: String,
    severity: {
      type: Number,
      min: 1,
      max: 10
    },
    timestamp: Date,
    notes: String
  }],
  
  // Medication Tracking
  medications: [{
    name: String,
    dosage: String,
    taken: Boolean,
    time: Date,
    notes: String
  }],
  
  // Women's Health
  womensHealth: {
    periodStart: Date,
    periodEnd: Date,
    flow: {
      type: String,
      enum: ['Light', 'Medium', 'Heavy']
    },
    symptoms: [String],
    ovulation: Date,
    pregnant: Boolean
  },
  
  // Daily Scores
  scores: {
    overall: {
      type: Number,
      min: 0,
      max: 100
    },
    nutrition: {
      type: Number,
      min: 0,
      max: 100
    },
    activity: {
      type: Number,
      min: 0,
      max: 100
    },
    sleep: {
      type: Number,
      min: 0,
      max: 100
    },
    hydration: {
      type: Number,
      min: 0,
      max: 100
    },
    mental: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  // Data Source
  dataSource: {
    type: String,
    enum: ['manual', 'apple_health', 'google_fit', 'fitbit', 'garmin', 'samsung_health'],
    default: 'manual'
  }
}, {
  timestamps: true
});

// Indexes
healthMetricSchema.index({ user: 1, date: -1 });
healthMetricSchema.index({ user: 1, 'date': -1 }, { unique: true });

// Pre-save hook to calculate scores
healthMetricSchema.pre('save', function(next) {
  // Calculate hydration score
  if (this.water.goal > 0) {
    this.scores.hydration = Math.min(100, (this.water.consumed / this.water.goal) * 100);
  }
  
  // Calculate activity score
  if (this.steps.goal > 0) {
    const stepScore = (this.steps.count / this.steps.goal) * 100;
    const exerciseBonus = this.exercises.length * 10;
    this.scores.activity = Math.min(100, stepScore + exerciseBonus);
  }
  
  // Calculate sleep score
  if (this.sleep.duration) {
    const idealSleep = 8;
    const sleepDiff = Math.abs(this.sleep.duration - idealSleep);
    this.scores.sleep = Math.max(0, 100 - (sleepDiff * 12.5));
  }
  
  // Calculate mental score
  if (this.mood.rating) {
    this.scores.mental = this.mood.rating * 10;
  }
  
  // Calculate overall score (weighted average)
  const scores = [
    this.scores.nutrition || 0,
    this.scores.activity || 0,
    this.scores.sleep || 0,
    this.scores.hydration || 0,
    this.scores.mental || 0
  ];
  
  const weights = [0.3, 0.25, 0.2, 0.15, 0.1];
  let weightedSum = 0;
  let totalWeight = 0;
  
  scores.forEach((score, index) => {
    if (score > 0) {
      weightedSum += score * weights[index];
      totalWeight += weights[index];
    }
  });
  
  if (totalWeight > 0) {
    this.scores.overall = Math.round(weightedSum / totalWeight);
  }
  
  next();
});

// Static method to get weekly summary
healthMetricSchema.statics.getWeeklySummary = async function(userId, startDate) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  
  const metrics = await this.find({
    user: userId,
    date: {
      $gte: startDate,
      $lt: endDate
    }
  }).sort({ date: 1 });
  
  return {
    metrics,
    averages: {
      steps: metrics.reduce((sum, m) => sum + (m.steps?.count || 0), 0) / metrics.length,
      water: metrics.reduce((sum, m) => sum + (m.water?.consumed || 0), 0) / metrics.length,
      sleep: metrics.reduce((sum, m) => sum + (m.sleep?.duration || 0), 0) / metrics.length,
      overallScore: metrics.reduce((sum, m) => sum + (m.scores?.overall || 0), 0) / metrics.length
    }
  };
};

module.exports = mongoose.model('HealthMetric', healthMetricSchema);