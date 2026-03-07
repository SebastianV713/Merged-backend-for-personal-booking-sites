
const db = require('../db');

console.log('Checking for confirmed bookings...');
db.all("SELECT id, guest_name, guest_email, status, sent_conf FROM bookings WHERE status = 'confirmed'", [], (err, rows) => {
    if (err) {
        console.error('❌ DB Error:', err);
        process.exit(1);
    }
    console.log(`Found ${rows.length} confirmed bookings.`);
    rows.forEach(b => {
        console.log(`- ID: ${b.id}, Email: ${b.guest_email}, SentConf: ${b.sent_conf}`);
    });
});
