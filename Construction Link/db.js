const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,         // localhost
  user: process.env.DB_USER,         // root
  password: process.env.DB_PASSWORD, // your database password, here it's empty
  database: process.env.DB_NAME,     // constructionlink
  port: process.env.DB_PORT || 3306  // default MySQL port is 3306 if not specified
});

connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

module.exports = connection;
