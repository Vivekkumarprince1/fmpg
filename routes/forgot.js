const express = require('express');
const router = express.Router();
const User = require('../models/users');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// GET Forgot Password Page
router.get('/', (req, res) => {
  res.render('forgot');
});

// POST Forgot Password (Request OTP)
router.post('/', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    req.flash('error', 'No account with that email address exists.');
    return res.redirect('/forgot');
  }
  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in user's record with an expiry
user.resetPasswordOTP = otp;
user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
await user.save();
console.log("Saved OTP:", user.resetPasswordOTP, "Expires at:", user.resetPasswordExpires);

  // Send OTP via email
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: 'fmpg974@gmail.com',
      pass: 'lrta iuce bpxm smxy',
    },
    pool: true, // Reuse connections
  rateLimit: 1, // Limit sending rate
  maxConnections: 1, // Limit the number of connections
  maxMessages: 5, // Limit the number of messages per connection
  connectionTimeout: 10000, // Set connection timeout to 10 seconds
  socketTimeout: 10000,
  });

  const mailOptions = {
    to: user.email,
    from: 'fmpg974@gmail.com',
    subject: 'Your Password Reset OTP',
    text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
    Please use the following OTP to complete the process:\n\n
    ${otp}\n\n
    If you did not request this, please ignore this email and your password will remain unchanged.\n`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.error('Error sending email:', err);
      req.flash('error', 'Error sending the email.');
      return res.redirect('/forgot');
    }
    req.flash('success', `An OTP has been sent to ${user.email}.`);
    res.redirect(`/forgot/verify-otp?email=${encodeURIComponent(user.email)}`);
  });
});

// GET Verify OTP Page
router.get('/verify-otp', (req, res) => {
  res.render('verifyOtp', { email: req.query.email });
});

// POST Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Log what the user sent in the console
  console.log("User Submitted Data:");
  console.log("Email:", email);
  console.log("OTP:", otp);
  console.log("New Password:", newPassword);
  const user = await User.findOne({ email });

  // Check if the user and OTP exist
  if (!user || !user.resetPasswordOTP || !user.resetPasswordExpires) {
    console.log('User:', user);
    console.log('OTP:', user ? user.resetPasswordOTP : 'undefined');
    console.log(!user.resetPasswordOTP);
    console.log("OTP or expiry not found for user");
    req.flash('error', 'Invalid OTP or expired session.');
    return res.redirect('back');
  }

  // Log OTP details for debugging
  console.log("User OTP:", user.resetPasswordOTP, "Input OTP:", otp);
  console.log("OTP Expiry:", user.resetPasswordExpires, "Current Time:", Date.now());

  // Validate OTP and expiry time
  if (user.resetPasswordOTP.toString() !== otp.toString() || user.resetPasswordExpires < Date.now()) {
    console.log("Error occurred during OTP verification");
    req.flash('error', 'OTP is incorrect or has expired.');
    return res.redirect('back');
  }

  // Update the password using Passport.js
  user.setPassword(newPassword, async (err) => {
    if (err) {
      console.log("Error setting new password:", err);
      req.flash('error', 'Error setting the new password.');
      return res.redirect('back');
    }

    // Clear OTP and expiry after successful password reset
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    req.flash('success', 'Your password has been updated.');
    res.redirect('/profile');
  });
});

module.exports = router;
