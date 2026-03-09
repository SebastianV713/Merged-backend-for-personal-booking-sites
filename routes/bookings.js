const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const availabilityService = require('../services/availability');
const stripeService = require('../services/stripe');
const icalService = require('../services/ical');
const priceSyncService = require('../services/priceSync');

// Get all blocked dates (Local + iCal)
router.get('/blocked', async (req, res) => {
    try {
        // 1. Local Bookings
        const localBookings = await new Promise((resolve, reject) => {
            db.all(
                `SELECT start_date, end_date FROM bookings WHERE status = 'confirmed' OR status = 'pending'`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        // 2. iCal Blocks
        const icalBlocks = icalService.getBlockedDates();

        // 3. Merge and Normalize
        // Note: Booking dates are strings YYYY-MM-DD. iCal dates are Date objects.
        const responseData = [
            ...localBookings.map(b => ({
                start: b.start_date,
                end: b.end_date,
                source: 'local'
            })),
            ...icalBlocks.map(b => ({
                start: b.start,
                end: b.end,
                source: 'airbnb',
                summary: b.summary
            }))
        ];

        res.json(responseData);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch blocked dates' });
    }
});

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

    const bookingCreatedAt = new Date().toISOString();
    db.run(
        `INSERT INTO bookings (id, start_date, end_date, total_price, status, booking_created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, startDate, endDate, totalPrice, 'pending', bookingCreatedAt],
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

        // 3. Recalculate price using dynamic rates
        try {
            const rates = await priceSyncService.getRatesForRange(booking.start_date, booking.end_date);

            // Calculate number of nights
            const start = new Date(booking.start_date);
            const end = new Date(booking.end_date);
            const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

            // Sum up prices
            let totalCents = 0;
            if (rates.length > 0) {
                const totalAmount = rates.reduce((sum, r) => sum + r.price, 0);
                totalCents = Math.round(totalAmount * 100);
            } else {
                console.log('No dynamic rates found, using original booking price');
                totalCents = booking.total_price;
            }

            // Calculate deposit/remaining split
            const TAX_RATE = parseFloat(process.env.STRIPE_TAX_RATE_DECIMAL || '0');
            const cleaningFeeCents = 16500;
            const { guests, guestName, email, checkIn, checkOut, hasPets } = req.body;
            const petFeeCents = hasPets ? 6500 : 0;
            const taxableSubtotal = totalCents + cleaningFeeCents;
            const taxAmount = Math.round(taxableSubtotal * TAX_RATE);
            const grandTotal = totalCents + cleaningFeeCents + petFeeCents + taxAmount;

            const depositCents = Math.round(grandTotal / 2);
            const remainingCents = grandTotal - depositCents;

            // Update booking with totals
            await new Promise((resolve, reject) => {
                db.run(
                    'UPDATE bookings SET total_price = ?, deposit_amount = ?, remaining_amount = ? WHERE id = ?',
                    [grandTotal, depositCents, remainingCents, booking.id],
                    (err) => { if (err) reject(err); else resolve(); }
                );
            });

            // Update local object
            booking.total_price = grandTotal;

            // 4. Update booking with guest details
            if (guests || guestName || email) {
                const updateQuery = `UPDATE bookings SET guests = ?, guest_name = ?, guest_email = ? WHERE id = ?`;
                await new Promise((resolve) => {
                    db.run(updateQuery, [guests, guestName, email, booking.id], (err) => {
                        if (err) console.error("Failed to update booking details", err);
                        resolve();
                    });
                });
            }

            const baseUrl = process.env.FRONTEND_URL || 'https://muir-woods-bungalow.replit.app';
            const successUrl = `${baseUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${baseUrl}/booking`;

            const session = await stripeService.createCheckoutSession(
                booking.id,
                depositCents,
                successUrl,
                cancelUrl,
                email,
                { guestName, guests, checkIn, checkOut },
                hasPets,
                true // isDeposit
            );

            // Save session ID
            db.run('UPDATE bookings SET stripe_session_id = ? WHERE id = ?', [session.id, booking.id], (err) => {
                if (err) console.error("Failed to update booking with session ID", err);
            });

            res.json({ sessionId: session.id, url: session.url });
        } catch (e) {
            console.error('Checkout error:', e);
            res.status(500).json({ error: 'Payment initialization failed' });
        }
    });
});

// Get booking details (guest-facing, safe fields only)
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id], (err, booking) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });

        res.json({
            id: booking.id,
            status: booking.status,
            start_date: booking.start_date,
            end_date: booking.end_date,
            guests: booking.guests,
            guest_name: booking.guest_name,
            deposit_amount: booking.deposit_amount,
            remaining_amount: booking.remaining_amount,
            deposit_paid: booking.deposit_paid,
            remaining_paid: booking.remaining_paid,
            remaining_charge_failed: booking.remaining_charge_failed,
            booking_created_at: booking.booking_created_at
        });
    });
});

// Self-service cancellation
router.post('/:id/cancel', async (req, res) => {
    const bookingId = req.params.id;

    db.get('SELECT * FROM bookings WHERE id = ?', [bookingId], async (err, booking) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        if (booking.status !== 'confirmed') {
            return res.status(400).json({ error: 'Only confirmed bookings can be cancelled' });
        }

        let refunded = false;

        try {
            // Check if within 24h of booking creation
            const createdAt = booking.booking_created_at ? new Date(booking.booking_created_at) : null;
            const hoursSinceCreation = createdAt
                ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
                : Infinity;

            if (hoursSinceCreation <= 24 && booking.stripe_session_id) {
                // Full refund: retrieve session to get payment_intent
                const session = await stripeService.retrieveCheckoutSession(booking.stripe_session_id, {
                    expand: ['payment_intent']
                });
                const paymentIntentId = session.payment_intent && session.payment_intent.id
                    ? session.payment_intent.id
                    : session.payment_intent;

                if (paymentIntentId) {
                    await stripeService.createRefund(paymentIntentId, null);
                    refunded = true;
                }
            }

            // Mark booking as cancelled
            await new Promise((resolve, reject) => {
                db.run('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', bookingId], (err) => {
                    if (err) reject(err); else resolve();
                });
            });

            res.json({ success: true, refunded });
        } catch (e) {
            console.error('Cancellation error:', e);
            res.status(500).json({ error: 'Cancellation failed' });
        }
    });
});

module.exports = router;
