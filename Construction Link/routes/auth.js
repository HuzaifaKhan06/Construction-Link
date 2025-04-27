const express = require('express');
const passport = require('passport');
const router = express.Router();
const connection = require('../db');

// Route to initiate Google authentication
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google callback route
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  async (req, res) => {
    const { id, displayName, emails } = req.user;
    const email = emails[0].value;

    // Check if user exists in the database
    connection.query(
      'SELECT * FROM users WHERE email = ?',
      [email],
      (err, results) => {
        if (err) {
          console.error('Database query error:', err);
          return res.redirect('/'); // Redirect to home on error
        }

        if (results.length === 0) {
          // User does not exist, insert new user with default role and verified status
          connection.query(
            'INSERT INTO users (email, google_id, name, is_verified, role) VALUES (?, ?, ?, ?, ?)',
            [email, id, displayName, 1, 1], // Set 'is_verified' to 1 and 'role' to default (e.g., 1)
            (err) => {
              if (err) {
                console.error('Error inserting new user:', err);
                return res.redirect('/'); // Redirect to home on error
              }
              console.log('New user added via Google:', displayName);
              // Redirect to PHP login handler with email
              res.redirect(`http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/google_login.php?email=${encodeURIComponent(email)}`);
            }
          );
        } else {
          // User exists, update google_id if not already set
          const user = results[0];
          if (!user.google_id) {
            connection.query(
              'UPDATE users SET google_id = ? WHERE email = ?',
              [id, email],
              (err) => {
                if (err) {
                  console.error('Error updating user with Google ID:', err);
                  return res.redirect('/'); // Redirect to home on error
                }
                console.log('Existing user updated with Google ID:', displayName);
                // Redirect to PHP login handler with email
                res.redirect(`http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/google_login.php?email=${encodeURIComponent(email)}`);
              }
            );
          } else {
            // Google ID already set, proceed to redirect
            res.redirect(`http://localhost:8080/Projects/Construction%20Link/signup_login_php_prac/google_login.php?email=${encodeURIComponent(email)}`);
          }
        }
      }
    );
  }
);

module.exports = router;
