const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'academic_user',
  password: process.env.DB_PASSWORD || 'academic1234',
  database: process.env.DB_NAME || 'academic_nas',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;

