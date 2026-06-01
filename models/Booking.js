//Booking.js
const mongoose = require('mongoose');

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
    enum: ['Pending waiting for owner confirmation', 'Confirmed', 'Cancelled'],
    default: 'Pending waiting for owner confirmation' 
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
}, { timestamps: true });

bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ propertyID: 1, status: 1 });
bookingSchema.index({ room: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
