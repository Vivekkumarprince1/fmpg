const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/users');
const { render } = require('ejs');
const flash=require("connect-flash");
// const paymentController = require('../controller/paymentController');


// // Create a new booking
// router.post('/', async (req, res) => {
//   const { mobile, startDate, endDate, userId, roomId, specialRequest, username, propertyID } = req.body;

//   if (!mobile || !startDate || !endDate || !userId || !roomId || !propertyID) {
//     return res.status(400).json({ message: 'Missing required fields' });
//   }

//   if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(propertyID)) {
//     return res.status(400).json({ message: 'Invalid userId, roomId, or propertyID' });
//   }

//   try {
//     // Fetch the property to ensure it exists
//     const property = await Property.findById(propertyID);
//     if (!property) {
//       return res.status(404).json({ message: 'Property not found' });
//     }

//     // Fetch the user and populate the referredBy field to get the referrer
//     const user = await User.findById(userId).populate('referredBy');  // Populate referrer information
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const referrer = user.referredBy;  // Access the referrer (if any)
    
//     // Reward the referrer with additional credits if a referral exists
//     if (referrer) {
//       referrer.referralCredits += 100;  // Adjust points as per your logic
//       await referrer.save();
//       console.log(`Referrer ${referrer.username} credited with 100 points`);
//     }

//     // Create a new booking
//     const booking = new Booking({
//       mobile,
//       startDate,
//       endDate,
//       user: new mongoose.Types.ObjectId(userId),
//       room: new mongoose.Types.ObjectId(roomId),
//       propertyID: new mongoose.Types.ObjectId(propertyID), // Ensure correct field is used
//       owner: property.ownerName,
//       specialRequest,
//       username,
//       status: 'Pending',
//     });

//     // Save the booking
//     await booking.save();
//     console.log('Booking created:', booking);
    
//     // Set success message in session
//     req.session.message = 'Booking created successfully';
//     res.redirect('/'); // Redirect to the main page
//   } catch (err) {
//     console.error('Error creating booking:', err);
//     res.status(500).json({ message: 'Error creating booking', error: err });
//   }
// });

// router.post('/create-order',  paymentController.createOrder);

// router.post('/verify-payment', paymentController.varifyPayment);




const razorpay = require('../config/razorpay');

// Initiate booking and payment
router.post('/', async (req, res) => {
  const { mobile, startDate, endDate, userId, roomId, specialRequest, username, propertyID } = req.body;

  if (!mobile || !startDate || !endDate || !userId || !roomId || !propertyID) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(propertyID)) {
    return res.status(400).json({ message: 'Invalid userId, roomId, or propertyID' });
  }

  try {
    // Fetch property and user to validate existence
    const property = await Property.findById(propertyID);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate Razorpay order
    const order = await razorpay.orders.create({
      amount: 50000, // Replace with your calculated amount in paise (e.g., 500.00 INR = 50000 paise)
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId,
        roomId,
        propertyID,
      },
    });

    res.render('payment', { order, mobile, startDate, endDate, userId, roomId, specialRequest, username, propertyID });
  } catch (err) {
    console.error('Error initiating payment:', err);
    res.status(500).json({ message: 'Error initiating payment', error: err });
  }
});


// Handle payment success
router.post('/payment-success', async (req, res) => {
  const { payment_id, order_id, signature, userId, roomId, propertyID, mobile, startDate, endDate, specialRequest, username } = req.body;

  try {
    const crypto = require('crypto');
    const secretKey = 'dLpNb8cB36reDlMuNvq2igU8';
    console.log(secretKey);

    if (!secretKey) {
      return res.status(500).json({ message: 'Server configuration error: Missing Razorpay secret key' });
    }

    const shasum = crypto.createHmac('sha256', secretKey);
    shasum.update(`${order_id}|${payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== signature) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Create booking after successful payment
    const property = await Property.findById(propertyID);

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const booking = new Booking({
      mobile,
      startDate,
      endDate,
      user: new mongoose.Types.ObjectId(userId),
      room: new mongoose.Types.ObjectId(roomId),
      propertyID: new mongoose.Types.ObjectId(propertyID),
      owner: property.ownerName,
      specialRequest,
      username,
      status: 'Pending waiting for owner confirmation',
    });
    
    await booking.save();

    req.session.message = 'Payment and booking completed successfully!';
    res.json({ success: true, redirect: '/index' });
    } catch (err) {
    console.error('Error completing payment and booking:', err);
    res.status(500).json({ message: 'Error completing booking', error: err });
  }
});






// Get all bookings
router.get('/allbookings', async (req, res) => {
  try {
    const bookings = await Booking.find().populate('user').populate('room');
    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bookings', error: err });
  }
});



// Get a specific booking by ID
router.get('/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user').populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    res.status(200).json(booking);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching booking', error: err });
  }
});


// Render the edit booking page
router.get('/edit/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('user').populate('room');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Render an edit page (e.g., editBooking.ejs) with the booking details
    res.render('editBooking', { booking });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching booking for editing', error: err });
  }
});




// Update a booking with edited details
router.post('/edit/:id', async (req, res) => {
  const { startDate, endDate, status, specialRequest } = req.body;

  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Update booking details
    if (startDate) booking.startDate = startDate;
    if (endDate) booking.endDate = endDate;
    if (status) booking.status = status;
    if (specialRequest) booking.specialRequest = specialRequest;

    await booking.save();
    console.log('Booking updated:', booking);

    // Optionally, redirect to a confirmation page or back to booking list
    res.redirect('/profile');
  } catch (err) {
    res.status(500).json({ message: 'Error updating booking', error: err });
  }
});

// Delete a booking
router.delete('/:id', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    console.log('Booking deleted:', booking);

    // Optionally, redirect to a confirmation page or back to booking list
    res.redirect('/profile');
  } catch (err) {
    res.status(500).json({ message: 'Error deleting booking', error: err });
  }
});


//cancell the booking
router.get('/cancel/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = 'Cancelled';
    await booking.save();
    console.log('Booking cancelled:', booking);

    // Optionally, redirect to a confirmation page or back to booking list
    res.redirect('/profile');
  } catch (err) {
    res.status(500).json({ message: 'Error cancelling booking', error: err });
  }
});



module.exports = router;