const express = require('express');
const router = express.Router();
const db = require('../db');

function formatIcalDate(dateStr) {
    // Convert YYYY-MM-DD to YYYYMMDD (all-day date format)
    return dateStr.replace(/-/g, '');
}

// GET /calendar/direct-bookings.ics?token=<ICAL_SECRET_TOKEN>
// Returns confirmed direct bookings as an iCal feed for Airbnb to import
router.get('/direct-bookings.ics', (req, res) => {
    const secret = process.env.ICAL_SECRET_TOKEN;
    if (secret && req.query.token !== secret) {
        return res.status(401).send('Unauthorized');
    }
    db.all(
        `SELECT id, start_date, end_date, guest_name FROM bookings WHERE status = 'confirmed'`,
        [],
        (err, bookings) => {
            if (err) {
                console.error('Error fetching bookings for iCal:', err);
                return res.status(500).send('Error generating calendar');
            }

            const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

            let ical = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Muir Woods Bungalow//Direct Bookings//EN',
                'CALNAME:Muir Woods Bungalow Direct Bookings',
                'X-WR-CALNAME:Muir Woods Bungalow Direct Bookings',
                'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
            ].join('\r\n');

            for (const booking of bookings) {
                const event = [
                    'BEGIN:VEVENT',
                    `UID:booking-${booking.id}@muirwoodsbungalow.com`,
                    `DTSTAMP:${now}`,
                    `DTSTART;VALUE=DATE:${formatIcalDate(booking.start_date)}`,
                    `DTEND;VALUE=DATE:${formatIcalDate(booking.end_date)}`,
                    `SUMMARY:Direct Booking - Blocked`,
                    'END:VEVENT',
                ].join('\r\n');
                ical += '\r\n' + event;
            }

            ical += '\r\nEND:VCALENDAR';

            res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
            res.setHeader('Content-Disposition', 'inline; filename="direct-bookings.ics"');
            res.send(ical);
        }
    );
});

module.exports = router;
