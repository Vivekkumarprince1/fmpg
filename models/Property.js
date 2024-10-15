//Property.js
const mongoose = require('mongoose');
const { type } = require('os');

// Define the schemaconst
 propertySchema = new mongoose.Schema({
  name: {type: String,required: true},
  locations: {type: [String],required: true, },
  type: {type: String, enum:['PG','Hostel','Flat','PG with Mess'],required: true},
  images: {type: [String],},
  map: {type: String},
  amenities: {type: [String]},
  description: {type: String,required: true},
  rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'room' }],
  owner: { type: String,require:true },
  gender: { type: String, enum: ['male', 'female', 'unisex'] },
  lat: Number, // Latitude for distance calculation
  lng: Number, // Longitude for distance calculation
});

// Create the model
const Property = mongoose.model('Property', propertySchema);

module.exports = Property;
