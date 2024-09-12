const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Property = require('../models/Property');

// Route to get analytics data
// Route to get analytics data
router.get('/', async (req, res) => {
    try {
      // Fetch number of active bookings (status: Confirmed)
      const activeBookings = await Booking.countDocuments({ status: 'Confirmed' });
  
      // Fetch total number of bookings
      const totalBookings = await Booking.countDocuments();
  
      // Fetch total number of properties available
      const totalProperties = await Property.countDocuments();
  
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
      
  
      console.log('Analytics Data:', {
        activeBookings,
        totalBookings,
        totalProperties,
        bookingsPerProperty
      });
  
      res.json({
        activeBookings,
        totalBookings,
        totalProperties,
        bookingsPerProperty
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  

module.exports = router;
