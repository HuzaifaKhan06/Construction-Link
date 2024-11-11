const express = require('express');
const passport = require('passport');
const session = require('express-session');  // Import express-session
const cors = require('cors');
const authRoutes = require('./routes/auth');
const PORT = process.env.PORT || 3000;

require('./passport');
require('dotenv').config();

const app = express();

// Enable CORS for all origins
app.use(cors());

// Set up express-session for managing sessions
app.use(session({
  secret: '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',  // Secret key for session encryption
  resave: false,              // Don't resave the session if it wasn't modified
  saveUninitialized: true,    // Save uninitialized sessions
  cookie: { secure: false }   // Set 'secure: true' if using HTTPS (For development use false)
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());clear

// Set up routes
app.use('/auth', authRoutes);

// Home route with Google login link
app.get('/', (req, res) => {
  res.send('<h1>Welcome! <a href="/auth/google">Sign in with Google</a></h1>');
});

// Dashboard route after successful authentication
app.get('/dashboard.php', (req, res) => {
  if (!req.user) {
    return res.redirect('/');
  }

  // Redirect to your PHP page (e.g., dashboard.php)
  res.redirect('http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/dashboard.php');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
