const express = require('express');
const router = express.Router();
const User = require('../models/users');

// GET route for settings page
router.get('/', (req, res) => {
  if (!req.isAuthenticated()) {
    req.flash('error', 'Please log in to view this page.');
    return res.redirect('/login');
  }
  
  res.render('settings', { user: req.user });
});

// POST route to update username or mobile
router.post('/update', async (req, res) => {
  const { username, mobile } = req.body;

  // Ensure the user is logged in
  if (!req.isAuthenticated()) {
    req.flash('error', 'You need to log in first.');
    return res.redirect('/login');
  }

  try {
    // Find the user and update details
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { username, mobile },
      { new: true }
    );

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/profile');
  } catch (err) {
    req.flash('error', 'An error occurred while updating profile.');
    res.redirect('/settings');
  }
});

module.exports = router;
