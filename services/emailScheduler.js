const cron = require('node-cron');
const db = require('../db');

function startEmailScheduler() {
    console.log('Starting Email Scheduler...');

    // Schedule task to run every hour
    cron.schedule('0 * * * *', () => {
        console.log('Running email scheduler job...');
        checkAndSendEmails();
    });
}

function checkAndSendEmails() {
    const now = new Date();

    db.all(`SELECT * FROM bookings WHERE status = 'confirmed'`, [], (err, bookings) => {
        if (err) {
            console.error('Error fetching bookings for email scheduler:', err);
            return;
        }

        bookings.forEach(booking => {
            const startDate = new Date(booking.start_date);
            const endDate = new Date(booking.end_date);
            const guestName = booking.guest_name || 'Guest';

            // 1. Confirmation Email
            if (!booking.sent_conf) {
                logEmailAction('Confirmation', guestName, booking.id);
                markEmailSent(booking.id, 'sent_conf');
            }

            // Calculate time differences in hours
            const hoursUntilCheckIn = (startDate - now) / (1000 * 60 * 60);
            const hoursSinceCheckIn = (now - startDate) / (1000 * 60 * 60);
            const hoursUntilCheckOut = (endDate - now) / (1000 * 60 * 60);

            // 2. Check-in Email (<= 24 hours before check-in)
            if (!booking.sent_checkin && hoursUntilCheckIn <= 24 && hoursUntilCheckIn > 0) {
                logEmailAction('Check-in Instructions', guestName, booking.id);
                markEmailSent(booking.id, 'sent_checkin');
            }

            // 3. Follow-up Email (>= 18 hours after check-in)
            if (!booking.sent_followup && hoursSinceCheckIn >= 18) {
                logEmailAction('Follow-up / All Good?', guestName, booking.id);
                markEmailSent(booking.id, 'sent_followup');
            }

            // 4. Checkout Email (<= 18 hours before check-out)
            if (!booking.sent_checkout && hoursUntilCheckOut <= 18 && hoursUntilCheckOut > 0) {
                logEmailAction('Checkout Instructions', guestName, booking.id);
                markEmailSent(booking.id, 'sent_checkout');
            }
        });
    });
}

function logEmailAction(type, name, id) {
    console.log(`[EMAIL SIMULATION] Sending '${type}' email to ${name} (Booking ID: ${id})`);
}

function markEmailSent(bookingId, column) {
    db.run(`UPDATE bookings SET ${column} = 1 WHERE id = ?`, [bookingId], (err) => {
        if (err) console.error(`Error updating ${column} for booking ${bookingId}:`, err);
        else console.log(`Marked ${column} as sent for booking ${bookingId}`);
    });
}

module.exports = {
    startEmailScheduler
};
