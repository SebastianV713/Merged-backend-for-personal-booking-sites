
const db = require('../db');

const allowedEmail = 'sebastianpvaughan@gmail.com';
const targetId = 'f0e95d82-62d6-4904-ab05-1f13cc83cb8f'; // The pending booking ID from previous output

db.run(`UPDATE bookings SET guest_email = ? WHERE id = ?`, [allowedEmail, targetId], function (err) {
    if (err) {
        return console.error(err.message);
    }
    console.log(`Row(s) updated: ${this.changes}`);
    console.log(`Updated booking ${targetId} to email ${allowedEmail}`);
});
