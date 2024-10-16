const express = require('express');
const router = express.Router();
const User = require('../models/users');
const nodemailer = require('nodemailer');

// GET Forgot Password Page
router.get('/', (req, res) => res.render('forgot'));

// POST Forgot Password (Request OTP)
router.post('/', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    req.flash('error', 'No account with that email address exists.');
    return res.redirect('/forgot');
  }

  // Generate OTP and store with expiry
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordOTP = otp;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  // Send OTP via email
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: { user: 'fmpg974@gmail.com', pass: 'fcdz hxcn yktl zzzx' },
    pool: true, rateLimit: 1, maxConnections: 1, maxMessages: 5, connectionTimeout: 10000, socketTimeout: 10000,
  });

  const mailOptions = {
    to: user.email,
    from: 'fmpg974@gmail.com',
    subject: 'Your Password Reset OTP',
    text: `You requested a password reset. Use this OTP to complete the process: ${otp}. If you didn't request this, ignore this email.`,
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      req.flash('error', 'Error sending the email.');
      return res.redirect('/forgot');
    }
    req.flash('success', `An OTP has been sent to ${user.email}.`);
    res.redirect(`/forgot/verify-otp?email=${encodeURIComponent(user.email)}`);
  });
});

// GET Verify OTP Page
router.get('/verify-otp', (req, res) => res.render('verifyOtp', { email: req.query.email }));

// POST Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email });

  // Validate OTP and expiry
  if (!user || user.resetPasswordOTP !== otp || user.resetPasswordExpires < Date.now()) {
    req.flash('error', 'Invalid OTP or expired session.');
    return res.redirect('back');
  }

  // Update the password and clear OTP
  user.setPassword(newPassword, async (err) => {
    if (err) {
      req.flash('error', 'Error setting the new password.');
      return res.redirect('back');
    }
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    req.flash('success', 'Your password has been updated.');
    res.redirect('/profile');
  });
});

module.exports = router;
