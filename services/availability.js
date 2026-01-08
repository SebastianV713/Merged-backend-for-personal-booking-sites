const db = require('../db');
const icalService = require('./ical');

async function isAvailable(startDate, endDate, excludeBookingId = null) {
    // Check local bookings
    const query = `
        SELECT COUNT(*) as count FROM bookings 
        WHERE (status = 'confirmed' OR status = 'pending')
        AND (start_date < ? AND end_date > ?)
        ${excludeBookingId ? 'AND id != ?' : ''}
    `;

    const params = [endDate, startDate];
    if (excludeBookingId) params.push(excludeBookingId);

    const dateOverlaps = await new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row.count > 0);
        });
    });


    if (dateOverlaps) return false;

    // Check iCal (Placeholder)
    const icalOverlaps = await icalService.checkAvailability(startDate, endDate);
    if (icalOverlaps) return false;

    return true;
}

module.exports = { isAvailable };
