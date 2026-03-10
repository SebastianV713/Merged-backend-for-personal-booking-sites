const nodemailer = require('nodemailer');
const db = require('../db');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    family: 4, // Force IPv4 — Railway does not support outbound IPv6
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

async function sendEmail(to, subject, html, bookingId, column) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error('GMAIL_USER or GMAIL_APP_PASSWORD is missing. Cannot send email.');
        return;
    }

    try {
        console.log(`Sending '${subject}' to ${to}...`);
        await transporter.sendMail({
            from: `Muir Woods Bungalow <${process.env.GMAIL_USER}>`,
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
