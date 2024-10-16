//Room.js
const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
 owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner' }, // Reference to Owner model
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  number: { type: String },
  capacity: {
    type: Number,
    required: true,
  },
  type: { type: String, enum:['single','double','triple','more than three'], required: true },
  price: { type: Number, required: true },
  available: { type: Boolean, default: true },
  availableRooms: { type: Number, required: true },
});

const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);
module.exports = mongoose.model('room', RoomSchema);

