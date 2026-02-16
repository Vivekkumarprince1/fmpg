const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/users'); // Adjust the path to your User model
const Otp = require('../models/Otp');
const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT || 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: Number(process.env.OTP_RATE_LIMIT || 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please try again later.' },
});

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

// Login GET route
router.get('/login', (req, res) => {
  const errorMessages = req.session.error || [];
  const successMessages = req.session.success || [];

  // Clear messages from the session
  req.session.error = null;
  req.session.success = null;

  res.render('login', { error: errorMessages, success: successMessages });
});

// Login POST route
router.post('/login', authLimiter, async (req, res) => {
    const { identifier, password, otp, authMethod } = req.body;
    console.log("Login Request:", { identifier, authMethod });
  
    try {
        const user = await User.findOne({ 
            $or: [{ email: identifier }, { mobile: identifier }]
        });
        if (!user) {
            console.error("User not found for:", identifier);
            return res.status(400).render('login', { error: ['Invalid email/mobile or password/OTP'] });
        }

        if (authMethod === 'otp') {
          const otpRecord = await Otp.findOne({ identifier }).sort({ createdAt: -1 });

          if (!otpRecord || otpRecord.expiresAt < new Date()) {
                return res.status(400).render('login', { error: ['Invalid or expired OTP'] });
            }

          const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
          if (otpRecord.otpHash !== otpHash) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return res.status(400).render('login', { error: ['Invalid or expired OTP'] });
          }

          await Otp.deleteMany({ identifier });
        } else if (authMethod === 'password') {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).render('login', { error: ['Invalid email/mobile or password'] });
            }
        } else {
            return res.status(400).render('login', { error: ['Invalid login method'] });
        }

        const token = user.generateAuthToken();
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        }).redirect('/profile');
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).render('login', { error: ['Server error. Please try again.'] });
    }
});

  

// Send OTP route
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// Send OTP route
router.post('/send-otp', otpLimiter, async (req, res) => {
  const email = req.body.email || req.body.identifier;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Generate OTP and store hashed OTP in DB with TTL
  const otp = generateOTP();
  const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');
  await Otp.deleteMany({ identifier: email });
  await Otp.create({
    identifier: email,
    otpHash,
    expiresAt: new Date(Date.now() + (Number(process.env.OTP_EXPIRY_MINUTES || 10) * 60 * 1000)),
  });

  req.session.email = email;
  req.session.isVerified = false;

  const emailConfigured = Boolean(emailUser && emailPass);
  if (!emailConfigured) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ message: 'Email configuration is missing' });
    }

    return res.status(200).json({
      message: 'OTP generated in development mode',
      devOtp: String(otp),
    });
  }

  // Email options
  const mailOptions = {
    from: process.env.EMAIL_FROM || emailUser,
    to: email,
    subject: 'Your OTP for Verification',
    text: `Your OTP is ${otp}. Please do not share this with anyone.`,
  };

  // Send the email
  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});



// OTP Verification route
router.post('/verify-otp', async (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).json({ message: 'OTP is required' });
    }

  const identifier = req.session.email;
  if (!identifier) {
    return res.status(400).json({ message: 'OTP session not found' });
  }

  const otpRecord = await Otp.findOne({ identifier }).sort({ createdAt: -1 });
  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    req.session.isVerified = false;
    return res.status(400).json({ message: 'Invalid OTP' });
  }

  const otpHash = crypto.createHash('sha256').update(String(otp)).digest('hex');

    // Compare OTP entered by the user with the stored OTP
  if (otpRecord.otpHash === otpHash) {
        req.session.isVerified = true; // Mark session as verified
    await Otp.deleteMany({ identifier });
        res.json({ message: 'OTP verified successfully' });
    } else {
        req.session.isVerified = false;
        res.status(400).json({ message: 'Invalid OTP' });
    }
});


// Signup GET route
router.get('/signup', (req, res) => {
  const errorMessages = req.session.error || [];
  const successMessages = req.session.success || [];
  const formData = req.session.formData || {}; // Retrieve form data from session

  // Clear error and success messages after rendering
  req.session.error = null;
  req.session.success = null;

  const referrerId = req.query.ref || null;  // Capture referrerId from URL
  res.render('signup', { error: errorMessages, success: successMessages, formData, referrerId });
});


// Signup POST route
router.post('/signup', async (req, res) => {
    const { username, email, mobile, password } = req.body;
    const referrerId = req.query.ref;  // Get referrerId from the query parameters
  
    if (!req.session.isVerified) {
      req.session.error = 'OTP verification required';
      return res.redirect('/signup');
    }
  
    try {
      // Check if the username, email, or mobile already exists
      const existingUsers = await User.find({
        $or: [
          { username: username },
          { email: email },
          { mobile: mobile },
        ],
      });
  
      let errorMessages = [];
  
      existingUsers.forEach(user => {
        if (user.username === username) errorMessages.push('Username already exists');
        if (user.email === email) errorMessages.push('Email already exists');
        if (user.mobile === mobile) errorMessages.push('Mobile number already exists');
      });
  
      if (errorMessages.length > 0) {
        req.session.error = errorMessages.join(', ');
        return res.redirect('/signup');
      }
  
      // Register user if no conflict found
      const hashedPassword = await bcrypt.hash(password, 10);
      const userData = new User({ username, email, mobile, password: hashedPassword });
  
      // Handle referrer credits
      if (referrerId) {
        const referrer = await User.findById(referrerId);
        if (referrer) {
          userData.referredBy = referrer._id;
          referrer.referralCredits += 10;
          await referrer.save();
        }
      }
  
      await userData.save();
  
      // Generate JWT token after successful signup
      const token = userData.generateAuthToken();
  
      // Send the JWT token to the client
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      }).redirect('/profile');
    } catch (err) {
      req.session.error = 'Server error: ' + err.message;
      return res.redirect('/signup');
    }
  });
  

// Logout route (optional, just for user experience)
router.get('/logout', (req, res) => {
  req.session.isVerified = false;
  req.session.email = null;
  res.clearCookie('token').redirect('/');
});

module.exports = router;  // Make sure you export only the router
