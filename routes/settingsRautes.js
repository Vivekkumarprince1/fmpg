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
router.post('/update', (req, res) => {
  const { username, mobile } = req.body;

  // Ensure the user is logged in
  if (!req.isAuthenticated()) {
    req.flash('error', 'You need to log in first.');
    return res.redirect('/login');
  }

  // Find the user and update details
  User.findByIdAndUpdate(req.user._id, { username, mobile }, { new: true }, (err, updatedUser) => {
    if (err) {
      req.flash('error', 'An error occurred while updating profile.');
      return res.redirect('/settings');
    }

    req.flash('success', 'Profile updated successfully.');
    res.redirect('/settings');
  });
});

module.exports = router;
