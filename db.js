const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'bookings.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database ' + dbPath + ': ' + err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    total_price INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    stripe_session_id TEXT,
    guests INTEGER,
    guest_name TEXT,
    guest_email TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS daily_rates (
    date TEXT PRIMARY KEY,
    price DECIMAL,
    min_stay INTEGER
  )`);

  // Migration for existing tables (safe to run even if columns exist in some sqlite versions, but better to check or ignore error)
  const columnsToAdd = [
    { name: 'guests', type: 'INTEGER' },
    { name: 'guest_name', type: 'TEXT' },
    { name: 'guest_email', type: 'TEXT' }
  ];

  columnsToAdd.forEach(col => {
    db.run(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.type}`, (err) => {
      // Ignore error if column already exists
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`Error adding column ${col.name}:`, err.message);
      }
    });
  });
});

module.exports = db;
