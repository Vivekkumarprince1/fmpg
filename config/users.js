// userSchema.js
const mongoose = require("mongoose");
const plm = require("passport-local-mongoose");
const db=require("../mongodb/db.js");
const bcrypt = require('bcryptjs'); // Ensure bcrypt is required
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  mobile: {
    type: Number,
    required: true
  },
  password: {
    type: String
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin','owner'],
    default: 'user'
  },
  resetPasswordOTP: String, // Add this field
  resetPasswordExpires: Date,
  referralLink: { type: String },  // Store unique referral link
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // Store referring user’s ID
  referralCredits: { type: Number, default: 0 },
});

// Hash password before saving
userSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next();
  bcrypt.hash(this.password, 10, (err, hash) => {
    if (!this.referralLink) {
      // Generate referral link using user ID
      this.referralLink = `https://www.fmpg.in/signup?ref=${this._id}`;
    }
    if (err) return next(err);
    this.password = hash;
    next();
  });
});

// Verify password
userSchema.methods.comparePassword = function (candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

userSchema.plugin(plm, {
  usernameField: "email" // Tell Passport to use email instead of username
});


const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = mongoose.model('user', userSchema);