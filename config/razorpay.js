const Razorpay = require('razorpay');

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

let razorpay = null;

if (keyId && keySecret) {
  try {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  } catch (error) {
    console.error('Failed to initialize Razorpay client:', error.message);
    razorpay = null;
  }
} else {
  console.warn('Razorpay keys are not configured. Payment routes will be unavailable.');
}

module.exports = razorpay;
