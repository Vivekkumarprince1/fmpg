//index.js
var express = require('express');
var router = express.Router();
const userModel = require("../models/users");
const roomModel = require("../models/Room");
const Room = require('../models/Room'); 
const passport = require('passport');
const localStrategy = require("passport-local");
const { error } = require('console');
const Booking = require('../models/Booking'); 
const properties= require('../models/Property');
const Property = require('../models/Property');
const flash=require('connect-flash');
passport.use(new localStrategy(userModel.authenticate()));
const crypto = require('crypto'); // Built-in Node.js module
const nodemailer = require('nodemailer'); // External package


passport.use(new localStrategy(userModel.authenticate()));

/* GET home page. */
router.get('/', function(req, res, next) {
  const success = req.session.message || req.session.success;
  
  // Clear the message from the session
  req.session.message = null;
  req.session.success = null;
  res.render('index', { success, page: 'home', title: 'Home' });

});

router.get('/index', function(req, res, next) {
  res.render('index');
});


router.get('/booking', isLoggedIn, async function(req, res, next) {
  const user =await userModel.findOne({
    username: req.session.passport.user
  })
  try {
    const rooms = await roomModel.find();
    console.log(rooms)
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).send('Error fetching room');
  }
  console.log("here is it", user);
  res.render('booking', { user , page: 'booking', title: 'Booking'});

});

router.get('/api/bookings', (req, res) => {
  res.send({
    status: 'success',
    code: 200,
    message: 'Bookings fetched successfully',
    data: {
      bookings: [],
      totalBookings: 0,
      fetchedAt: new Date().toISOString(),
    },
  });
});


 

router.get('/TermsAndConditions', function(req, res, next) {
  res.render('TermsAndConditions',{ page: 'TermsAndConditions', title: 'TermsAndConditions' });
});

router.get('/privacypolicy', function(req, res, next) {
  res.render('privacypolicy',{ page: 'privacypolicy', title: 'Privacypolicy' });
});

router.get('/FAQs', function(req, res, next) {
  res.render('FAQs',{ page: 'FAQs', title: 'FAQs' });
});

router.get('/about', function(req, res, next) {
  res.render('about',{ page: 'about', title: 'About Us' });
});


router.get('/readmore', async function(req, res, next) {
  try {
      const propertyID = req.query.PropertyID.trim();  // Ensure propertyID is defined
      console.log(propertyID)
      const property = await Property.findById(propertyID).populate('rooms');
      if (!property) {
          return res.status(404).json({ error: 'Property not found' });
      }
      res.render('readmore', { properties: property });
  } catch (err) {
      console.error("Error fetching property:", err);
      res.status(500).json({ error: err.message });
  }
});

router.get('/404', function(req, res, next) {
  res.render('404',{ page: '404', title: '404' });
});

router.get('/contact', function(req, res, next) {
  res.render('contact',{ page: 'contact', title: 'Contact Us' });
});

router.get('/destination', function(req, res, next) {
  res.render('destination',{ page: 'destination', title: 'Destination' });
});

router.get('/search-page', function(req, res, next) {
  res.render('search-page',{ page: 'search-page', title: 'Search result' });
});

router.get('/service', function(req, res, next) {
  res.render('service',{ page: 'service', title: 'Service' });
});

router.get('/team', function(req, res, next) {
  res.render('team',{ page: 'team', title: 'Team' });
});



router.get('/profile', isLoggedIn, async function(req, res, next) {
  try {
    const user = await userModel.findOne({ username: req.session.passport.user });
    const bookings = await Booking.find({ user: user._id }).populate('room').populate('propertyID').populate({
      path: 'room',
      populate: {
        path: 'property', 
        model: 'Property', 
      }
    });
    if (user.role === 'superadmin' || user.role === 'admin') {
      req.flash('success', 'Successfully logged in as admin!');
      return res.render('admin/dashboard', { admin: user });  // Adjust this route if needed
    }
    console.log(user, bookings);
    
    if (user.role === 'owner') {
      req.flash('success', 'Successfully logged in as admin!');
      return res.render('profile', { user,bookings });  // Adjust this route if needed
    }
    res.render("profile", { user, bookings });
  } catch (err) {
    console.error("Error fetching profile data:", err);
    res.status(500).send("Internal Server Error");
  }
});


router.get('/dashboard', isLoggedIn, (req, res) => {
  res.render('admin/dashboard', { admin: req.user });
});

// router.post('/register', function(req, res) {
//   const { username, email, mobile} = req.body;
//   const userData = new userModel({ username, email, mobile });

//   userModel.register(userData, req.body.password)
//     .then(function(){
//       passport.authenticate("local")(req, res, function() {
//         res.redirect("/profile");
//       })
//     })
//     .catch(function(err) {
//       console.error(err);
//       res.redirect("/login");
//     });
// });

router.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      req.session.error = info ? info.message : 'Invalid username or password';
      return res.redirect('/login');
    }
    
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      
      req.session.success = 'Successfully logged in!';
      return res.redirect('/'); // Redirect to the home page or user-specific page
    });
  })(req, res, next);
});


router.get('/login', function(req, res) {
  const errorMessages = req.session.error || [];
  const successMessages = req.session.success || [];

  // Clear messages from the session
  req.session.error = null;
  req.session.success = null;

  console.log("Error messages:", errorMessages);
  console.log("Success messages:", successMessages);
  
  res.render('login', { error: errorMessages, success: successMessages });
});


router.get('/logout', function(req, res ) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
};



// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: 'fmpg974@gmail.com', // your email
      pass: 'fcdz hxcn yktl zzzx', // your app-specific password
  },
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

// Send OTP route
router.post('/send-otp', async (req, res) => {
  const email = req.body.email;
  if (!email) {
      return res.status(400).json({ message: 'Email is required' });
  }

  // Generate OTP and store it in session
  const otp = generateOTP();
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

// Verify OTP route
router.post('/verify-otp', (req, res) => {
  const { otp } = req.body;
  const sessionOtp = req.session.otp;

  if (otp === sessionOtp) {
      // OTP is correct
      req.session.isVerified = true;
      res.status(200).json({ message: 'OTP verified successfully' });
      req.session.otp = null;  // Clear OTP from session after successful verification
  } else {
      // OTP is incorrect
      res.status(400).json({ message: 'Invalid OTP' });
  }
});


router.get('/signup', function(req, res) {
  const errorMessages = req.session.error || [];
  const successMessages = req.session.success || [];
  const formData = req.session.formData || {}; // Retrieve form data from session

  // Clear error and success messages after rendering
  req.session.error = null;
  req.session.success = null;

  res.render('signup', { error: errorMessages, success: successMessages, formData });
});

router.post('/signup', async function(req, res, next) {
  if (!req.session.isVerified) {
    req.session.error = 'OTP verification required';
    return res.redirect('/signup');
  }

  const { username, email, mobile, password } = req.body;

  try {
    // Check if the username, email, or mobile already exists
    const existingUsers = await userModel.find({
      $or: [
        { username: username },
        { email: email },
        { mobile: mobile }
      ]
    });

    let errorMessages = [];

    // Collect all existing conflicts
    existingUsers.forEach(user => {
      if (user.username === username) {
        errorMessages.push('Username already exists');
      }
      if (user.email === email) {
        errorMessages.push('Email already exists');
      }
      if (user.mobile === mobile) {
        errorMessages.push('Mobile number already exists');
      }
    });

    // If there are errors, return them
    if (errorMessages.length > 0) {
      req.session.error = errorMessages.join(', ');
      return res.redirect('/signup');
    }

    // Register user if no conflict found
    const userData = new userModel({ username, email, mobile });
    userModel.register(userData, password, function(err, user) {
      if (err) {
        req.session.error = 'Registration error: ' + err.message;
        return res.redirect('/signup');
      }

      req.logIn(user, function(err) {
        if (err) {
          req.session.error = 'Login error: ' + err.message;
          return res.redirect('/signup');
        }
        req.session.success = 'Successfully registered and logged in!';
        return res.redirect('/'); // Redirect to home or a specific page
      });
    });

  } catch (err) {
    req.session.error = 'Server error: ' + err.message;
    return res.redirect('/signup');
  }
});

module.exports = router;