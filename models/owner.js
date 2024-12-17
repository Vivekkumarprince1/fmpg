// models/Owner.js
const mongoose = require('mongoose');
const Property = require('./Property');

const ownerSchema = new mongoose.Schema({
    ownerName: { type: String, required: true },
    userId: {type: mongoose.Schema.Types.ObjectId,ref: 'user'},
    contactNumber: { type: String, required: true },
    email: { type: String, required: true },
    propertyName: { type: String, require: true },
    type: { type: String, enum: ['PG', 'Hostel', 'PG with Mess'] },
    address: { type: String, required: true },
    map: { type: String, required: true },
    locations: {type: [String],required: true, },
    landmark: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'unisex'] },
    amenities: [{ type: String}],
    rules: { type: String, required: true },
    securityDeposit: { type: Number, required: true },
    images: [{ type: String }], // Field to store the image path
    rooms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room'}],
    description: {type: String,required: true},
    additionalDetails: {type: String},
    tenantContract: {type: String},
    status:{type: String,enum: ['Pending', 'Confirmed', 'Cancelled'],default: 'Pending' ,}
});

const Owner = mongoose.model('Owner', ownerSchema);
module.exports = Owner;
