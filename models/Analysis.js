const mongoose = require('mongoose');

const analysisSchema = new mongoose.Schema({
  totalBookings: {
    type: Number,
    required: true,
    default: 0,
  },
  activeBookings: {
    type: Number,
    required: true,
    default: 0,
  },
  totalProperties: {
    type: Number,
    required: true,
    default: 0,
  },
  bookingsByDate: [
    {
      date: { type: Date, required: true },
      count: { type: Number, required: true },
    }
  ],
  propertyOccupancyRates: [
    {
      property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
      occupancyRate: { type: Number, required: true },
    }
  ],
  bookingStatusSummary: {
    confirmed: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Analysis', analysisSchema);
