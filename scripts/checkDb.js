const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Connect explicitly to the database file in the root
const dbPath = path.resolve(__dirname, '../bookings.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    db.all('SELECT * FROM bookings', [], (err, rows) => {
        if (err) {
            console.error('Error running query:', err);
            return;
        }

        console.log(`\nFound ${rows.length} bookings:\n`);

        rows.forEach(row => {
            console.log(`Booking ID: ${row.id}`);
            console.log(`Guest:      ${row.guest_name || 'N/A'}`);
            console.log(`Check-in:   ${row.start_date}`);
            console.log(`Check-out:  ${row.end_date}`);
            console.log(`Status:     ${row.status}`);
            console.log(`Sent Flags:`);
            console.log(`  - Conf:      ${Boolean(row.sent_conf)}`);
            console.log(`  - Check-in:  ${Boolean(row.sent_checkin)}`);
            console.log(`  - Follow-up: ${Boolean(row.sent_followup)}`);
            console.log(`  - Checkout:  ${Boolean(row.sent_checkout)}`);
            console.log('--------------------------------------------------');
        });

        if (rows.length === 0) {
            console.log('No bookings found.');
        }
    });
});
