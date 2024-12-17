const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: 'rzp_test_yIZJEB6YyYUQ90', // Ensure these are set in your .env file
  key_secret: 'dLpNb8cB36reDlMuNvq2igU8',
});

module.exports = razorpay;
