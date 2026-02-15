const db = require('../db');

console.log('Resetting test booking for Test Adrian...');

db.serialize(() => {
    db.run(
        `UPDATE bookings 
         SET guest_email = ?, sent_checkin = 0 
         WHERE guest_name = 'Test Adrian'`,
        ['sebassspammail@gmail.com'],
        function (err) {
            if (err) {
                console.error('Error updating booking:', err.message);
            } else {
                console.log(`Updated ${this.changes} booking(s).`);
                console.log('Email set to: sebassspammail@gmail.com');
                console.log('sent_checkin reset to: 0');
            }
        }
    );
});
