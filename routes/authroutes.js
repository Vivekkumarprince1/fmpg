const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/users'); // Adjust the path to your User model
const nodemailer = require('nodemailer');
const otpStore = new Map(); // Temporary storage for OTPs

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fmpg974@gmail.com', // your email
    pass: 'fcdz hxcn yktl zzzx', // your app-specific password
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
router.post('/login', async (req, res) => {
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
            const validOtp = otpStore.get(identifier);
            console.log("Valid OTP:", validOtp, "User OTP:", otp);
            if (!validOtp || validOtp != otp) {
                return res.status(400).render('login', { error: ['Invalid or expired OTP'] });
            }
            otpStore.delete(identifier);
        } else if (authMethod === 'password') {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).render('login', { error: ['Invalid email/mobile or password'] });
            }
        } else {
            return res.status(400).render('login', { error: ['Invalid login method'] });
        }

        const token = user.generateAuthToken();
        res.cookie('token', token, { httpOnly: true }).redirect('/profile');
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(500).render('login', { error: ['Server error. Please try again.'] });
    }
});

  

// Send OTP route
const generateOTP = () => Math.floor(100000 + Math.random() * 900000);

// Send OTP route
router.post('/send-otp', async (req, res) => {
  const email = req.body.email || req.body.identifier;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Generate OTP and store it in session
  const otp = generateOTP();
  otpStore.set(email, otp);
  req.session.otp = otp;
  req.session.email = email;
  req.session.isVerified = false;

  // Email options
  const mailOptions = {
    from: 'fmpg974@gmail.com',
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
router.post('/verify-otp', (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        return res.status(400).json({ message: 'OTP is required' });
    }

    // Compare OTP entered by the user with the stored OTP
    if (parseInt(otp) === req.session.otp) {
        req.session.isVerified = true; // Mark session as verified
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

      console.log(token);
  
      // Send the JWT token to the client
      res.cookie('token', token, { httpOnly: true }).redirect('/profile');
    } catch (err) {
      req.session.error = 'Server error: ' + err.message;
      return res.redirect('/signup');
    }
  });
  

// Logout route (optional, just for user experience)
router.get('/logout', (req, res) => {
  res.clearCookie('token').redirect('/');
});

module.exports = router;  // Make sure you export only the router
