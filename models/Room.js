//Room.js
const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
 owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' }, // Reference to Owner model
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  number: { type: String, required: true },
  capacity: {
    type: Number,
    required: true,
  },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  available: { type: Boolean, default: true }
});

const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
module.exports = mongoose.model('room', RoomSchema);

