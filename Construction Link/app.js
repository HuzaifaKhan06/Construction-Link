const express = require('express');
const passport = require('passport');
const session = require('express-session');
const cors = require('cors');
require('dotenv').config();
require('./passport');

const authRoutes    = require('./routes/auth');
const projectRoutes = require('./routes/projects');

const PORT = process.env.PORT || 3000;
const app  = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
app.use(passport.initialize());
app.use(passport.session());

// Auth
app.use('/auth', authRoutes);

// Projects API
app.use('/api/projects', projectRoutes);

// Frontend fallback or home
app.get('/', (req, res) => {
  res.send('<h1>Welcome! <a href="/auth/google">Sign in with Google</a></h1>');
});

app.get('/dashboard.php', (req, res) => {
  if (!req.user) return res.redirect('/');
  res.redirect('http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/dashboard.php');
});

// Start
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
