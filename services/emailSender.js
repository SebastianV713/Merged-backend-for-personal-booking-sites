const { Resend } = require('resend');
const db = require('../db');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, subject, html, bookingId, column) {
    if (!process.env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is missing. Cannot send email.');
        return;
    }

    try {
        console.log(`Sending '${subject}' to ${to}...`);
        await resend.emails.send({
            from: 'Muir Woods Bungalow <bookings@muirwoodsbungalow.com>',
            to,
            subject,
            html,
        });

        console.log(`Email sent successfully to ${to}`);
        if (bookingId && column) {
            markEmailSent(bookingId, column);
        }
    } catch (err) {
        console.error(`Error sending email to ${to}:`, err.message);
    }
}

function markEmailSent(bookingId, column) {
    db.run(`UPDATE bookings SET ${column} = 1 WHERE id = ?`, [bookingId], (err) => {
        if (err) console.error(`Error updating ${column} for booking ${bookingId}:`, err);
        else console.log(`Marked ${column} as sent for booking ${bookingId}`);
    });
}

module.exports = { sendEmail, markEmailSent };
