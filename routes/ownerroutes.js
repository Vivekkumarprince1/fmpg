//owneroutes.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const userModel=require('../models/users');
const Property = require('../models/Property');
const Room = require('../models/Room');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const Owner = require('../models/owner');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the owner middleware is placed correctly
function ensureOwner(req, res, next) {
    if (req.user && req.user.role === 'owner') {
      return next();
    } else {
      req.flash('error', 'Access denied');
      res.redirect('/');
    // res.send(req.user);
    }
}


// Get all owners
router.get('/owners', async (req, res) => {
  try {
      const owners = await Owner.find();
      res.render('owners', { owners });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});

// Get form to create a new owner
router.get('/newOwner', (req, res) => {
  res.render('newOwner');
});


// Set storage engine for multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Get the property name from the form submission
        const propertyName = req.body.propertyName;
        // Define the folder path dynamically
        const folderPath = `public/PG-photos/${propertyName}`;
        
        // Check if the folder exists, if not, create it
        fs.access(folderPath, (err) => {
            if (err) {
                // If the folder doesn't exist, create it
                fs.mkdir(folderPath, { recursive: true }, (err) => {
                    if (err) {
                        console.error('Error creating folder:', err);
                        return cb(err);
                    }
                    // Folder created successfully
                    cb(null, folderPath); // Use the folder as the destination
                });
            } else {
                // Folder already exists
                cb(null, folderPath); // Use the existing folder as the destination
            }
        });
    },
    filename: (req, file, cb) => {
        // Name the file with the fieldname and current timestamp + the original extension
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

// Initialize multer for multiple uploads (limit to 5 files)
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit: 5MB per file
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


// Route to handle form submission with multiple file uploads
router.post('/newOwner', upload.array('ownerImages', 5), async (req, res) => {
  try {
      console.log(req.body); // Debugging: log the request body to check if all fields are present
      const { ownerName, contactNumber, userId, email, propertyName, type, address, location, landmark, gender, amenities, rules, securityDeposit,description} = req.body;

      if (req.files.length < 5) {
          return res.status(400).send('You must upload at least 5 files.');
      }

      // Get the paths of the uploaded files
      const imagePaths = req.files.map(file => file.path);


    // Extract room data directly as an array
const roomsData = req.body.rooms;

// Check if roomsData is an array
if (!Array.isArray(roomsData)) {
  throw new Error('Rooms data is not in the expected format.');
}

// Loop over roomsData to create Room instances
const rooms = [];
for (const roomData of roomsData) {
  if (!roomData.number || !roomData.type || !roomData.price || !roomData.capacity) {
    throw new Error('Room data is missing required fields.');
  }
  
  const room = new Room({
    number: roomData.number,
    type: roomData.type,
    price: roomData.price,
    capacity: roomData.capacity,
    available: roomData.available === 'true'
  });
  
  await room.save();
  rooms.push(room._id); // Save the room ID
}



      // Create new Owner object and save in MongoDB
      const newOwner = new Owner({
          ownerName,
          contactNumber,
          userId,
          email,
          propertyName,
          type,
          address,
          location,
          landmark,
          gender,
          rooms,
          amenities,
          rules,
          securityDeposit,
          description,
          ownerImages: imagePaths // Save the array of image paths
      });

      await newOwner.save();
      req.session.success = 'Successfully submitted, our team will contact you';
      res.redirect('/');
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});





// Get a specific owner by ID
router.get('/owners/:id', async (req, res) => {
  try {
      const owner = await Owner.findById(req.params.id);
      if (!owner) {
          return res.status(404).send('Owner not found');
      }
      res.render('ownerDetails', { owner });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});

// Update owner information
router.get('/owners/:id/edit', async (req, res) => {
  try {
      const owner = await Owner.findById(req.params.id);
      if (!owner) {
          return res.status(404).send('Owner not found');
      }
      res.render('editOwner', { owner });
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});

router.post('/owners/:id', async (req, res) => {
  try {
      const owner = await Owner.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!owner) {
          return res.status(404).send('Owner not found');
      }
      res.redirect(`/owners/${req.params.id}`);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});

// Delete owner
router.post('/owners/:id/delete', async (req, res) => {
  try {
      await Owner.findByIdAndDelete(req.params.id);
      res.redirect('/owners');
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
});



// Get all bookings for the property owner
router.get('/', ensureOwner, async (req, res) => {
  try {
    const ownername = req.user.username; // Get the current owner's ID
    
    // Step 1: Find all properties owned by the current owner
    const ownerProperties = await Property.find({ owner: ownername });

    // Log to verify that properties are fetched correctly
    console.log('Owner properties:', ownerProperties);

    // Step 2: Extract the property IDs owned by the owner
    const propertyIds = ownerProperties.map(property => property._id);

    // Check if the owner actually has properties
    if (propertyIds.length === 0) {
      console.log('No properties found for this owner');
      return res.render('owner', { bookings: [] });
    }

    // Step 3: Find all bookings associated with the owner's properties
    const bookings = await Booking.find({ propertyID: { $in: propertyIds } })
                                  .populate('user')
                                  .populate('propertyID') // Populate property details
                                  .populate('room'); // Populate room details

    // Log to verify that bookings are fetched correctly
    console.log('Bookings for owner properties:', bookings);

    // Step 4: Render the bookings for the owner's properties
    res.render('owner', { bookings });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).send('Error fetching bookings');
  }
});


// Helper function to generate PDF invoice
function generateInvoice(booking, user, property, callback) {
  const doc = new PDFDocument();
  let buffers = [];
  
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    let pdfData = Buffer.concat(buffers);
    callback(pdfData);
  });

  // Create the PDF content
  doc.fontSize(20).text('Invoice', { align: 'center' });
  doc.fontSize(14).text(`Invoice for Booking ID: ${booking._id}`, 100, 150);
  doc.text(`Username: ${user.username}`);
  doc.text(`Mobile: ${user.mobile}`);
  doc.text(`Property: ${property.name}`);
  // doc.text(`Location: ${property.location}`);
  doc.text(`Room Type: ${booking.room.type}`);
  doc.text(`Start Date: ${booking.startDate}`);
  doc.text(`End Date: ${booking.endDate}`);
  doc.text(`Total Price: ${booking.room.price} per month`);
  doc.text(`Status: ${booking.status}`);
  doc.end();
}

// Helper function to send email with PDF attachment
function sendInvoiceEmail(user, pdfBuffer) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'fmpg974@gmail.com', // Your email
      pass: 'fcdz hxcn yktl zzzx', // Your app-specific password
    },
  });

  const mailOptions = {
    from: 'fmpg974@gmail.com',
    to: user.email,
    subject: 'Your Booking Invoice',
    text: `Dear ${user.username},\n\nAttached is your invoice for your booking.\n\nBest regards,\nFMPG`,
    attachments: [
      {
        filename: 'invoice.pdf',
        content: pdfBuffer,
      },
    ],
  };

  return transporter.sendMail(mailOptions);
}

// Confirm a booking and send the invoice
router.post('/bookings/:id/accept', ensureOwner, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId).populate('user').populate('propertyID').populate('room');
    
    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    // Update booking status
    booking.status = 'Confirmed';
    await booking.save();

    // Generate the invoice
    const user = booking.user;
    const property = booking.propertyID;
    
    generateInvoice(booking, user, property, async (pdfBuffer) => {
      // Send the invoice to the user via email
      await sendInvoiceEmail(user, pdfBuffer);
      req.flash('success', 'Booking confirmed and invoice sent to the user.');
      res.redirect('/owner'); // Redirect to owner's bookings page
    });

  } catch (err) {
    console.error('Error confirming booking:', err);
    res.status(500).send('Error confirming booking');
  }
});



router.post('/bookings/:id/decline', ensureOwner, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await Booking.findById(bookingId).populate('user').populate('propertyID').populate('room');
    
    if (!booking) {
      return res.status(404).send('Booking not found');
    }

    // Update booking status
    booking.status = 'Cancelled';
    await booking.save();

    // Generate the invoice
    const user = booking.user;
    const property = booking.propertyID;
    
    generateInvoice(booking, user, property, async (pdfBuffer) => {
      // Send the invoice to the user via email
      await sendInvoiceEmail(user, pdfBuffer);
      req.flash('success', 'Booking Cancelled and invoice sent to the user.');
      res.redirect('/owner'); // Redirect to owner's bookings page
    });

  } catch (err) {
    console.error('Error confirming booking:', err);
    res.status(500).send('Error confirming booking');
  }
});



module.exports = router;
