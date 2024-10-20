const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/users');
// const Booking = require('../models/Booking');
// const Property = require('../models/Property');
const Analysis = require('../models/Analysis');


async function getBookingsOverTime() {
  return await Booking.aggregate([
      {
          $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 }
          }
      },
      { $sort: { _id: 1 } }
  ]);
}

// Route to get analytics data
router.get('/',isAuthenticated, async (req, res) => {
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
      // Example: Fetch bookings per property (for chart)
      const bookingsPerProperty = await Booking.aggregate([
        {
          $group: {
            _id: '$room',
            total: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'properties',
            localField: '_id',
            foreignField: 'type', // Ensure 'type' matches the field in the 'properties' collection
            as: 'property'
          }
        },
        {
          $unwind: {
            path: '$property',
            preserveNullAndEmptyArrays: true // Ensure properties are included even if there's no match
          }
        },
        {
          $project: {
            property: { $ifNull: ['$property.name', 'Unknown'] }, // Use default name if no property found
            total: 1
          }
        }
      ]);
      
  
      res.render('admin/analytics',{
        totalBookings,
            confirmedBookings,
            pendingBookings,
            cancelledBookings,
            activeBookings,
            singleRoomProperties,
            doubleRoomProperties,
            maleProperties,
            femaleProperties,
            totalUsers,
        bookingsPerProperty
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

  function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
            return next();
        } else {
            return res.status(403).send('Access Denied: You do not have the required permissions.');
        }
    }
    res.redirect('/login');
}

module.exports = router;
