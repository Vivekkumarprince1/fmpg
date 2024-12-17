//index.js
var express = require('express');
var router = express.Router();
const userModel = require("../models/users");
const roomModel = require("../models/Room");
const passport = require('passport');
const localStrategy = require("passport-local");
const { error } = require('console');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const flash = require('connect-flash');
const crypto = require('crypto'); 
const nodemailer = require('nodemailer'); 
const { isAuthenticated, authorizeAdmin } = require('../middleware/auth'); // Adjust path as needed

// passport.use(new localStrategy({ usernameField: 'email' }, userModel.authenticate()));


/* GET home page. */

router.get('/a',async (req, res) => {
  await res.render('admin/a');
  });

router.get('/', async function (req, res, next) {
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

router.get('/index', function (req, res, next) {
  res.redirect('/');
});

router.get('/booking', isAuthenticated, async function (req, res, next) {
  try {
    // Extract email from the JWT payload stored in req.user
    const email = req.user.email;

    // Fetch the user using the email from the JWT payload
    const user = await userModel.findOne({ email });
    console.log("Here is the user:", user);

    // Fetch rooms data
    const rooms = await roomModel.find();
    console.log("Rooms data:", rooms);

    // Render the booking page with user data and rooms
    res.render('booking', { user, rooms, page: 'booking', title: 'Booking' });

  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Error fetching data');
  }
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

router.get('/TermsAndConditions', function (req, res, next) {
  res.render('TermsAndConditions', { page: 'TermsAndConditions', title: 'TermsAndConditions' });
});


router.get('/referandearn', isAuthenticated, async function (req, res, next) {
  try {
    // Extract the email from req.user (decoded JWT)
    const email = req.user.email;

    // Fetch the user based on the email
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Check if the referral link is not set, then generate it
    if (!user.referralLink) {
      user.referralLink = `https://www.fmpg.in/signup?ref=${user._id}`;
      await user.save();
    }

    // Render the 'referandearn' page with the user details
    res.render('referandearn', { 
      page: 'referandearn', 
      title: 'Refer and Earn', 
      user 
    });
  } catch (err) {
    console.error('Error in /referandearn route:', err.message);
    res.status(500).send('Internal Server Error');
  }
});



router.get('/TermsAndConditions', function (req, res, next) {
  res.render('TermsAndConditions', { page: 'TermsAndConditions', title: 'TermsAndConditions' });
});

router.get('/TermsofService', function (req, res, next) {
  res.render('TermsofService', { page: 'TermsofService', title: 'Terms of Service' });
});

router.get('/privacypolicy', function (req, res, next) {
  res.render('privacypolicy', { page: 'privacypolicy', title: 'Privacypolicy' });
});

router.get('/FAQs', function (req, res, next) {
  res.render('FAQs', { page: 'FAQs', title: 'FAQs' });
});

router.get('/about', function (req, res, next) {
  res.render('about', { page: 'about', title: 'About Us' });
});

router.get('/404', function (req, res, next) {
  res.render('404', { page: '404', title: '404' });
});

router.get('/contact', function (req, res, next) {
  res.render('contact', { page: 'contact', title: 'Contact Us' });
});

router.get('/destination', function (req, res, next) {
  res.render('destination', { page: 'destination', title: 'Destination' });
});

router.get('/readmore', async function (req, res, next) {
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

    res.render('search-page', { page: 'search-page', title: 'Search result', properties: properties, gender, sort });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to filter and sort properties, including by distance
// router.get('/search-page', async (req, res) => {
//   try {
//     const { gender = 'all', sort = '', lat, lng } = req.query;

//     // Initialize the query object based on gender filter
//     const query = gender !== 'all' ? { gender } : {};

//     // Fetch properties based on the query
//     let properties = await Property.find(query).populate('rooms');

//     // Filter properties within 8km radius if lat and lng are provided
//     if (lat && lng) {
//       const userLat = parseFloat(lat);
//       const userLng = parseFloat(lng);

//       properties = properties.filter(property => {
//         const coordinates = extractLatLngFromMapUrl(property.map);
//         if (coordinates) {
//           const distance = getDistanceFromLatLonInKm(userLat, userLng, coordinates.lat, coordinates.lng):
//           return distance <= 8; // Keep properties within 8 km radius
//         }
//         return false;
//       });
//     }

//     // Sort properties based on the selected criteria
//     if (sort === 'low-to-high') {
//       properties.sort((a, b) => (a.rooms[0]?.price || Infinity) - (b.rooms[0]?.price || Infinity));
//     } else if (sort === 'high-to-low') {
//       properties.sort((a, b) => (b.rooms[0]?.price || 0) - (a.rooms[0]?.price || 0));
//     } else if (sort === 'distance' && lat && lng) {
//       const userLat = parseFloat(lat);
//       const userLng = parseFloat(lng);

//       properties = properties.map(property => {
//         const coordinates = extractLatLngFromMapUrl(property.map);
//         if (coordinates) {
//           property.distance = getDistanceFromLatLonInKm(userLat, userLng, coordinates.lat, coordinates.lng);
//         } else {
//           property.distance = Infinity; // Assign a large distance if coordinates are missing
//         }
//         return property;
//       });

//       // Sort properties by nearest distance
//       properties.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
//     }

//     res.render('search-page', { 
//       page: 'search-page', 
//       title: 'Search result', 
//       properties, 
//       gender, 
//       sort 
//     });
//   } catch (err) {
//     console.error("Error in /search-page:", err);
//     res.status(500).json({ error: err.message });
//   }
// });




router.get('/service', function (req, res, next) {
  res.render('service', { page: 'service', title: 'Service' });
});

router.get('/team', function (req, res, next) {
  res.render('team', { page: 'team', title: 'Team' });
});


router.get('/profile', isAuthenticated, async function (req, res) {
  try {
    // Use req.user to fetch the logged-in user
    const user = await userModel.findOne({ email: req.user.email });
    if (!user) {
      console.error('User not found in database.');
      return res.redirect('/login',{error}); // Redirect if user is not found
    }

    // Generate referral link if not set
    if (!user.referralLink) {
      user.referralLink = `https://www.fmpg.in/signup?ref=${user._id}`;
      await user.save();
    }

    // Fetch bookings for the user
    const bookings = await Booking.find({ user: user._id }).populate('room').populate('propertyID');

    if (user.role === 'superadmin' || user.role === 'admin') {
      req.flash('success', 'Successfully logged in as admin!');
      return res.render('admin/profile', { admin: user });
    }

    if (user.role === 'owner') {
      req.flash('success', 'Successfully logged in as owner!');
      return res.render('profile', { user, bookings });
    }

    res.render('profile', { user, bookings });
  } catch (err) {
    console.error('Error fetching profile data:', err);
    res.status(500).send('Internal Server Error');
  }
});


router.get('/dashboard', isAuthenticated , (req, res) => {
  res.render('admin/dashboard', { admin: req.user });
});

router.get('/dashboard-nav', isAuthenticated, (req, res) => {
  res.render('admin/dashboard-nav', { admin: req.user });
});




// router.get('/login', function (req, res) {
//   const errorMessages = req.session.error || [];
//   const successMessages = req.session.success || [];

//   // Clear messages from the session
//   req.session.error = null;
//   req.session.success = null;

//   console.log("Error messages:", errorMessages);
//   console.log("Success messages:", successMessages);

//   res.render('login', { error: errorMessages, success: successMessages });
// });

// router.post('/login', function (req, res, next) {
//   passport.authenticate('local', { usernameField: 'email' }, function (err, user, info) {
//     if (err) { return next(err); }
//     if (!user) {
//       req.session.error = info ? info.message : 'Invalid email or password';
//       return res.redirect('/login');
//     }

//     req.logIn(user, function (err) {
//       if (err) { return next(err); }

//       req.session.success = 'Successfully logged in!';
//       return res.redirect('/'); // Redirect to the home page or user-specific page
//     });
//   })(req, res, next);
// });

// router.get('/logout', function (req, res) {
//   req.logout(function (err) {
//     if (err) { return next(err); }
//     res.redirect('/');
//   });
// });

// function isAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) return next();
//   res.redirect("/login");
// };



// // Setup Nodemailer transporter
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'fmpg974@gmail.com', // your email
//     pass: 'fcdz hxcn yktl zzzx', // your app-specific password
//   },
// });

// // Generate OTP
// function generateOTP() {
//   return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
// }

// // Send OTP route
// router.post('/send-otp', async (req, res) => {
//   const email = req.body.email;
//   if (!email) {
//     return res.status(400).json({ message: 'Email is required' });
//   }

//   // Generate OTP and store it in session
//   const otp = generateOTP();
//   req.session.otp = otp;
//   req.session.email = email;
//   req.session.isVerified = false;

//   // Email options
//   const mailOptions = {
//     from: 'fmpg974@gmail.com',
//     to: email,
//     subject: 'Your OTP for Verification',
//     text: `Your OTP is ${otp}. Please do not share this with anyone.`,
//   };

//   // Send the email
//   try {
//     await transporter.sendMail(mailOptions);
//     res.status(200).json({ message: 'OTP sent to email' });
//   } catch (error) {
//     console.error('Error sending email:', error);
//     res.status(500).json({ message: 'Error sending OTP' });
//   }
// });

// // Verify OTP route
// router.post('/verify-otp', (req, res) => {
//   const { otp } = req.body;
//   const sessionOtp = req.session.otp;

//   if (otp === sessionOtp) {
//     // OTP is correct
//     req.session.isVerified = true;
//     res.status(200).json({ message: 'OTP verified successfully' });
//     req.session.otp = null;  // Clear OTP from session after successful verification
//   } else {
//     // OTP is incorrect
//     res.status(400).json({ message: 'Invalid OTP' });
//   }
// });

// router.get('/signup', function (req, res) {
//   const errorMessages = req.session.error || [];
//   const successMessages = req.session.success || [];
//   const formData = req.session.formData || {}; // Retrieve form data from session

//   // Clear error and success messages after rendering
//   req.session.error = null;
//   req.session.success = null;
//   const referrerId = req.query.ref || null;  // Capture referrerId from URL

//   res.render('signup', { error: errorMessages, success: successMessages, formData, referrerId });
// });

// router.post('/signup', async function (req, res, next) {
//   if (!req.session.isVerified) {
//     req.session.error = 'OTP verification required';
//     return res.redirect('/signup');
//   }

//   const { username, email, mobile, password } = req.body;
//   const referrerId = req.query.ref;  // Get referrerId from the query parameters

//   try {
//     // Check if the username, email, or mobile already exists
//     const existingUsers = await userModel.find({
//       $or: [
//         { username: username },
//         { email: email },
//         { mobile: mobile }
//       ]
//     });

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
//     userModel.register(userData, password, async function (err, user) {
//       if (err) {
//         req.session.error = 'Registration error: ' + err.message;
//         return res.redirect('/signup');
//       }

//       // Assign 50 credits on signup
//       user.referralCredits = 50;

//       // Handle referrer credits
//       if (referrerId) {
//         const referrer = await userModel.findById(referrerId);
//         if (referrer) {
//           console.log('Referrer found:', referrer);  // Debugging output
//           user.referredBy = referrer._id;
//           referrer.referralCredits += 10;
//           console.log('Referrer credits updated to:', referrer.referralCredits);  // Debugging output
//           await referrer.save(); // Await referrer save operation
//         } else {
//           console.log('No referrer found with that ID');
//         }
//       }

//       // Save the user with the referredBy field
//       await user.save(); // Ensure user is saved with the referredBy field

//       req.logIn(user, function (err) {
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


module.exports = router;