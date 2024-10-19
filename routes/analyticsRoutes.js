const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const Booking = require('../models/Booking');
const Property = require('../models/Property');
const User = require('../models/users');

// Google Analytics API Setup
const analytics = google.analyticsreporting('v4');
const googleAuth = new google.auth.GoogleAuth({
    // keyFile: 'a.json', // Update with your service account key file path
    scopes: 'https://www.googleapis.com/auth/analytics.readonly',
});

// Route to fetch analytics data

// Function to fetch Google Analytics data
async function getGoogleAnalyticsData() {
    const authClient = await googleAuth.getClient();
    const response = await analytics.reports.batchGet({
        auth: authClient,
        requestBody: {
            reportRequests: [
                {
                    viewId: 'eca3847049eb50e3a1cd5e3b8bb88e015b4a6c48', // Replace with your Google Analytics View ID
                    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
                    metrics: [{ expression: 'ga:sessions' }, { expression: 'ga:pageviews' }],
                    dimensions: [{ name: 'ga:country' }],
                },
            ],
        },
    });
    return response.data;
}



// Function to fetch bookings over time
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
router.get('/', isAuthenticated, async (req, res) => {
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

        // Fetch Google Analytics data
        const googleAnalyticsData = await getGoogleAnalyticsData();
        // Fetch bookings over time
        const bookingsOverTime = await getBookingsOverTime();

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
            totalUsers,
            googleAnalyticsData: googleAnalyticsData.reports[0].data,
            bookingsOverTime
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
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
