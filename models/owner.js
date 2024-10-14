// models/Owner.js
const mongoose = require('mongoose');
const Property = require('./Property');

const ownerSchema = new mongoose.Schema({
    ownerName: { type: String, required: true },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true },
    propertyName: { type: String, require: true },
    type: { type: String, enum: ['PG', 'Hostel', 'PG with Mess'] },
    address: { type: String, required: true },
    location: { type: String, required: true },
    landmark: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'unisex'] },
    amenities: [{ type: String}],
    rules: { type: String, required: true },
    securityDeposit: { type: Number, required: true },
    ownerImages: [{ type: String }], // Field to store the image path
    rooms: [{ type: mongoose.Schema.Types.ObjectId, 
        ref: 'Room' 
    }],
    description: {type: String,required: true},

});

const Owner = mongoose.model('Owner', ownerSchema);
module.exports = Owner;
