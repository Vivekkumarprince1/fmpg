// userSchema.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../mongodb/db.js");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  role: {
    type: String,
    enum: ["user", "admin", "superadmin", "owner"],
    default: "user",
  },
  resetPasswordOTP: String,
  resetPasswordExpires: Date,
  referralLink: {
    type: String,
    unique: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  referralCredits: {
    type: Number,
    default: 0,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    // Hash password
    // const salt = await bcrypt.genSalt(10);
    // this.password = await bcrypt.hash(this.password, salt);

    // Generate referral link using user ID
    if (!this.referralLink) {
      this.referralLink = `https://www.fmpg.in/signup?ref=${this._id}`;
    }
    next();
  } catch (err) {
    next(err);
  }
});

// Verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    throw new Error(err);
  }
};

// Generate JWT token
userSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
  };
  const secretKey = process.env.JWT_SECRET || "myjwt"; // Use a secret key from environment variables
  const options = { expiresIn: "7d" }; // Set token expiration

  return jwt.sign(payload, secretKey, options);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = mongoose.model('user', userSchema);
