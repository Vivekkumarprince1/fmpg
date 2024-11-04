//adminroutes.js

const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const { response } = require('../app');
const User=require('../models/users');
const mongoose = require('mongoose');
const Contact = require('../models/Contact'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Owner = require('../models/owner');
const bcrypt = require('bcryptjs');

router.get('/form', function (req, res, next) {
  res.render('admin/pages/forms/basic-forms');
});

// Route to display all owners on the admin page
router.get('/newOwnerrequest', isAuthenticated, async (req, res) => {
  try {
    // Fetch all owners from the database and populate the rooms field
    const owners = await Owner.find().populate('rooms').exec();
    const user = await User.findOne({ email: req.session.passport.user });

    // Render the admin page with owner data
    res.render('admin/newOwnerrequest', { owners,admin:user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Confirm route - Convert Owner to Property and delete from Owner collection
router.post('/confirm/:ownerId', isAuthenticated, async (req, res) => {
  try {
    // Find the owner by ID
    const owner = await Owner.findById(req.params.ownerId);
    if (!owner) {
      return res.status(404).send('Owner not found');
    }

    // Extract relevant data from owner to create a new property
    const newProperty = new Property({
      propertyName: owner.propertyName,
      locations: owner.locations,
      type: owner.type,
      gender: owner.gender,
      landmark: owner.landmark,
      additionalDetails: owner.additionalDetails,
      address: owner.address,
      contactNumber: owner.contactNumber,
      email: owner.email,
      securityDeposit: owner.securityDeposit,
      rules: owner.rules,
      images: owner.images, // Use the owner's uploaded images
      map: owner.map,
      amenities: owner.amenities,
      description: owner.description,
      rooms: owner.rooms, // Assuming the owner has rooms data
      ownerName: owner.ownerName,
      tenantContract: owner.tenantContract, // Use the owner's tenant contract if uploaded
    });

    // Save the new property in the Property collection
    await newProperty.save();

    // Optionally, update the owner's user role to 'owner' if the user exists
    const user = await User.findOne({ email: owner.email });
    if (user) {
      user.role = 'owner';
      await user.save(); // Update and save the user role
    }

    // Remove the owner from the Owner collection
    await Owner.findByIdAndDelete(req.params.ownerId);

    // Redirect or send success response
    req.session.success = 'Owner confirmed and added as a property';
    res.redirect('/admin/properties');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Cancel owner request
router.post('/cancel/:ownerId', isAuthenticated, async (req, res) => {
  try {
      const ownerId = req.params.ownerId; // Use req.params.ownerId correctly
      const owner = await Owner.findById(ownerId); // Find the owner by ID
      if (!owner) {
          return res.status(404).send('Owner not found'); // Handle case where owner is not found
      }
      owner.status = 'Cancelled'; // Update the status to 'Cancelled'
      await owner.save(); // Save the updated owner document back to the database

      res.redirect('/admin/newOwnerrequest'); // Redirect back to the owner listings
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});

// View owner details
router.get('/view/:id', isAuthenticated, async (req, res) => {
  try {
      const ownerId = req.params.id;
      console.log(ownerId);
      const owner = await Owner.findById(ownerId).populate('rooms').populate({
        path: 'userId',          // Populate the 'user' field
        select: 'username email mobile' // Select only necessary fields, e.g., 'username' and 'email'
      }) || await Property.findById(ownerId).populate('rooms').populate({
        path: 'userId',          // Populate the 'user' field
        select: 'username email mobile' // Select only necessary fields, e.g., 'username' and 'email'
      });
      const user = await User.findOne({ email: req.session.passport.user }); // Fetch the admin user
      if (!owner) {
          return res.status(404).send('Owner not found');
      }
      res.render('admin/viewOwner', { owner,admin:user }); // Render a new page with owner details
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});



// View all users
router.get('/users',isAuthenticated, async (req, res) => {
  const users = await User.find({});
  const user = await User.findOne({ email: req.session.passport.user });
  res.render('admin/users', { users, admin:user});
});


// Add a new user
router.get('/users/add', isAuthenticated, async(req, res) => {
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
  const { username, email, mobile,role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { username, email, mobile,role });
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
    const user = await User.findOne({ email: req.session.passport.user });
    res.render('admin/properties', { properties ,admin:user},);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// Add a new property
router.get('/properties/add', isAuthenticated, async(req, res) => {
  const propertyTypes = ['PG', 'Hostel', 'Flat', 'PG with Mess'];
  const user = await User.findOne({ email: req.session.passport.user });
  res.render('admin/addProperty',{propertyTypes,admin:user});
});



// Set storage engine for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      const folderPath = `public/PG-photos/${req.body.propertyName}`;
      
      fs.mkdir(folderPath, { recursive: true }, (err) => {
          if (err) return cb(err);
          cb(null, folderPath);
      });
  },
  filename: (req, file, cb) => {
      const folderPath = `public/PG-photos/${req.body.propertyName}`;

      fs.readdir(folderPath, (err, files) => {
          if (err) return cb(err);
          const imageCount = files.filter(f => f.startsWith(file.fieldname)).length + 1;
          cb(null, `${file.fieldname}-${imageCount}${path.extname(file.originalname)}`);
      });
  }
});

// Initialize multer for multiple file fields (images and tenantContract)
const upload = multer({
    storage: storage,
    limits: { fileSize: 12 * 1024 * 1024 }, // Limit: 12MB per file
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb('Error: Only images (jpg, jpeg, png) and PDFs are allowed!');
        }
    }
});

// Use upload.fields to handle both images and tenantContract
const uploadFields = upload.fields([
  { name: 'images', maxCount: 5 },  // Allow multiple images
  { name: 'tenantContract', maxCount: 1 } // Allow only one tenant contract
]);



router.post('/properties/add', uploadFields,isAuthenticated, async (req, res) => {
  try {
    console.log(req.body); // Log the entire request body
    console.log(req.files); // Log uploaded files for debugging

    // Get the paths of the uploaded images
    const imagePaths = req.files['images'] ? req.files['images'].map(file => `PG-photos/${req.body.propertyName}/${file.filename}`) : [];

    // Get the path of the uploaded tenantContract
    const tenantContractPath = req.files['tenantContract'] ? req.files['tenantContract'][0].path : null;

    // Validate that at least 1 image has been uploaded
    if (imagePaths.length < 1) {
      return res.status(400).send('You must upload at least 1 image.');
    }



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
    // Extract room data directly as an array
    // const roomsData = req.body.rooms;

    // Check if roomsData is an array
    if (!Array.isArray(roomsData)) {
      console.log('Rooms Data:', roomsData); // Log roomsData to see its structure
      throw new Error('Rooms data is not in the expected format.');
    }

    // Create rooms
    const rooms = [];
    for (const roomData of roomsData) {
      const room = new Room({
        // number: roomData.number,
        type: roomData.type,
        price: roomData.price,
        available: roomData.available === 'true', // Convert
        capacity: roomData.capacity,
        availableRooms: roomData.availableRooms,
      });
      await room.save();
      rooms.push(room._id); // Save the room ID to the property
    }


    // Create property
    const { propertyName, locations, type, gender,amenities, map, ownerName, description, rules, landmark, address, contactNumber, email,securityDeposit, additionalDetails} = req.body;
    const newProperty = new Property({
      propertyName,
      locations,
      type,
      gender,
      landmark,
      additionalDetails,
      address,
      contactNumber,
      email,
      securityDeposit,
      rules,
      images: imagePaths ,
      map,
      amenities: Array.isArray(amenities) ? amenities : [amenities],
      description,
      rooms, // Add room references to property
      ownerName,
      tenantContract:tenantContractPath,
    });

    // Check if the owner exists and update their role; otherwise, create a new user
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      // If no user exists, create one
      const hashedPassword = await bcrypt.hash(req.body.propertyName, 10); // Hash the password

      user = new User({
        username: req.body.propertyName,
        email: req.body.email,
        mobile: req.body.contactNumber,
        password: hashedPassword,
        role: 'owner',
      });
      await user.save();
    } else {
      user.role = 'owner'; // Update role to owner if user already exists
      await user.save();
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
    const user = await User.findOne({ email: req.session.passport.user });

    console.log('Property fetched:', property); // Debugging line

    if (!property) {
      return res.status(404).send('Property not found');
    }

    res.render('admin/editProperty', { property ,admin:user});
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).send('Server Error');
  }
});


router.post('/properties/edit/:id', uploadFields, isAuthenticated, async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('rooms');
    if (!property) {
      return res.status(404).send('Property not found');
    }

    // Extract property details from the request body
    const { propertyName, locations, type, gender, map, ownerName, description, rules, landmark, address, contactNumber, email, securityDeposit, additionalDetails } = req.body;

    // Handle uploaded images
    let images = req.body.existingImages || property.images; // If no new images are uploaded, use existing ones
    if (!Array.isArray(images)) images = [images]; // Ensure it's an array even if it's a single value

    if (req.files && req.files['images']) {
      // Append new image paths to the existing images
      const newImagePaths = req.files['images'].map(file => `PG-photos/${propertyName}/${file.filename}`);
      images = images.concat(newImagePaths);
    }



    // Handle image removal
    const removeImages = req.body.removeImages || [];  // Images marked for deletion
    removeImages.forEach(image => {
      // Remove image from the server
      const imagePath = path.join(__dirname, '../public/', image);  // Adjust the path as necessary
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      // Remove image from the images array
      images = images.filter(img => img !== image);
    });

    


    // Handle uploaded tenant contract
    const tenantContractPath = req.files['tenantContract'] ? req.files['tenantContract'][0].path : property.tenantContract;

    // Handle room updates
    // Handle rooms
    const roomUpdates = req.body.rooms || [];
    const updatedRooms = [];

    for (let i = 0; i < roomUpdates.length; i++) {
      const roomData = roomUpdates[i];
      if (roomData.id) {
        // Update existing room
        await Room.findByIdAndUpdate(roomData.id, {
          type: roomData.type,
          price: roomData.price,
          capacity: roomData.capacity,
          availableRooms: roomData.availableRooms,
          available: roomData.available === 'true'
        });
        updatedRooms.push(roomData.id);
      } else {
        // Create new room
        const newRoom = new Room({
          type: roomData.type,
          price: roomData.price,
          capacity: roomData.capacity,
          availableRooms: roomData.availableRooms,
          available: roomData.available === 'true'
        });
        await newRoom.save();
        updatedRooms.push(newRoom._id);
      }
    }

    // Remove rooms that are no longer in the form
    const existingRoomIds = property.rooms.map(room => room._id.toString());
    const updatedRoomIds = updatedRooms.map(roomId => roomId.toString());
    const roomsToDelete = existingRoomIds.filter(roomId => !updatedRoomIds.includes(roomId));

    for (const roomId of roomsToDelete) {
      await Room.findByIdAndDelete(roomId); // Delete rooms that were removed in the form
    }

    // Update property with new data
    const updatedProperty = {
      propertyName,
      locations,
      type,
      gender,
      map,
      ownerName,
      description,
      rules,
      landmark,
      address,
      contactNumber,
      email,
      securityDeposit,
      additionalDetails,
      images, // Now images contain both existing and new ones
      amenities: req.body['amenities'] || property.amenities,
      rooms: updatedRooms,
      tenantContract: tenantContractPath
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
        select: 'username email mobile' // Select only necessary fields, e.g., 'username' and 'email'
      })
      .populate({
        path: 'room',          // Populate the 'room' field
        select: 'number type price' // Select specific fields, e.g., 'number', 'type', and 'price'
      })
      .populate({
        path: 'propertyID'    // Populate the 'propertyID' field fully
    });
    
      
      const user = await User.findOne({ email: req.session.passport.user });

    res.render('admin/bookings', { bookings ,admin:user});
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
  const user = await User.findOne({ email: req.session.passport.user });
  res.render('admin/addBooking', { users, properties, rooms: [], admin:user});
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
   const owner=property.ownerName

    if (!owner) {
      return res.status(400).send('Property does not have an owner');
    }

    const newBooking = new Booking({ user , owner, propertyID , username, room, mobile, startDate, endDate, specialRequest });
    
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
    const user = await User.findOne({ email: req.session.passport.user });

    res.render('admin/editBooking', { booking, users, properties, rooms ,admin:user});
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.post('/bookings/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const { user, room, mobile, specialRequest,startDate,endDate } = req.body;
    await Booking.findByIdAndUpdate(req.params.id, { user, room, mobile, specialRequest,startDate,endDate });
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



router.get('/messages',  isAuthenticated, async (req, res) => {
  try {
      const messages = await Contact.find(); // Fetch all messages
      const user = await User.findOne({ email: req.session.passport.user });
      res.render('admin/messages', { messages ,admin:user});
  } catch (error) {
      console.log('Error fetching messages:', error);
      res.status(500).send('Internal server error.');
  }
});


function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    // Assuming the user's role is stored in req.user.role
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next(); // Proceed if the user has the correct role
    } else {
      return res.status(403).send('Access Denied: You do not have the required permissions.');
    }
  }
  res.redirect('/login');
}

module.exports = router;
