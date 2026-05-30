// const express = require('express');
// const bodyParser = require('body-parser');
// const https = require('https');
// const PaytmChecksum = require('paytmchecksum');

// const app = express();
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

// // Paytm credentials
// const mid = "YCZpbL76209576393208"; // Merchant ID
// const mkey = "YOUR_MERCHANT_KEY"; // Merchant Key
// const website = "WEBSTAGING"; // Use "WEBSTAGING" for testing and "DEFAULT" for production
// const channelId = "WEB";
// const industryType = "Retail";

// app.post('/payment', (req, res) => {
//     const { amount, customerId, email, mobileNo } = req.body;

//     // Prepare Paytm payment request parameters
//     let paytmParams = {};
//     paytmParams.body = {
//         "requestType": "Payment",
//         "mid": mid,
//         "websiteName": website,
//         "orderId": "ORDERID_98765", // Generate a unique Order ID
//         "callbackUrl": "http://localhost:3000/callback",
//         "txnAmount": {
//             "value": amount,
//             "currency": "INR",
//         },
//         "userInfo": {
//             "custId": customerId,
//             "email": email,
//             "mobile": mobileNo
//         }
//     };

//     PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(function(checksum) {
//         paytmParams.head = {
//             "signature": checksum
//         };

//         let post_data = JSON.stringify(paytmParams);

//         // Paytm API URL for initiating transaction
//         let options = {
//             hostname: 'securegw-stage.paytm.in', // For production, use 'securegw.paytm.in'
//             port: 443,
//             path: '/theia/api/v1/initiateTransaction?mid=' + mid + '&orderId=' + paytmParams.body.orderId,
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Content-Length': post_data.length
//             }
//         };

//         let response = '';
//         let post_req = https.request(options, function(post_res) {
//             post_res.on('data', function (chunk) {
//                 response += chunk;
//             });

//             post_res.on('end', function() {
//                 let result = JSON.parse(response);
//                 res.json({
//                     txnToken: result.body.txnToken, // Send this token to the frontend for Paytm UI display
//                     orderId: paytmParams.body.orderId
//                 });
//             });
//         });

//         post_req.write(post_data);
//         post_req.end();
//     });
// });

// // Callback route to handle payment response
// app.post('/callback', (req, res) => {
//     // Handle Paytm payment callback and verify transaction status
// });

// app.listen(3000, () => {
//     console.log("Server is running on port 3000");
// });

router.post('/verify-payment', async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
  
    const crypto = require('crypto');
    const secret = 'your_razorpay_secret'; // Replace with your secret key
  
    const hash = crypto
      .createHmac('sha256', secret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex');
  
    if (hash === razorpay_signature) {
      console.log('Payment verified successfully');
      // Proceed to create booking
      res.status(200).json({ message: 'Payment verified and booking created' });
    } else {
      console.error('Payment verification failed');
      res.status(400).json({ message: 'Invalid payment signature' });
    }
  });
  