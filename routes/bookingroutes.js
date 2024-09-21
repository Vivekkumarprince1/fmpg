const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/users');
const { render } = require('ejs');
const flash=require("connect-flash");


// Create a new booking
router.post('/', async (req, res) => {
  const { mobile, startDate, endDate, userId, roomId, specialRequest, username, propertyID } = req.body;

  if (!mobile || !startDate || !endDate || !userId || !roomId || !propertyID) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(roomId) || !mongoose.Types.ObjectId.isValid(propertyID)) {
    return res.status(400).json({ message: 'Invalid userId, roomId, or propertyID' });
  }

  try {
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
      propertyID: new mongoose.Types.ObjectId(propertyID), // Ensure correct field is used
      owner: property.owner,
      specialRequest,
      username,
      status: 'Pending',
    });

    await booking.save();
    console.log(booking);
    // Set success message in session
    req.session.message = 'Booking created successfully';
    res.redirect('/'); // Redirect to the main page
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ message: 'Error creating booking', error: err });
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



// router.get("/findByUser/:userID", async (req, res) => {
//   const userID = req.params.userID;
//   console.log("User ID: ", userID)
//   try {
//     console.log("ho gya");
//     const bookings = await Booking.find({ user: userID }).populate('user').populate('room');
//     // res.status(200).json(bookings);
//     res.render('profile',{bookings,userID});
   
//   } catch (err) {
//     console.log("Error while fetching bookings: ", err);
//     res.status(500).json({ message: 'Error fetching bookings', error: err });
//     console.log(bookings)
//   }
// })



// Update a booking
// router.put('/:id', async (req, res) => {
//   const { startDate, endDate, status, specialRequest } = req.body;

//   try {
//     const booking = await Booking.findById(req.params.id);
//     if (!booking) return res.status(404).json({ message: 'Booking not found' });

//     if (startDate) booking.startDate = startDate;
//     if (endDate) booking.endDate = endDate;
//     if (status) booking.status = status;
//     if (specialRequest) booking.specialRequest = specialRequest;

//     await booking.save();
//     res.status(200).json(booking);
//   } catch (err) {
//     res.status(500).json({ message: 'Error updating booking', error: err });
//   }
// });



// // Delete a booking
// router.delete('/:id', async (req, res) => {
//   try {
//     const booking = await Booking.findByIdAndDelete(req.params.id);
//     if (!booking) return res.status(404).json({ message: 'Booking not found' });

//     res.status(200).json({ message: 'Booking deleted successfully' });
//   } catch (err) {
//     res.status(500).json({ message: 'Error deleting booking', error: err });
//   }
// });

module.exports = router;