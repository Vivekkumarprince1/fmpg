const mongoose = require('mongoose');

const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/fmpg';

const options = {
  serverSelectionTimeoutMS: 30000,
  maxPoolSize: 20,
  minPoolSize: 5,
  retryWrites: true,
};

mongoose.connect(dbUrl, options)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the process with a non-zero status code
  });

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Reconnecting...');
  mongoose.connect(dbUrl, options).catch((err) => {
    console.error('MongoDB reconnection failed:', err);
  });
});

module.exports = mongoose;
