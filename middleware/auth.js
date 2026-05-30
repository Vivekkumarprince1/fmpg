const jwt = require('jsonwebtoken');
const isAuthenticated = (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = req.cookies.token || bearerToken;

  if (!token) {
    if (req.accepts('html')) {
      return res.status(401).redirect('/login');
    }
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Server misconfiguration: missing JWT secret' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (req.accepts('html')) {
      return res.status(401).redirect('/login');
    }
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};



// Role-based access control (admin only)
const authorizeAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};


// Role-based access control (admin only)
const authorizeSupperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Access denied. SuperAdmins only.' });
  }
  next();
};


// user-based access
const authorizeOwner = (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ error: 'Access denied. Missing user role.' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied. Owners only.' });
  }

  next();
};


module.exports = { isAuthenticated, authorizeAdmin, authorizeSupperAdmin,authorizeOwner };
