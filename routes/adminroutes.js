const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const Admin=require('../models/admin');
const { response } = require('../app');
const User=require('../models/users');
const mongoose = require('mongoose');
const Contact = require('../models/Contact'); // Adjust the path based on your folder structure


// View all users
router.get('/users', isAuthenticated, async (req, res) => {
  const users = await User.find({});
  res.render('admin/users', { users });
});

// Add a new user
router.get('/users/add', isAuthenticated, (req, res) => {
  res.render('admin/addUser');
});

router.post('/users/add', isAuthenticated, async (req, res) => {
  const { username, email, mobile, password } = req.body;
  const newUser = new User({ username, email, mobile });
  await User.register(newUser, password);
  res.redirect('/admin/users');
});

// Edit a user
router.get('/users/edit/:id', isAuthenticated, async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render('admin/editUser', { user });
});

router.post('/users/edit/:id', isAuthenticated, async (req, res) => {
  const { username, email, mobile } = req.body;
  await User.findByIdAndUpdate(req.params.id, { username, email, mobile });
  res.redirect('/admin/users');
});

// Delete a user
router.post('/users/delete/:id', isAuthenticated, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/admin/users');
});


// View all properties
router.get('/properties', isAuthenticated, async (req, res) => {
  try {
    const properties = await Property.find({}).populate('rooms');
    res.render('admin/properties', { properties },);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add a new property
router.get('/properties/add', isAuthenticated, (req, res) => {
  res.render('admin/addProperty');
});

router.post('/properties/add', isAuthenticated, async (req, res) => {
  try {
    console.log(req.body); // Log the entire request body

    const images = req.body['images[]'];
    const amenities = req.body['amenities[]'];

    // Extract room data
    const roomsData = [];
    for (const key in req.body) {
      if (key.startsWith('rooms[')) {
        const match = key.match(/rooms\[(\d+)\]\[(\w+)\]/);
        if (match) {
          const index = match[1];
          const field = match[2];
          if (!roomsData[index]) {
            roomsData[index] = {};
          }
          roomsData[index][field] = req.body[key];
        }
      }
    }

    // Check if roomsData is an array
    if (!Array.isArray(roomsData)) {
      console.log('Rooms Data:', roomsData); // Log roomsData to see its structure
      throw new Error('Rooms data is not in the expected format.');
    }

    // Create rooms
    const rooms = [];
    for (const roomData of roomsData) {
      const room = new Room({
        number: roomData.number,
        type: roomData.type,
        price: roomData.price,
        available: roomData.available === 'true', // Convert
        capacity: roomData.capacity,// string to boolean
      });
      await room.save();
      rooms.push(room._id); // Save the room ID to the property
    }


    // Create property
    const { name, location, type, map, owner, description } = req.body;
    const newProperty = new Property({
      name,
      location,
      type,
      images: Array.isArray(images) ? images : [images],
      map,
      amenities: Array.isArray(amenities) ? amenities : [amenities],
      description,
      rooms, // Add room references to property
      owner,
    });

    // Check if the owner exists and update their role
    const user = await User.findOne({ username: owner });
    if (user) {
      user.role = 'owner'; // Update role to owner
      await user.save(); // Save the updated user
    } else {
      // return res.status(404).send('Owner username does not exist');
    }

    await newProperty.save();
    res.redirect('/admin/properties');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});




// Edit a property
router.get('/properties/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('rooms');

    console.log('Property fetched:', property); // Debugging line

    if (!property) {
      return res.status(404).send('Property not found');
    }

    res.render('admin/editProperty', { property });
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).send('Server Error');
  }
});


router.post('/properties/edit/:id', isAuthenticated, async (req, res) => {
  try {
    // Retrieve the property from the database
    const property = await Property.findById(req.params.id).populate('rooms');

    if (!property) {
      return res.status(404).send('Property not found');
    }

    // Extract property details from the request body
    const { name, location, type, map, description, owner } = req.body;
    let images = req.body['images[]'] || [];
    let amenities = req.body['amenities[]'] || [];

    // Ensure images and amenities are arrays
    if (!Array.isArray(images)) images = [images];
    if (!Array.isArray(amenities)) amenities = [amenities];

    // Extract room data from the request body
    const roomNumbers = req.body['rooms[number][]'] || [];
    const rooms = req.body['rooms[type][]'] || [];
    const roomPrices = req.body['rooms[price][]'] || [];
    const roomCapacities = req.body['rooms[capacity][]'] || [];
    const roomAvailabilities = req.body['rooms[available][]'] || [];

    // Initialize roomsData array
    const roomsData = [];

    // Process each room
    for (let i = 0; i < roomNumbers.length; i++) {
      const roomData = {
        number: roomNumbers[i],
        type: rooms[i],
        price: roomPrices[i],
        capacity: roomCapacities[i], // Adding capacity
        available: roomAvailabilities[i] === 'on'
      };

      // Check if the room already exists
      const existingRoom = await Room.findOne({ number: roomData.number });
      if (existingRoom) {
        await Room.findByIdAndUpdate(existingRoom._id, roomData);
        roomsData.push(existingRoom._id); // Track updated room ID
      } else {
        const newRoom = new Room(roomData);
        await newRoom.save();
        roomsData.push(newRoom._id); // Track newly created room ID
      }
    }

    // Check if the owner exists and update their role
   const user = await User.findOne({ username: owner });
   if (user) {
     user.role = 'owner'; // Update role to owner
     await user.save(); // Save the updated user
   } else {
     // return res.status(404).send('Owner username does not exist');
   }

    // Update property with new data
    const updatedProperty = {
      name, location, type, map, description, images, amenities, rooms: roomsData, owner // Adding owner
    };

    await Property.findByIdAndUpdate(req.params.id, updatedProperty);
    res.redirect('/admin/properties');
  } catch (err) {
    console.error('Error updating property:', err);
    res.status(500).send('Error updating property');
  }

   
});


// Delete a property
router.post('/properties/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    res.redirect('/admin/properties');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// View all rooms
router.get('/rooms', isAuthenticated, async (req, res) => {
    try {
      const rooms = await Room.find({}).populate('property');
      res.render('admin/rooms', { rooms });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  
  // Add a new room
  router.get('/rooms/add', isAuthenticated, async (req, res) => {
    try {
      const properties = await Property.find({});
      res.render('admin/addRoom', { properties });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  
  router.post('/rooms/add', isAuthenticated, async (req, res) => {
    try {
      const { property, number, type, price } = req.body;
      const available = req.body.available === "on"; // Convert "on" to true, else false
  
      const newRoom = new Room({ property, number, type, price, available }); // Use correct model variable `Room`
      await newRoom.save();
      res.redirect('/admin/rooms');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  
  // Edit a room
  router.get('/rooms/edit/:id', isAuthenticated, async (req, res) => {
    try {
      const room = await Room.findById(req.params.id).populate('property');
      const properties = await Property.find({});
      res.render('admin/editRoom', { room, properties });
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  
  router.post('/rooms/edit/:id', isAuthenticated, async (req, res) => {
    try {
      const { property, number, type, price } = req.body;
      const available = req.body.available === "on"; // Convert "on" to true, else false
      await Room.findByIdAndUpdate(req.params.id, { property, number, type, price, available });
      res.redirect('/admin/rooms');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });
  
  // Delete a room
  router.post('/rooms/delete/:id', isAuthenticated, async (req, res) => {
    try {
      await Room.findByIdAndDelete(req.params.id);
      res.redirect('/admin/rooms');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
  });


// View all bookings
router.get('/bookings', isAuthenticated, async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate({
        path: 'user',          // Populate the 'user' field
        select: 'username email' // Select only necessary fields, e.g., 'username' and 'email'
      })
      .populate({
        path: 'room',          // Populate the 'room' field
        select: 'number type price' // Select specific fields, e.g., 'number', 'type', and 'price'
      })
      .populate({
        path: 'propertyID',    // Populate the 'propertyID' field
        select: 'name location'  // Select specific fields, e.g., 'name' and 'location'
      });

    res.render('admin/bookings', { bookings });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

//Route to fetch rooms by property
router.get('/rooms-by-property/:propertyId', async (req, res) => {
  try {
      const propertyId = req.params.propertyId;
      const property = await Property.findById(propertyId).populate('rooms');
      if (!property) {
          return res.status(404).json({ error: 'Property not found' });
      }
      res.json({ rooms: property.rooms });
  } catch (err) {
      console.error('Error fetching rooms:', err);
      res.status(500).json({ error: 'Server error' });
  }
});


// Add a new booking
router.get('/bookings/add', isAuthenticated, async (req, res) => {
try {
  const users = await User.find({});
  const properties = await Property.find({});
  res.render('admin/addBooking', { users, properties, rooms: [] });
} catch (err) {
  console.error(err);
  res.status(500).send('Server Error');
}
});

router.post('/bookings/add', isAuthenticated, async (req, res) => {
  try {
    const { user, propertyID , username, room, mobile, startDate, endDate, specialRequest } = req.body;

    const property = await Property.findById(propertyID);
    if (!property) {
      return res.status(404).send('Property not found');
    }

    if (!property.owner) {
      return res.status(400).send('Property does not have an owner');
    }

    const newBooking = new Booking({ user ,owner: property.owner , propertyID , username, room, mobile, startDate, endDate, specialRequest });
    
    await newBooking.save();
    
    res.redirect('/admin/bookings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// Edit a booking
router.get('/bookings/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'room',
        populate: {
          path: 'property'  // Populate property within room
        }
      })
      .populate('user');
    
    const users = await User.find({});
    const properties = await Property.find({});
    const rooms = await Room.find({});

    res.render('admin/editBooking', { booking, users, properties, rooms });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.post('/bookings/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const { user, room, mobile, specialRequest } = req.body;
    await Booking.findByIdAndUpdate(req.params.id, { user, room, mobile, specialRequest });
    res.redirect('/admin/bookings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Delete a booking
router.post('/bookings/delete/:id', isAuthenticated, async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.redirect('/admin/bookings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


//view routes
router.get('/booking/view/:id', isAuthenticated, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('propertyID').populate('room')
      .populate({
        path: 'room',
        populate: {
          path: 'property'  // Populate property within room
        }
      })
      .populate('user');
    const users = await User.find({});
    const properties = await Property.find({});
    const rooms = await Room.find({});

    res.render('admin/view', { booking, users, properties, rooms });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



router.get('/messages', async (req, res) => {
  try {
      const messages = await Contact.find(); // Fetch all messages
      res.render('admin/messages', { messages });
  } catch (error) {
      console.log('Error fetching messages:', error);
      res.status(500).send('Internal server error.');
  }
});




function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/admin/login');
  }
  

module.exports = router;
