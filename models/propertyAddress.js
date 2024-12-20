const mongoose = require('mongoose');

const address = new Address({
    locallity: {type : String,required: true},
    city: {type : String,required: true},
    state: {type : String,required: true},
    country: {type : String,required: true},
    zip: {type : String,required: true},
})