const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripe');
const db = require('../db');

const emailScheduler = require('../services/emailScheduler');

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];

    let event;
    try {
        event = await stripeService.constructEvent(req.body, signature);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const bookingId = session.metadata.bookingId;

        if (bookingId) {
            console.log(`Payment confirmed for booking ${bookingId}`);
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
