const mongoose = require('mongoose');

const foodEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Food Information
  foodName: {
    type: String,
    required: true
  },
  brand: String,
  barcode: String,
  image: String,
  
  // Meal Type
  mealType: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Drink'],
    required: true
  },
  
  // Portion Information
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  unit: {
    type: String,
    default: 'serving'
  },
  servingSize: {
    value: Number,
    unit: String
  },
  
  // Nutritional Information (per serving)
  nutrition: {
    calories: {
      type: Number,
      required: true,
      min: 0
    },
    protein: {
      type: Number,
      default: 0,
      min: 0
    },
    carbs: {
      type: Number,
      default: 0,
      min: 0
    },
    fat: {
      type: Number,
      default: 0,
      min: 0
    },
    fiber: {
      type: Number,
      default: 0,
      min: 0
    },
    sugar: {
      type: Number,
      default: 0,
      min: 0
    },
    sodium: {
      type: Number,
      default: 0,
      min: 0
    },
    cholesterol: {
      type: Number,
      default: 0,
      min: 0
    },
    // Vitamins and minerals
    vitamins: {
      vitaminA: Number,
      vitaminC: Number,
      vitaminD: Number,
      vitaminE: Number,
      vitaminK: Number,
      vitaminB6: Number,
      vitaminB12: Number
    },
    minerals: {
      calcium: Number,
      iron: Number,
      magnesium: Number,
      phosphorus: Number,
      potassium: Number,
      zinc: Number
    }
  },
  
  // AI Recognition Data
  recognitionData: {
    method: {
      type: String,
      enum: ['manual', 'barcode', 'ai_recognition', 'voice', 'quick_add'],
      default: 'manual'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    alternatives: [{
      name: String,
      confidence: Number
    }],
    userConfirmed: {
      type: Boolean,
      default: true
    }
  },
  
  // Metadata
  date: {
    type: Date,
    default: Date.now
  },
  loggedAt: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined
    }
  },
  notes: String,
  
  // User Feedback
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  tags: [String], // ['healthy', 'homemade', 'restaurant', etc.]
  
  // Sync Status
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced'
  }
}, {
  timestamps: true
});

// Indexes
foodEntrySchema.index({ user: 1, date: -1 });
foodEntrySchema.index({ user: 1, mealType: 1, date: -1 });
foodEntrySchema.index({ foodName: 'text' });
foodEntrySchema.index({ location: '2dsphere' });

// Virtual for total calories (quantity * calories per serving)
foodEntrySchema.virtual('totalCalories').get(function() {
  return this.quantity * this.nutrition.calories;
});

// Virtual for total macros
foodEntrySchema.virtual('totalMacros').get(function() {
  return {
    protein: this.quantity * this.nutrition.protein,
    carbs: this.quantity * this.nutrition.carbs,
    fat: this.quantity * this.nutrition.fat
  };
});

// Static method to get daily summary
foodEntrySchema.statics.getDailySummary = async function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const entries = await this.find({
    user: userId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
  
  const summary = {
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    totalFiber: 0,
    mealBreakdown: {
      Breakfast: { calories: 0, count: 0 },
      Lunch: { calories: 0, count: 0 },
      Dinner: { calories: 0, count: 0 },
      Snack: { calories: 0, count: 0 },
      Drink: { calories: 0, count: 0 }
    },
    entries: entries
  };
  
  entries.forEach(entry => {
    summary.totalCalories += entry.quantity * entry.nutrition.calories;
    summary.totalProtein += entry.quantity * entry.nutrition.protein;
    summary.totalCarbs += entry.quantity * entry.nutrition.carbs;
    summary.totalFat += entry.quantity * entry.nutrition.fat;
    summary.totalFiber += entry.quantity * entry.nutrition.fiber;
    
    summary.mealBreakdown[entry.mealType].calories += entry.quantity * entry.nutrition.calories;
    summary.mealBreakdown[entry.mealType].count += 1;
  });
  
  return summary;
};

module.exports = mongoose.model('FoodEntry', foodEntrySchema);