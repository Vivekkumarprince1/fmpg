const express = require('express');
const router = express.Router();
const { sendMail } = require('../utils/emailService');
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

        // Send notification email to admin (fmpg974@gmail.com) with customer as replyTo
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'FMPG Contact <contact@fmpg.in>',
            replyTo: req.body.email,
            to: process.env.REPLY_TO_EMAIL || 'fmpg974@gmail.com',
            subject: `Contact Inquiry: ${req.body.subject || 'Website Message'}`,
            text: `Message from: ${req.body.name} (${req.body.email})\n\n${req.body.message}\n\nReceived at: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h3 style="color: #1e293b; margin-top: 0;">New Contact Form Message</h3>
                <p><strong>From:</strong> ${req.body.name} &lt;${req.body.email}&gt;</p>
                <p><strong>Subject:</strong> ${req.body.subject || 'N/A'}</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 4px solid #2563eb; margin: 15px 0;">
                  <p style="white-space: pre-wrap; margin: 0; color: #334155;">${req.body.message}</p>
                </div>
                <p style="color: #64748b; font-size: 12px;">Hit 'Reply' directly to respond to ${req.body.email}.</p>
              </div>
            `
        };

        sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending contact notification email:', error);
                // Even if email fails, record is saved
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
