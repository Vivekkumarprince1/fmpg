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
const { isAuthenticated, authorizeAdmin } = require('../middleware/auth'); // Adjust path as needed


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

// // Get form to create a new owner
router.get('/newOwner', isAuthenticated, async (req, res) => {
  try {
    // The email from the decoded JWT token
    const email = req.user.email;

    // Fetch the user from the database using the email
    const user = await userModel.findOne({ email });

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Render the 'newOwner' page and pass the user data
    res.render('newOwner', { user });  // Pass 'user' as an object to EJS
  } catch (err) {
    console.error('Error in /newOwner route:', err.message);
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
  { name: 'images' },        // For image uploads
  { name: 'tenantContract', maxCount: 1 } // For tenant contract upload
]);


router.post('/newOwner', isAuthenticated, uploadFields, async (req, res) => {
  try {
      // Extract form data from req.body
      const { ownerName, contactNumber, email, propertyName, type, address, map, locations, landmark, locality, city,
        state, pincode, gender, amenities, rules, securityDeposit, description, additionalDetails } = req.body;

      // Get the paths of the uploaded images and store them as relative paths
      const imagePaths = req.files['images'] ? req.files['images'].map(file => `PG-photos/${req.body.propertyName}/${file.filename}`) : [];

      // Get the path of the uploaded tenantContract
      const tenantContractPath = req.files['tenantContract'] ? `PG-contracts/${req.body.propertyName}/${req.files['tenantContract'][0].filename}` : null;
      // Validate that at least 1 image has been uploaded
      if (imagePaths.length < 1) {
        return res.status(400).send('You must upload at least 1 image.');
      }

      // Validate zipCodes
      if (!pincode) {
        return res.status(400).send('ZIP Codes are required.');
      }

      // Validate rooms data
      const roomsData = req.body.rooms;

      if (!Array.isArray(roomsData)) {
        throw new Error('Rooms data is not in the expected format.');
      }

      const rooms = [];
      for (const roomData of roomsData) {
        if (!roomData.type || !roomData.price || !roomData.capacity || !roomData.availableRooms) {
          throw new Error('Room data is missing required fields.');
        }

        const room = new Room({
          type: roomData.type,
          price: roomData.price,
          capacity: roomData.capacity,
          available: roomData.available === 'true',
          availableRooms: roomData.availableRooms,
        });

        await room.save();
        rooms.push(room._id); // Save the room ID
      }

      // Now you can use the decoded data (e.g., userId, email) in your new Owner creation
      const userId = req.user.userId;

      // Create new Owner object and save in MongoDB
      const newOwner = new Owner({
          ownerName,
          contactNumber,
          userId, // Use the userId from the JWT
          email, // Use the email from the JWT
          propertyName,
          type,
          address,
          locality,
          city,
          state,
          pincode,
          country: 'India',
          landmark,
          map,
          locations,
          gender,
          rooms,
          amenities,
          rules,
          securityDeposit,
          description,
          additionalDetails,
          tenantContract: tenantContractPath,
          images: imagePaths,
      });

      await newOwner.save();
      req.session.success = 'Successfully submitted, our team will contact you';
      res.redirect('/');
  } catch (err) {
      console.error('Error in creating new owner:', err);
      res.status(500).send('Server Error');
  }
});





// Get all bookings for the property owner
router.get('/', ensureOwner, async (req, res) => {
  try {
    const propertyEmail = req.user.email; // Get the current owner's ID
    
    // Step 1: Find all properties owned by the current owner
    const ownerProperties = await Property.find({ email: propertyEmail });

    // Log to verify that properties are fetched correctly
    console.log('Owner properties:', ownerProperties);

    // Step 2: Extract the property IDs owned by the owner
    const propertyIds = ownerProperties.map(property => property._id);
    console.log(propertyIds);

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