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
// const properties= require('../models/Property');
const Property = require('../models/Property');
const flash=require('connect-flash');
// passport.use(new localStrategy(userModel.authenticate()));
const crypto = require('crypto'); // Built-in Node.js module
const nodemailer = require('nodemailer'); // External package


passport.use(new localStrategy({ usernameField: 'email' }, userModel.authenticate()));


/* GET home page. */

router.get('/', async function(req, res, next) {
  try {
    const success = req.session.message || req.session.success;

    // Clear the message from the session
    req.session.message = null;
    req.session.success = null;

    // Fetch properties from the database
    const properties = await Property.find().populate('rooms'); // Populate rooms if needed

    // Render the index view with properties
    res.render('index', { properties, success, page: 'home', title: 'Home' });
  } catch (err) {
    console.error("Error fetching properties:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/index', function(req, res, next) {
  res.redirect('/');
});



router.get('/booking', isLoggedIn, async function(req, res, next) {
  const user =await userModel.findOne({
    email: req.session.passport.user
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
      const propertyID = req.query.propertyID;  // Use lowercase 'propertyID'
      
      // Check if propertyID is defined and is a string before trimming
      if (!propertyID || typeof propertyID !== 'string') {
          return res.status(400).json({ error: 'propertyID is required' });
      }

      const trimmedID = propertyID.trim();  // Now it should be safe to trim
      console.log(trimmedID);  // Log the trimmed propertyID
      
      const property = await Property.findById(trimmedID).populate('rooms');
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


// router.get('/search-page', async function(req, res, next) {
//   try {
//     const { gender = 'all', sort = '', lat, lng } = req.query;

//   // Initialize query with optional gender filter
//   let query = {};
//   if (gender && gender !== 'all') {
//     query.gender = gender;
//   }
//     // Fetch all properties and populate rooms correctly
//     const properties = await Property.find().populate('rooms'); 

//     if (sort === 'low-to-high') {
//       properties = properties.sort((a, b) => a.rooms[0]?.price - b.rooms[0]?.price);
//     } else if (sort === 'high-to-low') {
//       properties = properties.sort((a, b) => b.rooms[0]?.price - a.rooms[0]?.price);
//     } else if (sort === 'distance' && lat && lng) {
//       properties = properties.map(property => {
//         property.distance = getDistanceFromLatLonInKm(lat, lng, property.lat, property.lng);
//         return property;
//       });
//       properties.sort((a, b) => a.distance - b.distance); // Sort by nearest distance
//     }

//     // Iterate over each property and its rooms
//     properties.forEach(property => {
//       if (property.rooms && property.rooms.length > 0) {
//         property.rooms.forEach((room, index) => {
//           console.log(`Room ${index + 1} price: ${room.price}`); // Log price of each room for each property
//         });
//       } else {
//         console.log("No rooms found for this property");
//       }
//     });

//     // Pass the properties array to the view
//     res.render('search-page', { page: 'search-page', title: 'Search result', properties: properties, gender, sort }); 
//   } catch (err) {
//     console.error("Error fetching properties:", err);
//     res.status(500).json({ error: err.message });
//   }
// });


// Helper function to calculate distance between two lat/lng points

const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLon / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

// Helper function to extract lat/lng from Google Maps URL
const extractLatLngFromMapUrl = (url) => {
    const regex = /!2d([-\d.]+)!3d([-\d.]+)/;
    const match = url.match(regex);
    if (match) {
        const lng = parseFloat(match[1]); // Longitude
        const lat = parseFloat(match[2]); // Latitude
        return { lat, lng };
    } else {
        console.error('No coordinates found in the map URL');
        return null;
    }
};

// Route to filter and sort properties, including by distance
router.get('/search-page', async (req, res) => {
  try {
    const { gender = 'all', sort = '', lat, lng } = req.query;

    // Initialize query with optional gender filter
    let query = {};
    if (gender && gender !== 'all') {
      query.gender = gender;
    }

    // Fetch filtered properties
    let properties = await Property.find(query).populate('rooms');

    // Sort properties based on selected criteria
    if (sort === 'low-to-high') {
      properties = properties.sort((a, b) => a.rooms[0]?.price - b.rooms[0]?.price);
    } else if (sort === 'high-to-low') {
      properties = properties.sort((a, b) => b.rooms[0]?.price - a.rooms[0]?.price);
    } else if (sort === 'distance' && lat && lng) {
      properties = properties.map(property => {
        const coordinates = extractLatLngFromMapUrl(property.map);
        if (coordinates) {
          property.distance = getDistanceFromLatLonInKm(lat, lng, coordinates.lat, coordinates.lng);
        } else {
          property.distance = Infinity; // Assign a large number if no coordinates are found
        }
        return property;
      });
      properties.sort((a, b) => a.distance - b.distance); // Sort by nearest distance
    }

    res.render('search-page', { page: 'search-page', title: 'Search result', properties:properties, gender, sort });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



router.get('/service', function(req, res, next) {
  res.render('service',{ page: 'service', title: 'Service' });
});

router.get('/team', function(req, res, next) {
  res.render('team',{ page: 'team', title: 'Team' });
});

router.get('/profile', isLoggedIn, async function(req, res, next) {
  try {
    const user = await userModel.findOne({ email: req.session.passport.user });
    if (!user.referralLink) {
      // If for some reason the referral link is not set, regenerate it
      user.referralLink = `https://www.fmpg.in/signup?ref=${user._id}`;
      await user.save();
    }
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


router.post('/login', function(req, res, next) {
  passport.authenticate('local', { usernameField: 'email' }, function(err, user, info) {
    if (err) { return next(err); }
    if (!user) {
      req.session.error = info ? info.message : 'Invalid email or password';
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
  const referrerId = req.query.ref;  // Capture referrerId from URL

  res.render('signup', { error: errorMessages, success: successMessages, formData ,referrerId});
});

// router.post('/signup', async function(req, res, next) {
//   if (!req.session.isVerified) {
//     req.session.error = 'OTP verification required';
//     return res.redirect('/signup');
//   }

//   const { username, email, mobile, password } = req.body;
// const referrerId = req.query.ref;  // Get referrerId from the query parameters

//   try {
//     // Check if the username, email, or mobile already exists
//     const existingUsers = await userModel.find({
//       $or: [
//         { username: username },
//         { email: email },
//         { mobile: mobile }
//       ]
//     });



//     // Assign 50 credits on signup
//     user.referralCredits = 50;

// if (referrerId) {
//   const referrer = await userModel.findById(referrerId);
//   if (referrer) {
//     user.referredBy = referrer._id;
//     // Reward referrer with additional credits
//     referrer.referralCredits += 10;  // Adjust as necessary for referrer reward
//     await referrer.save();
//   }
// }

//     let errorMessages = [];

//     // Collect all existing conflicts
//     existingUsers.forEach(user => {
//       if (user.username === username) {
//         errorMessages.push('Username already exists');
//       }
//       if (user.email === email) {
//         errorMessages.push('Email already exists');
//       }
//       if (user.mobile === mobile) {
//         errorMessages.push('Mobile number already exists');
//       }
//     });

//     // If there are errors, return them
//     if (errorMessages.length > 0) {
//       req.session.error = errorMessages.join(', ');
//       return res.redirect('/signup');
//     }

//     // Register user if no conflict found
//     const userData = new userModel({ username, email, mobile });
//     userModel.register(userData, password, function(err, user) {
//       if (err) {
//         req.session.error = 'Registration error: ' + err.message;
//         return res.redirect('/signup');
//       }

//       req.logIn(user, function(err) {
//         if (err) {
//           req.session.error = 'Login error: ' + err.message;
//           return res.redirect('/signup');
//         }
//         req.session.success = 'Successfully registered and logged in!';
//         return res.redirect('/'); // Redirect to home or a specific page
//       });
//     });

//   } catch (err) {
//     req.session.error = 'Server error: ' + err.message;
//     return res.redirect('/signup');
//   }
// });





router.post('/signup', async function(req, res, next) {
  if (!req.session.isVerified) {
    req.session.error = 'OTP verification required';
    return res.redirect('/signup');
  }

  const { username, email, mobile, password } = req.body;
  const referrerId = req.query.ref;  // Get referrerId from the query parameters

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
    userModel.register(userData, password, async function(err, user) {
      if (err) {
        req.session.error = 'Registration error: ' + err.message;
        return res.redirect('/signup');
      }

      // Assign 50 credits on signup
      user.referralCredits = 50;

      // Handle referrer credits
      if (referrerId) {
        const referrer = await userModel.findById(referrerId);
        if (referrer) {
          console.log('Referrer found:', referrer);  // Debugging output
          user.referredBy = referrer._id;
          referrer.referralCredits += 10;
          console.log('Referrer credits updated to:', referrer.referralCredits);  // Debugging output
          await referrer.save(); // Await referrer save operation
        } else {
          console.log('No referrer found with that ID');
        }
      }

      // Save the user with the referredBy field
      await user.save(); // Ensure user is saved with the referredBy field

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