const emailScheduler = require('../services/emailScheduler');
const db = require('../db');

// Trigger the scheduler manually
console.log('Manually triggering Email Scheduler...');

// We need to access the internal function checkAndSendEmails, but it's not exported directly.
// Let's modify services/emailScheduler.js to export it first, OR just copy the logic effectively?
// Better: Update services/emailScheduler.js to export checkAndSendEmails for testing purposes.

// For now, let's assume I will update the service.
// But wait, the previous `services/emailScheduler.js` only exported startEmailScheduler.
// I should update it to export checkAndSendEmails first.

// Wait, I can't modify the service from here. 
// I'll update the service first in the next step, then run this.
// But to make this file valid:
emailScheduler.checkAndSendEmails();
