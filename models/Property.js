//Property.js
const mongoose = require('mongoose');
const { type } = require('os');

// Define the schemaconst
 propertySchema = new mongoose.Schema({
  propertyName: {type: String,required: true},
  userId: {type: mongoose.Schema.Types.ObjectId,ref: 'users'},
  locations: {type: [String],required: true, },
  type: {type: String, enum:['PG','Hostel','Flat','PG with Mess'],required: true},
  images: {type: [String],},
  tenantContract: {type: String,},
  map: {type: String},
  amenities: {type: [String]},
  additionalDetails: {type: String},
  description: {type: String,required: true},
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'room' }],
  ownerName: { type: String,require:true },
  gender: { type: String, enum: ['male', 'female', 'unisex'] },
  lat: Number, // Latitude for distance calculation
  lng: Number, // Longitude for distance calculation
  rules: { type: String, required: true },
  securityDeposit: { type: Number, required: true },
  status:{type: String,enum: ['Pending', 'Confirmed', 'Cancelled'],default: 'Confirmed' ,},
  email: { type: String, required: true },
  contactNumber: { type: String, required: true },
  address: { type: String, required: true },
  landmark: { type: String, required: true },
});

// Create the model
const Property = mongoose.model('Property', propertySchema);
module.exports = Property;
