//owneroutes.js
const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const user=require('../models/users');
const Property = require('../models/Property');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

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
