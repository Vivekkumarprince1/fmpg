const express = require('express');
const router = express.Router();
const User = require('../models/users');
const { isAuthenticated, authorizeAdmin } = require('../middleware/auth'); // Adjust path as needed

// GET route for settings page
router.get('/',isAuthenticated, (req, res) => {
  
  res.render('settings', { user: req.user });
});

// POST route to update username or mobile
router.post('/update',isAuthenticated, async (req, res) => {
  const { username, mobile } = req.body;

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
