//app.js
require('dotenv').config({ path: './.env' });

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const expressSession = require("express-session");
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const flash = require("./middleware/flash");
const appLogger = require('./utils/logger');

require('./mongodb/db');

const roomdb = require('./routes/roomdb');
const propertyroutes = require('./routes/propertyroutes');
var indexRouter = require('./routes/index');
const adminRoutes = require('./routes/adminroutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const forgotRoutes = require('./routes/forgot');
const contactroutes = require('./routes/contactroutes');
const ownerRoutes = require('./routes/ownerroutes');
const bookingRoutes = require('./routes/bookingroutes'); 
const settingsRoutes = require('./routes/settingsRautes');
const authRoutes = require('./routes/authroutes');

var app = express();
app.set('trust proxy', 1);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//middleware setup
app.use(logger('combined', {
  skip: (req, res) => res.statusCode < 400,
  stream: {
    write: (message) => appLogger.info(message.trim()),
  },
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.STATIC_MAX_AGE || '1d',
}));
app.use('/admin/assets', express.static(path.join(__dirname, 'public/assets'), {
  maxAge: process.env.STATIC_MAX_AGE || '1d',
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.GLOBAL_RATE_LIMIT || 400),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Session and flash setup
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET is required in production');
}

app.use(expressSession({
  resave: false,
  saveUninitialized: false,
  secret: sessionSecret || 'dev-session-secret-change-me',
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/fmpg',
    ttl: 60 * 60 * 24,
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.use(flash());

app.use('/api/bookings', bookingRoutes);
// app.post('/api/bookings', (req, res) => {
//   console.log('Received Headers:', req.headers);
//   console.log('Received Body:', req.body);
//   res.send('Received');
// });

const methodOverride = require('method-override');
app.use(methodOverride('_method'));

app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    const hostHeader = req.get('host');

    const allowedOrigins = new Set(
      (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    );

    if (hostHeader) {
      try {
        const requestUrl = new URL(`${req.protocol}://${hostHeader}`);
        const port = requestUrl.port;

        allowedOrigins.add(requestUrl.origin);

        if (port) {
          allowedOrigins.add(`${req.protocol}://localhost:${port}`);
          allowedOrigins.add(`${req.protocol}://127.0.0.1:${port}`);
          allowedOrigins.add(`${req.protocol}://[::1]:${port}`);
        }
      } catch (error) {
        // Ignore malformed host header and continue to origin check fallback
      }
    }

    if (origin && !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: 'Invalid request origin' });
    }
  }
  next();
});

app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
  res.status(204).end();
});

// Flash message middleware
app.use((req, res, next) => {
  res.locals.successMessage = req.flash('success');
  res.locals.errorMessage = req.flash('error');
  next();
});


// Routes setup
app.use('/', indexRouter);
app.use('/Room', roomdb );
app.use('/Property',propertyroutes);
app.use('/admin', adminRoutes);
app.use('/admin/analytics', analyticsRoutes);
app.use('/forgot', forgotRoutes);
app.use('/',contactroutes);
app.use('/owner', ownerRoutes);
app.use('/settings', settingsRoutes);
app.use('/', authRoutes);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  appLogger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    status: err.status || 500,
    path: req.originalUrl,
    method: req.method,
  });

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  const status = err.status || 500;
  res.status(status);

  if (req.accepts('json') && !req.accepts('html')) {
    return res.json({
      error: status === 500 ? 'Internal Server Error' : err.message,
    });
  }

  res.render('error');
});




// Set the port and start the server
const port = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}



module.exports = app;
