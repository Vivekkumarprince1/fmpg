const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Contact = require('../models/Contact'); // Import the Contact model

// Handle form submission
router.post('/contact', async (req, res) => {
    try {
        // Store form data in database
        const newContact = new Contact({
            name: req.body.name,
            email: req.body.email,
            subject: req.body.subject,
            message: req.body.message
        });
        await newContact.save();

        // Send confirmation email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'fmpg974@gmail.com', // Replace with your email
                pass: 'lrta iuce bpxm smxy'   // Replace with your app password (Google)
            }
        });

        const mailOptions = {
            from: req.body.email,
            to: 'fmpg974@gmail.com', // Replace with your email
            subject: req.body.subject,
            text: `Message from: ${req.body.name} (${req.body.email})\n\n${req.body.message}\n\nReceived at: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`
        };
        

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email:', error);
                return res.status(500).send('Error sending email.');
            }
            res.redirect('/contact?success=true'); // Redirect after submission
        });
    } catch (error) {
        console.log('Error:', error);
        res.status(500).send('Internal server error.');
    }
});
router.post('/contact', async (req, res) => {
    try {
        // Capture form data
        const { name, email, subject, message, date } = req.body;

        // Create a new contact instance and save it to the database
        const newContact = new Contact({
            name,
            email,
            subject,
            message,
            date: new Date() // Store the current date and time
        });

        await newContact.save(); // Save to the database

        // Send response or redirect to a success page
        res.redirect('/thank-you'); // Redirect to a thank-you page or home

    } catch (err) {
        console.error('Error saving contact form:', err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
