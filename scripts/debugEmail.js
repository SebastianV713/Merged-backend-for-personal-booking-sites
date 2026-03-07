require('dotenv').config();
const db = require('../db');
const { Resend } = require('resend');
const emailScheduler = require('../services/emailScheduler');

console.log('--- Starting Email Debug Script ---');

// 1. Check API Key
if (!process.env.RESEND_API_KEY) {
    console.error('CRITICAL: RESEND_API_KEY is missing from .env');
} else {
    console.log('RESEND_API_KEY is present (starts with ' + process.env.RESEND_API_KEY.substring(0, 4) + '...)');
}

// 2. Check Database State
console.log('\n--- Checking Bookings in DB ---');
db.all(`SELECT id, guest_name, guest_email, status, start_date, end_date, sent_conf, sent_checkin FROM bookings`, [], (err, rows) => {
    if (err) {
        console.error('DB Error:', err);
        return;
    }

    console.log(`Found ${rows.length} bookings.`);
    rows.forEach(b => {
        console.log(`\nBooking ID: ${b.id}`);
        console.log(`  Status: ${b.status}`);
        console.log(`  Email: ${b.guest_email}`);
        console.log(`  Start: ${b.start_date}`);
        console.log(`  Sent Conf: ${b.sent_conf}`);
        console.log(`  Sent Checkin: ${b.sent_checkin}`);

        // Logic check simulation
        const now = new Date();
        const startDate = new Date(b.start_date);
        const hoursUntilCheckIn = (startDate - now) / (1000 * 60 * 60);
        console.log(`  Hours until check-in: ${hoursUntilCheckIn.toFixed(2)}`);
    });

    // 3. Trigger Scheduler Manually
    console.log('\n--- Triggering Scheduler Function ---');
    (async () => {
        try {
            await emailScheduler.checkAndSendEmails();
            console.log('✅ Scheduler finished.');
        } catch (e) {
            console.error('Error running scheduler:', e);
        }
    })();
});
