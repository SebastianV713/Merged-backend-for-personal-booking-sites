const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const booking = {
    id: uuidv4(),
    guest_name: 'Test Adrian',
    guest_email: 'your-email@example.com',
    start_date: '2026-02-14 15:00:00',
    end_date: '2026-02-16 11:00:00',
    total_price: 20000,
    status: 'confirmed',
    sent_conf: 1,
    sent_checkin: 0,
    sent_followup: 0,
    sent_checkout: 0
};

db.serialize(() => {
    db.run(
        `INSERT INTO bookings (
            id, guest_name, guest_email, start_date, end_date, total_price, status, 
            sent_conf, sent_checkin, sent_followup, sent_checkout
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            booking.id, booking.guest_name, booking.guest_email, booking.start_date, booking.end_date,
            booking.total_price, booking.status,
            booking.sent_conf, booking.sent_checkin, booking.sent_followup, booking.sent_checkout
        ],
        (err) => {
            if (err) {
                console.error('Error inserting test booking:', err.message);
            } else {
                console.log('Test booking inserted successfully!');
                console.log('ID:', booking.id);
                console.log('Check-in:', booking.start_date);
                console.log('Note: Ensure the current time is within 24 hours of check-in for the scheduler to pick it up.');
            }
        }
    );
});
