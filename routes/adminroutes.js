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
const { isAuthenticated, authorizeAdmin } = require('../middleware/auth'); // Adjust path as needed


router.get('/form', function (req, res, next) {
  res.render('admin/pages/forms/basic-forms');
});

// Route to display all owners on the admin page
router.get('/newOwnerrequest', isAuthenticated, async (req, res) => {
  try {
    // Fetch all owners from the database and populate the rooms field
    const owners = await Owner.find().populate('rooms').exec();

    // Fetch the logged-in user details using the email from the decoded JWT token
    const user = await User.findOne({ email: req.user.email });

    // Render the admin page with owner data and admin user details
    res.render('admin/newOwnerrequest', { owners, admin: user });
  } catch (err) {
    console.error('Error in /newOwnerrequest route:', err.message);
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

    // Extract relevant data from the owner to create a new property
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

    // Send success message and redirect
    req.session.success = 'Owner confirmed and added as a property';
    res.redirect('/admin/properties');
  } catch (err) {
    console.error('Error in /confirm/:ownerId route:', err);
    res.status(500).send('Server error');
  }
});


// Cancel owner request
router.post('/cancel/:ownerId', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.params.ownerId; // Use req.params.ownerId correctly

    // Find the owner by ID
    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res.status(404).send('Owner not found'); // Handle case where owner is not found
    }

    // Update the status to 'Cancelled'
    owner.status = 'Cancelled';
    await owner.save(); // Save the updated owner document back to the database

    // Set a success message (optional)
    req.session.success = 'Owner request has been cancelled successfully';

    // Redirect back to the owner listings page
    res.redirect('/admin/newOwnerrequest');
  } catch (err) {
    console.error('Error in /cancel/:ownerId route:', err);
    res.status(500).send('Server Error');
  }
});


// View owner details
router.get('/view/:id', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.params.id; // Extract the ownerId from URL
    console.log(ownerId);

    // Find the owner in either the Owner or Property model and populate related fields
    const owner = await Owner.findById(ownerId).populate('rooms').populate({
      path: 'userId',          // Populate the 'user' field
      select: 'username email mobile' // Select only necessary fields
    }) || await Property.findById(ownerId).populate('rooms').populate({
      path: 'userId',          // Populate the 'user' field
      select: 'username email mobile' // Select only necessary fields
    });

    if (!owner) {
      return res.status(404).send('Owner not found');
    }

    // Extract the email from the JWT payload (req.user)
    const email = req.user.email;

    // Fetch the admin user using the extracted email
    const user = await User.findOne({ email });

    // If the user doesn't exist, handle it (optional)
    if (!user) {
      return res.status(404).send('Admin user not found');
    }

    // Render the page with owner and admin user data
    res.render('admin/propertyView', { owner, admin: user });

  } catch (err) {
    console.error('Error in /view/:id route:', err.message);
    res.status(500).send('Server Error');
  }
});




// View all users
router.get('/users', isAuthenticated, async (req, res) => {
  try {
    // Extract the email from req.user
    const email = req.user.email;

    // Fetch all users
    const users = await User.find({});

    // Fetch the admin user by email
    const admin = await User.findOne({ email });

    console.log(admin);

    // Render the admin users page
    res.render('admin/users', { users, admin });
  } catch (err) {
    console.error('Error in /users route:', err.message);
    res.status(500).send('Internal Server Error');
  }
});


// Add a new user
router.get('/users/add', isAuthenticated, async(req, res) => {
  res.render('admin/addUser');
});

router.post('/users/add', isAuthenticated, async (req, res) => {
  try {
    const { username, email, mobile, password, role } = req.body;

    // Check if the email or username already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).send('Email or username already exists');
    }

    // Hash the password manually before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user
    const newUser = new User({
      username,
      email,
      mobile,
      password: hashedPassword, // Save the hashed password
      role: role || 'user', // Default to 'user' if no role is provided
    });

    // Save the new user to the database
    await newUser.save();

    // Redirect to the users list page
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error in /users/add route:', err.message);
    res.status(500).send('Internal Server Error');
  }
});


// Edit a user
router.get('/users/edit/:id', isAuthenticated, async (req, res) => {
  try {
    // Fetch the user by ID from the URL parameter
    const user = await User.findById(req.params.id);

    // If the user doesn't exist, handle the error
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Optionally, you can fetch the admin user based on the decoded JWT email
    const admin = await User.findOne({ email: req.user.email });

    // Render the admin edit user page with the user and admin data
    res.render('admin/editUser', { user, admin });
  } catch (err) {
    console.error('Error in /users/edit/:id route:', err.message);
    res.status(500).send('Internal Server Error');
  }
});


router.post('/users/edit/:id', isAuthenticated, async (req, res) => {
  const { username, email, mobile, role } = req.body;
  const userId = req.params.id;

  // Check if the logged-in user has the permission to edit other users
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).send('Forbidden: You do not have permission to edit users.');
  }

  try {
    // Perform the update on the user with the given ID
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email, mobile, role },
      { new: true } // Return the updated document
    );

    // Check if the user was found and updated
    if (!updatedUser) {
      return res.status(404).send('User not found.');
    }

    // Redirect to the admin users page with a success message (if needed)
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Error updating user:', err.message);
    res.status(500).send('Internal Server Error');
  }
});

// Delete a user
router.post('/users/delete/:id', isAuthenticated, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/admin/users');
});


// View all properties
router.get('/properties', isAuthenticated, async (req, res) => {
  try {
    // Fetch properties with populated rooms
    const properties = await Property.find({}).populate('rooms');

    // Extract the email from the decoded JWT in req.user
    const email = req.user.email;

    // Fetch the admin user by email
    const user = await User.findOne({ email });

    // Render the admin properties page, passing properties and the admin user
    res.render('admin/properties', { properties, admin: user });
  } catch (err) {
    console.error('Error in /properties route:', err.message);
    res.status(500).send('Server Error');
  }
});


// Add a new property
router.get('/properties/add', isAuthenticated, async (req, res) => {
  try {
    // Extract the email from the JWT payload
    const email = req.user.email;

    // Find the user by email
    const user = await User.findOne({ email });

    // If the user is not found, you can handle it here, for example:
    if (!user) {
      return res.status(404).send('User not found');
    }

    // Property types for the dropdown menu
    const propertyTypes = ['PG', 'Hostel', 'Flat', 'PG with Mess'];

    // Render the addProperty page with the necessary data
    res.render('admin/addProperty', { propertyTypes, admin: user });
  } catch (err) {
    console.error('Error in /properties/add route:', err.message);
    res.status(500).send('Internal Server Error');
  }
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



router.post('/properties/add', uploadFields, isAuthenticated, async (req, res) => {
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

    // Check if roomsData is an array
    if (!Array.isArray(roomsData)) {
      console.log('Rooms Data:', roomsData); // Log roomsData to see its structure
      throw new Error('Rooms data is not in the expected format.');
    }

    // Create rooms
    const rooms = [];
    for (const roomData of roomsData) {
      const room = new Room({
        type: roomData.type,
        price: roomData.price,
        available: roomData.available === 'true', // Convert string to boolean
        capacity: roomData.capacity,
        availableRooms: roomData.availableRooms,
      });
      await room.save();
      rooms.push(room._id); // Save the room ID to the property
    }

    // Extract property data
    const { propertyName, locations, type, gender, amenities, map, ownerName, description, rules, landmark, address, contactNumber, email, securityDeposit, additionalDetails } = req.body;

    // Create the new property
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
      images: imagePaths,
      map,
      amenities: Array.isArray(amenities) ? amenities : [amenities],
      description,
      rooms, // Add room references to property
      ownerName,
      tenantContract: tenantContractPath,
    });

    // Use JWT to authenticate and get the logged-in user's email
    const token = req.cookies.token || req.headers['authorization'];
    if (!token) {
      return res.status(401).send('Authentication token is missing.');
    }

    // Verify the JWT token and get the user info
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'myjwt');
    const userEmail = decoded.email; // Extract the email from the decoded JWT payload

    // Check if the user already exists
    let user = await User.findOne({ email: userEmail });
    if (!user) {
      // If no user exists, create one
      const hashedPassword = await bcrypt.hash(propertyName, 10); // Hash the password using property name as an example

      user = new User({
        username: propertyName,
        email: userEmail,
        mobile: contactNumber,
        password: hashedPassword,
        role: 'owner', // Set the role to 'owner'
      });
      await user.save();
    } else {
      user.role = 'owner'; // Update the role to 'owner' if user already exists
      await user.save();
    }

    // Save the property
    await newProperty.save();

    // Redirect to the properties page
    res.redirect('/admin/properties');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


// Edit a property
router.get('/properties/edit/:id', isAuthenticated, async (req, res) => {
  try {
    // Fetch the property using the ID in the URL
    const property = await Property.findById(req.params.id).populate('rooms');

    // Fetch the user from JWT data (req.user)
    const user = await User.findOne({ email: req.user.email });

    console.log('Property fetched:', property); // Debugging line

    if (!property) {
      return res.status(404).send('Property not found');
    }

    // Render the edit property page
    res.render('admin/editProperty', { property, admin: user });
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).send('Server Error');
  }
});


router.post('/properties/edit/:id', uploadFields, isAuthenticated, async (req, res) => {
  try {
    // Find the property by ID
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
    // Ensure the user is authenticated and has the necessary permissions (if needed)
    const user = req.user; // This is the decoded JWT payload

    // Check if the user has appropriate role or permission if necessary
    // Example: only admins or superadmins can delete properties
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).send('Permission denied');
    }

    // Proceed with deleting the property
    const propertyId = req.params.id;

    const deletedProperty = await Property.findByIdAndDelete(propertyId);
    
    if (!deletedProperty) {
      return res.status(404).send('Property not found');
    }

    // Redirect to properties page after deletion
    res.redirect('/admin/properties');
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).send('Server Error');
  }
});



// // View all rooms
// router.get('/rooms', isAuthenticated, async (req, res) => {
//     try {
//       const rooms = await Room.find({}).populate('property');
//       res.render('admin/rooms', { rooms });
//     } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//     }
//   });
  
//   // Add a new room
//   router.get('/rooms/add', isAuthenticated, async (req, res) => {
//     try {
//       const properties = await Property.find({});
//       res.render('admin/addRoom', { properties });
//     } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//     }
//   });
  
//   router.post('/rooms/add', isAuthenticated, async (req, res) => {
//     try {
//       const { property, number, type, price } = req.body;
//       const available = req.body.available === "on"; // Convert "on" to true, else false
  
//       const newRoom = new Room({ property, number, type, price, available }); // Use correct model variable `Room`
//       await newRoom.save();
//       res.redirect('/admin/rooms');
//     } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//     }
//   });
  
//   // Edit a room
//   router.get('/rooms/edit/:id', isAuthenticated, async (req, res) => {
//     try {
//       const room = await Room.findById(req.params.id).populate('property');
//       const properties = await Property.find({});
//       res.render('admin/editRoom', { room, properties });
//     } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//     }
//   });
  
//   router.post('/rooms/edit/:id', isAuthenticated, async (req, res) => {
//     try {
//       const { property, number, type, price } = req.body;
//       const available = req.body.available === "on"; // Convert "on" to true, else false
//       await Room.findByIdAndUpdate(req.params.id, { property, number, type, price, available });
//       res.redirect('/admin/rooms');
//     } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//     }
//   });
  
//   // Delete a room
//   router.post('/rooms/delete/:id', isAuthenticated, async (req, res) => {
//     try {
//       await Room.findByIdAndDelete(req.params.id);
//       res.redirect('/admin/rooms');
//     } catch (err) {
//       console.error(err);
//       res.status(500).send('Server Error');
//     }
//   });


// View all bookings
router.get('/bookings', isAuthenticated, async (req, res) => {
  try {
    // Fetch all bookings and populate the relevant fields
    const bookings = await Booking.find({})
      .populate({
        path: 'user',          // Populate the 'user' field
        select: 'username email mobile' // Select necessary fields
      })
      .populate({
        path: 'room',          // Populate the 'room' field
        select: 'number type price' // Select necessary fields
      })
      .populate({
        path: 'propertyID'    // Populate the 'propertyID' field fully
      });

    // Extract the email from the decoded JWT in req.user
    const email = req.user.email; // Ensure this comes from JWT

    // Fetch the admin user using the email extracted from JWT
    const user = await User.findOne({ email });

    // Render the bookings page with populated bookings and admin user data
    res.render('admin/bookings', { bookings, admin: user });
  } catch (err) {
    console.error('Error fetching bookings:', err);
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
    // Extract the email from the JWT token stored in req.user
    const email = req.user.email;

    // Fetch all users
    const users = await User.find({});

    // Fetch all properties
    const properties = await Property.find({});

    // Fetch the user (admin) by email
    const user = await User.findOne({ email });

    // Render the add booking page with users, properties, and admin data
    res.render('admin/addBooking', { users, properties, rooms: [], admin: user });
  } catch (err) {
    console.error('Error in /bookings/add route:', err.message);
    res.status(500).send('Server Error');
  }
});


router.post('/bookings/add', isAuthenticated, async (req, res) => {
  try {
    // Extract data from request body
    const { propertyID, username, room, mobile, startDate, endDate, specialRequest } = req.body;

    // Get the authenticated user from req.user (from JWT)
    const user = req.user;

    // Find the property by its ID
    const property = await Property.findById(propertyID);
    if (!property) {
      return res.status(404).send('Property not found');
    }

    // Get the property owner
    const owner = property.ownerName;

    if (!owner) {
      return res.status(400).send('Property does not have an owner');
    }

    // Create a new booking with the provided information
    const newBooking = new Booking({
      user: user._id, // Save the user ID (from JWT) in the booking
      owner, 
      propertyID,
      username, 
      room,
      mobile,
      startDate,
      endDate,
      specialRequest
    });

    // Save the new booking to the database
    await newBooking.save();

    // Redirect to the bookings page
    res.redirect('/admin/bookings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



// Edit a booking
router.get('/bookings/edit/:id', isAuthenticated, async (req, res) => {
  try {
    // Fetch the booking by ID and populate related data
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'room',
        populate: {
          path: 'property'  // Populate property within room
        }
      })
      .populate('user');

    // Fetch all related users, properties, and rooms
    const users = await User.find({});
    const properties = await Property.find({});
    const rooms = await Room.find({});

    // Get the current authenticated user details from JWT
    const admin = await User.findById(req.user.id);  // Use req.user.id to get the admin

    // Render the edit booking page with necessary data
    res.render('admin/editBooking', { booking, users, properties, rooms, admin });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.post('/bookings/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const { user, room, mobile, specialRequest, startDate, endDate } = req.body;

    // Update the booking with the provided details
    await Booking.findByIdAndUpdate(req.params.id, { user, room, mobile, specialRequest, startDate, endDate });

    // Redirect to the bookings page after successful update
    res.redirect('/admin/bookings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});


router.post('/bookings/delete/:id', isAuthenticated, async (req, res) => {
  try {
    // Delete the booking by ID
    await Booking.findByIdAndDelete(req.params.id);

    // Redirect to the bookings page after successful deletion
    res.redirect('/admin/bookings');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});



//view routes
router.get('/booking/view/:id', isAuthenticated, async (req, res) => {
  try {
    // Extract the user info from req.user (decoded JWT token)
    const userId = req.user.id;  // Get the user's ID from the JWT payload
    
    // Find the booking by ID, and populate the relevant fields
    const booking = await Booking.findById(req.params.id)
      .populate('propertyID')
      .populate('room')
      .populate({
        path: 'room',
        populate: {
          path: 'property',  // Populate property within the room
        },
      })
      .populate('user'); // Populate user details associated with the booking
    
    // Fetch all users, properties, and rooms to send to the view
    const users = await User.find({});
    const properties = await Property.find({});
    const rooms = await Room.find({});
    
    // Render the view, passing the populated booking and other data
    res.render('admin/view', { booking, users, properties, rooms });
  } catch (err) {
    console.error('Error fetching booking details:', err);
    res.status(500).send('Server Error');
  }
});




router.get('/messages', isAuthenticated, async (req, res) => {
  try {
    // Extract the email from the decoded JWT stored in req.user
    const email = req.user.email;

    // Fetch all messages from the Contact model
    const messages = await Contact.find();

    // Fetch the user (admin) based on the email from the JWT
    const user = await User.findOne({ email });

    // Render the messages page with the messages and user (admin) information
    res.render('admin/messages', { messages, admin: user });
  } catch (error) {
    console.log('Error fetching messages:', error);
    res.status(500).send('Internal server error.');
  }
});



// function isAuthenticated(req, res, next) {
//   if (req.isAuthenticated()) {
//     // Assuming the user's role is stored in req.user.role
//     if (req.user.role === 'admin' || req.user.role === 'superadmin') {
//       return next(); // Proceed if the user has the correct role
//     } else {
//       return res.status(403).send('Access Denied: You do not have the required permissions.');
//     }
//   }
//   res.redirect('/login');
// }

module.exports = router;
