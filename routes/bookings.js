const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const availabilityService = require('../services/availability');
const stripeService = require('../services/stripe');

// Create a pending booking
router.post('/', async (req, res) => {
    const { startDate, endDate, nights, rate } = req.body;

    if (!startDate || !endDate || !nights || !rate) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const isAvailable = await availabilityService.isAvailable(startDate, endDate);
    if (!isAvailable) {
        return res.status(409).json({ error: 'Dates not available' });
    }

    const id = uuidv4();
    const totalPrice = rate * nights * 100; // in cents

    db.run(
        `INSERT INTO bookings (id, start_date, end_date, total_price, status) VALUES (?, ?, ?, ?, ?)`,
        [id, startDate, endDate, totalPrice, 'pending'],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }
            res.status(201).json({ bookingId: id });
        }
    );
});

// Create Stripe Checkout Session
router.post('/:id/checkout', async (req, res) => {
    const bookingId = req.params.id;

    // 1. Fetch booking
    db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], async (err, booking) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        if (booking.status !== 'pending') return res.status(400).json({ error: 'Booking not pending' });

        // 2. Validate availability again (excluding this booking)
        const isAvailable = await availabilityService.isAvailable(booking.start_date, booking.end_date, booking.id);
        if (!isAvailable) {
            return res.status(409).json({ error: 'Dates are no longer available' });
        }

        // 3. Create Stripe Session
        const successUrl = `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${req.protocol}://${req.get('host')}/cancel`;

        try {
            const session = await stripeService.createCheckoutSession(
                booking.id,
                booking.total_price,
                successUrl,
                cancelUrl
            );

            // Save session ID (optional, but good for tracking)
            db.run('UPDATE bookings SET stripe_session_id = ? WHERE id = ?', [session.id, booking.id], (err) => {
                if (err) console.error("Failed to update booking with session ID", err);
            });

            res.json({ sessionId: session.id });
        } catch (e) {
            console.error('Stripe error:', e);
            res.status(500).json({ error: 'Payment initialization failed' });
        }
    });
});

module.exports = router;
