const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/users');
const { isAuthenticated, authorizeAdmin } = require('../middleware/auth'); // Adjust path as needed


// Helper function to get booking count over time
async function getBookingsOverTime() {
  return await Booking.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%d-%m-%Y", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
}

// Helper function to get booking count by property types
async function getBookingsByPropertyType() {
  return await Booking.aggregate([
    {
      $lookup: {
        from: 'properties', // Reference the properties collection
        localField: 'propertyID', // Match propertyID in bookings
        foreignField: '_id', // Match by property _id in properties
        as: 'property'
      }
    },
    { $unwind: '$property' }, // Unwind the property array
    {
      $group: {
        _id: '$property.type', // Group by property type (PG, Hostel, Flat, etc.)
        count: { $sum: 1 } // Count bookings for each type
      }
    },
    { $sort: { count: -1 } } // Sort in descending order by count
  ]);
}

// Route to get analytics data
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({ status: 'Confirmed' });
    const pendingBookings = await Booking.countDocuments({ status: 'Pending waiting for owner confirmation' });
    const cancelledBookings = await Booking.countDocuments({ status: 'Cancelled' });
    const bookingsOverTime = await getBookingsOverTime();
    
    const activeBookings = await Booking.countDocuments({
      startDate: { $lt: Date.now() },
      endDate: { $gt: Date.now() }
    });

    const totalProperties = await Property.countDocuments();

    const pgProperties = await Property.countDocuments({ type: 'PG' });
    const hostelProperties = await Property.countDocuments({ type: 'Hostel' });
    const flatProperties = await Property.countDocuments({ type: 'Flat' });
    const pgWithMessProperties = await Property.countDocuments({ type: 'PG with Mess' });
    const maleProperties = await Property.countDocuments({ gender: 'male' });
    const femaleProperties = await Property.countDocuments({ gender: 'female' });

    const totalUsers = await User.countDocuments();
    const user = await User.findOne({ email: req.user.email });

    const bookingsPerProperty = await Booking.aggregate([
      {
        $group: {
          _id: '$propertyID', // Group by propertyID, not room
          total: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'properties', // Make sure this matches the actual collection name
          localField: '_id',  // Group by _id which is now propertyID
          foreignField: '_id', // Lookup by _id in the properties collection
          as: 'property'
        }
      },
      {
        $unwind: {
          path: '$property',
          preserveNullAndEmptyArrays: true // In case no matching property is found
        }
      },
      {
        $project: {
          propertyName: { $ifNull: ['$property.name', 'Unknown'] }, // Use property.name
          total: 1
        }
      }
    ]);

    const bookingsByPropertyType = await getBookingsByPropertyType(); // Fetch bookings by property type
    
    console.log(
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      activeBookings,
      totalProperties,
      pgProperties,
      hostelProperties,
      flatProperties,
      pgWithMessProperties,
      maleProperties,
      femaleProperties,
      totalUsers,
      bookingsPerProperty,
      bookingsOverTime,
      bookingsByPropertyType // Log to check
    );

    // Send analytics data to the frontend
    res.render('admin/analytics', {
      totalBookings,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      activeBookings,
      totalProperties,
      pgProperties,
      hostelProperties,
      flatProperties,
      pgWithMessProperties,
      maleProperties,
      femaleProperties,
      totalUsers,
      bookingsPerProperty,
      bookingsOverTime,
      bookingsByPropertyType, // Send this to the frontend
      admin: user
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authentication check middleware
// function isAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) {
//     if (req.user.role === 'admin' || req.user.role === 'superadmin') {
//       return next();
//     } else {
//       return res.status(403).send('Access Denied: You do not have the required permissions.');
//     }
//   }
//   res.redirect('/login');
// }

module.exports = router;
