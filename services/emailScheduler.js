const cron = require('node-cron');
const db = require('../db');
const emailTemplates = require('./emailTemplates');
const { sendEmail, markEmailSent } = require('./emailSender');

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

        bookings.forEach(async (booking) => {
            const startDate = new Date(booking.start_date);
            const endDate = new Date(booking.end_date);
            const guestName = booking.guest_name || 'Guest';
            const guestEmail = booking.guest_email;

            if (!guestEmail || guestEmail === 'No Email') {
                console.log(`Skipping email for booking ${booking.id}: No guest email provided.`);
                return;
            }

            // 1. Confirmation Email
            if (!booking.sent_conf) {
                const { subject, html } = emailTemplates.getConfirmationEmail(guestName);
                await sendEmail(guestEmail, subject, html, booking.id, 'sent_conf');
            }

            // Calculate time differences in hours
            const hoursUntilCheckIn = (startDate - now) / (1000 * 60 * 60);
            const hoursSinceCheckIn = (now - startDate) / (1000 * 60 * 60);
            const hoursUntilCheckOut = (endDate - now) / (1000 * 60 * 60);

            // 2. Check-in Email (<= 24 hours before check-in)
            if (!booking.sent_checkin && hoursUntilCheckIn <= 24 && hoursUntilCheckIn > 0) {
                const { subject, html } = emailTemplates.getCheckinEmail(guestName);
                await sendEmail(guestEmail, subject, html, booking.id, 'sent_checkin');
            }

            // 3. Follow-up Email (>= 18 hours after check-in)
            if (!booking.sent_followup && hoursSinceCheckIn >= 18) {
                const { subject, html } = emailTemplates.getFollowupEmail(guestName);
                await sendEmail(guestEmail, subject, html, booking.id, 'sent_followup');
            }

            // 4. Checkout Email (<= 18 hours before check-out)
            if (!booking.sent_checkout && hoursUntilCheckOut <= 18 && hoursUntilCheckOut > 0) {
                const { subject, html } = emailTemplates.getCheckoutEmail(guestName);
                await sendEmail(guestEmail, subject, html, booking.id, 'sent_checkout');
            }
        });
    });
}

module.exports = {
    startEmailScheduler,
    checkAndSendEmails
};
