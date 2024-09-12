const mongoose = require('mongoose');
const room = require('../models/Room');

const bookingSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: [true, 'Path `mobile` is required.'],
  },
  startDate: {
    type: Date,
    required: [true, 'Path `startDate` is required.'],
  },
  endDate: {
    type: Date,
    required: [true, 'Path `endDate` is required.'],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'room',
    required: true,
  },
  specialRequest: {
    type: String,
    required: false,
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Confirmed', 'Cancelled'],
    default: 'Pending' 
  },
  username: { 
    type: String,
    required: true 
  },
  propertyID: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Property',
    required: true // Ensure this is required
  },
  owner: { 
    type: String,
    ref: 'User', 
    required: true }, // Reference to the owner
});

module.exports = mongoose.model('Booking', bookingSchema);
