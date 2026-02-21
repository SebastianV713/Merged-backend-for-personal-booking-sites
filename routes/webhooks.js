const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripe');
const db = require('../db');

const emailScheduler = require('../services/emailScheduler');

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];

    console.log('--- [DEBUG] Stripe Webhook Entry ---');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body (Snippet):', req.body.toString().substring(0, 500) + '...'); // Log first 500 chars to avoid log spam
    console.log('Signature:', signature);


    let event;
    try {
        event = await stripeService.constructEvent(req.body, signature);
        console.log('Webhook signature verification succeeded.');
        console.log('--- [DEBUG] After Signature Verification ---');
        console.log('Event Type:', event.type);
    } catch (err) {
        console.error(`Webhook signature verification failed.`);
        console.error(`Error Message: ${err.message}`);
        // Log stack trace if available for more context
        if (err.stack) console.error(err.stack);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        console.log('--- [DEBUG] checkout.session.completed EVENT RECEIVED ---');
        const session = event.data.object;
        console.log(`Session ID: ${session.id}`);
        console.log(`Metadata:`, session.metadata);

        const bookingId = session.metadata ? session.metadata.bookingId : null;

        if (bookingId) {
            console.log(`Payment confirmed for booking ${bookingId}`);
            console.log(`Updating database for booking ${bookingId} to status 'confirmed'...`);
            db.run(
                `UPDATE bookings SET status = 'confirmed' WHERE id = ?`,
                [bookingId],
                (err) => {
                    if (err) {
                        console.error('Error confirming booking:', err);
                    } else {
                        console.log('Booking status confirmed. Triggering email scheduler...');
                        emailScheduler.checkAndSendEmails();
                    }
                }
            );
        }
    }

    res.json({ received: true });
});

module.exports = router;
