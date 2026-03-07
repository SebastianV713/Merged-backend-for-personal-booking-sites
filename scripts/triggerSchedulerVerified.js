
require('dotenv').config();
const emailScheduler = require('../services/emailScheduler');

(async () => {
    console.log('⏳ Triggering email scheduler manually...');
    try {
        await emailScheduler.checkAndSendEmails();
        console.log('✅ Scheduler finished successfully.');
    } catch (err) {
        console.error('❌ Scheduler failed:', err);
    }
})();
