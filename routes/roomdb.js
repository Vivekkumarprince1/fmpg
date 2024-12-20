//roomdb.js
var express = require('express');
var router = express.Router();
const roomSchema = require("../models/Room");
const propertySchema = require("../models/Property");
const localStrategy = require("passport-local");
const { error } = require('console');


// router.get('/create', async function(req, res, next) {
//   console.log("Entering the create route");
  
//   try {
//     const createdRoom = await roomSchema.create({
//       property: "66cfa380712e965bbca4c607",
//       number: "9417272282",
//       type: "Shared",
//       price: "1200",
//       available: true
//     });

//     const propertyID = createdRoom.property;
//     const property = await propertySchema.findByIdAndUpdate(propertyID, {
//       $push: { rooms: createdRoom._id }
//     })
//     console.log(propertyID, property)

//     console.log("Room created successfully:", createdRoom);
//     res.status(201).json(createdRoom);
//   } catch (err) {
//     console.error("Error creating room:", err);
//     res.status(500).json({ error: 'Failed to create room' });
//   }
// });


//   router.get('/find/:roomID', async function(req, res, next) {
//     const roomID = req.params.roomID;
//     console.log("RoomID: ", roomID)
//     try{
//       const room = await roomSchema.findById(roomID);
//       res.status(200).send({ success: true, message: "Finded room successfully", data: room })
//     }catch(err){
//       console.log("Error while finding the room" + err);
//       res.status(404).send({ message: "Error while finding the room" });
//     }
//   });

  module.exports=router;