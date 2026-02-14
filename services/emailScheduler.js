const cron = require('node-cron');
const db = require('../db');
const { Resend } = require('resend');
const emailTemplates = require('./emailTemplates');

const resend = new Resend(process.env.RESEND_API_KEY);

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

async function sendEmail(to, subject, html, bookingId, column) {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is missing. Cannot send email.');
        return;
    }

    try {
        console.log(`Sending '${subject}' to ${to}...`);
        const { data, error } = await resend.emails.send({
            from: 'Muir Woods Bungalow <onboarding@resend.dev>',
            to: [to],
            // to: ['delivered@resend.dev'], // Use for testing if domain not verified
            subject: subject,
            html: html,
        });

        if (error) {
            console.error(`Error sending email to ${to}:`, error);
            return;
        }

        console.log(`Email sent successfully! ID: ${data.id}`);
        markEmailSent(bookingId, column);

    } catch (err) {
        console.error(`Unexpected error sending email to ${to}:`, err);
    }
}

function markEmailSent(bookingId, column) {
    db.run(`UPDATE bookings SET ${column} = 1 WHERE id = ?`, [bookingId], (err) => {
        if (err) console.error(`Error updating ${column} for booking ${bookingId}:`, err);
        else console.log(`Marked ${column} as sent for booking ${bookingId}`);
    });
}

module.exports = {
    startEmailScheduler,
    checkAndSendEmails
};
