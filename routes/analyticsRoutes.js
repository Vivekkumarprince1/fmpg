//analisisroutes.js

const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User=require('../models/users')

// Route to get analytics data
router.get('/', async (req, res) => {
  try {
      const totalBookings = await Booking.countDocuments();
      const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
      const pendingBookings = await Booking.countDocuments({ status: 'pending' });
      const cancelledBookings = await Booking.countDocuments({ status: 'cancelled' });
      
      const activeBookings = await Booking.countDocuments({ 
          startDate: { $lt: Date.now() }, 
          endDate: { $gt: Date.now() } 
      });

      const singleRoomProperties = await Property.countDocuments({ type: 'single' });
      const doubleRoomProperties = await Property.countDocuments({ type: 'double' });
      const maleProperties = await Property.countDocuments({ gender: 'male' });
      const femaleProperties = await Property.countDocuments({ gender: 'female' });

      const totalUsers = await User.countDocuments();
    

      res.render('admin/analytics', {
          totalBookings,
          confirmedBookings,
          pendingBookings,
          cancelledBookings,
          activeBookings,
          singleRoomProperties,
          doubleRoomProperties,
          maleProperties,
          femaleProperties,
          totalUsers
      });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});
  

module.exports = router;
