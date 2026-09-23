const express = require('express');
const router = express.Router();
const User = require('../models/users');
const { sendMail } = require('../utils/emailService');
const bcrypt = require('bcryptjs');

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
  const mailOptions = {
    to: user.email,
    from: process.env.EMAIL_FROM || 'FMPG <contact@fmpg.in>',
    replyTo: process.env.REPLY_TO_EMAIL || 'fmpg974@gmail.com',
    subject: 'Your Password Reset OTP',
    text: `You requested a password reset. Use this OTP to complete the process: ${otp}. If you didn't request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-top: 0;">Password Reset Request</h2>
        <p style="color: #334155; font-size: 15px;">You requested to reset your password. Use the OTP below to complete the reset process:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e293b; background: #f1f5f9; padding: 10px 20px; border-radius: 6px; display: inline-block;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code is valid for 1 hour. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">FMPG Security Team</p>
      </div>
    `,
  };

  sendMail(mailOptions, (err) => {
    if (err) {
      console.error('Password reset email error:', err);
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
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    req.flash('success', 'Your password has been updated.');
    res.redirect('/profile');
  } catch (err) {
    req.flash('error', 'Error setting the new password.');
    return res.redirect('back');
  }
});

module.exports = router;
