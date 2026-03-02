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
        const { data, error } = await resend.emails.send({
            from: 'Muir Woods Bungalow <onboarding@resend.dev>',
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error(`Error sending email to ${to}:`, error);
            return;
        }

        console.log(`Email sent successfully! ID: ${data.id}`);
        if (bookingId && column) {
            markEmailSent(bookingId, column);
        }
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

module.exports = { sendEmail, markEmailSent };
