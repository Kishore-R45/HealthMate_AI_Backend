const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['Fitness', 'Nutrition', 'Hydration', 'Sleep', 'Mental Wellness', 'Weight Loss', 'General'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', 'Expert'],
    default: 'Medium'
  },
  
  // Challenge Details
  type: {
    type: String,
    enum: ['Daily', 'Weekly', 'Monthly', 'Custom'],
    required: true
  },
  duration: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months'],
      default: 'days'
    }
  },
  
  // Start and End Dates
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  
  // Goals and Requirements
  goals: [{
    type: {
      type: String,
      enum: ['steps', 'calories', 'water', 'sleep', 'exercise', 'weight', 'custom']
    },
    target: Number,
    unit: String,
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'total'],
      default: 'daily'
    },
    description: String
  }],
  
  // Daily Tasks
  dailyTasks: [{
    day: Number,
    tasks: [{
      title: String,
      description: String,
      points: Number,
      required: Boolean
    }]
  }],
  
  // Participants
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    completedTasks: [Number],
    points: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'failed', 'quit'],
      default: 'active'
    },
    completedAt: Date
  }],
  
  maxParticipants: {
    type: Number,
    default: 1000
  },
  
  // Rewards
  rewards: {
    points: {
      type: Number,
      default: 100
    },
    badges: [{
      name: String,
      icon: String,
      description: String
    }],
    customRewards: [String]
  },
  
  // Rules and Settings
  rules: [String],
  isPublic: {
    type: Boolean,
    default: true
  },
  requiresApproval: {
    type: Boolean,
    default: false
  },
  allowLateJoin: {
    type: Boolean,
    default: true
  },
  
  // Statistics
  stats: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    activeParticipants: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageProgress: {
      type: Number,
      default: 0
    }
  },
  
  // Media
  image: String,
  coverImage: String,
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  
  // Tags for search
  tags: [String]
}, {
  timestamps: true
});

// Indexes
challengeSchema.index({ status: 1, startDate: 1 });
challengeSchema.index({ category: 1, difficulty: 1 });
challengeSchema.index({ 'participants.user': 1 });
challengeSchema.index({ tags: 1 });
challengeSchema.index({ title: 'text', description: 'text' });

// Update stats before saving
challengeSchema.pre('save', function(next) {
  if (this.participants) {
    this.stats.totalParticipants = this.participants.length;
    this.stats.activeParticipants = this.participants.filter(p => p.status === 'active').length;
    
    const completedCount = this.participants.filter(p => p.status === 'completed').length;
    this.stats.completionRate = this.stats.totalParticipants > 0 
      ? (completedCount / this.stats.totalParticipants) * 100 
      : 0;
    
    const totalProgress = this.participants.reduce((sum, p) => sum + p.progress, 0);
    this.stats.averageProgress = this.stats.totalParticipants > 0 
      ? totalProgress / this.stats.totalParticipants 
      : 0;
  }
  
  // Update status based on dates
  const now = new Date();
  if (now < this.startDate) {
    this.status = 'upcoming';
  } else if (now >= this.startDate && now <= this.endDate) {
    this.status = 'active';
  } else if (now > this.endDate) {
    this.status = 'completed';
  }
  
  next();
});

// Method to join challenge
challengeSchema.methods.joinChallenge = async function(userId) {
  const existingParticipant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (existingParticipant) {
    throw new Error('Already joined this challenge');
  }
  
  if (this.participants.length >= this.maxParticipants) {
    throw new Error('Challenge is full');
  }
  
  if (this.status !== 'upcoming' && this.status !== 'active') {
    throw new Error('Challenge is not available to join');
  }
  
  if (!this.allowLateJoin && this.status === 'active') {
    throw new Error('Late joining is not allowed for this challenge');
  }
  
  this.participants.push({
    user: userId,
    joinedAt: new Date()
  });
  
  await this.save();
  return this;
};

// Method to update participant progress
challengeSchema.methods.updateProgress = async function(userId, progressData) {
  const participant = this.participants.find(
    p => p.user.toString() === userId.toString()
  );
  
  if (!participant) {
    throw new Error('User is not a participant');
  }
  
  participant.progress = progressData.progress || participant.progress;
  participant.points = progressData.points || participant.points;
  
  if (progressData.completedTask) {
    participant.completedTasks.push(progressData.completedTask);
  }
  
  if (participant.progress >= 100) {
    participant.status = 'completed';
    participant.completedAt = new Date();
  }
  
  await this.save();
  return participant;
};

module.exports = mongoose.model('Challenge', challengeSchema);