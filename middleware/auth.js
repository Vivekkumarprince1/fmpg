const jwt = require('jsonwebtoken');
// In your routes file (e.g., routes/shop.js)
const express = require('express');
const router = express.Router();
// Middleware for authentication
// const isAuthenticated = (req, res, next) => {
//     const token = req.cookies.token || req.headers['authorization'];
  
//     // Debugging: confirm if token is present
//     if (!token) {
//         console.log("no token")
//     //   return res.render('login'); // Redirect to login page if no token
//     }
  
//     try {
//         console.log("screate key:",process.env.JWT_SECRET);
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       console.log("object");
//       req.user = decoded;
//       next();
//     } catch (error) {
//       console.log('Invalid token:', error.message);
//       return res.render('login',{error:error}); // Redirect to login page if the token is invalid
//     }
//   };


const isAuthenticated = (req, res, next) => {
  const token = req.cookies.token || req.headers['authorization'];

  if (!token) {
      console.log("No token found");
      // return res.status(401).render('login', { error: 'Authentication required. Please login.' });
  }

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded; // Attach decoded payload to `req.user`
      next();
  } catch (error) {
      console.log('Invalid token:', error.message);
      return res.status(401).render('login', { error });
  }
};



// Role-based access control (admin only)
const authorizeAdmin = (req, res, next) => {
  console.log('Decoded user:', req.user);
  if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};


// Role-based access control (admin only)
const authorizeSupperAdmin = (req, res, next) => {
  if (req.user.role !== 'Supperadmin') {
    return res.status(403).json({ error: 'Access denied. SuperAdmins only.' });
  }
  next();
};


// user-based access
const authorizeUser = (req, res, next) => {
  if (req.user.role !== 'user') {
    return res.status(403).json({ error: 'Access denied. Users only.' });
  }
  next();
  };

// module.exports = { authenticate, authorizeAdmin };
module.exports = { isAuthenticated, authorizeAdmin, authorizeSupperAdmin,authorizeUser };
