const mongoose = require('mongoose');

const dbUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/fmpg';

const options = {
  serverSelectionTimeoutMS: 30000,
  maxPoolSize: 20,
  minPoolSize: 5,
  retryWrites: true,
};

let connectionPromise;

function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return Promise.resolve(mongoose.connection);
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(dbUrl, options)
      .then((connection) => {
        console.log('MongoDB connected');
        return connection;
      })
      .catch((err) => {
        connectionPromise = null;
        console.error('MongoDB connection error:', err);
        throw err;
      });
  }

  return connectionPromise;
}

connectDB();

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Reconnecting...');
  connectionPromise = null;
  connectDB().catch((err) => {
    console.error('MongoDB reconnection failed:', err);
  });
});

module.exports = mongoose;
