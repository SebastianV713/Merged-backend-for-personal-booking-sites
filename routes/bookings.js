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

            // Update booking with new total
            await new Promise((resolve, reject) => {
                db.run('UPDATE bookings SET total_price = ? WHERE id = ?', [totalCents, booking.id], (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Update local object for Stripe creation
            booking.total_price = totalCents;

            // 4. Create Stripe Session
            // We'll update the booking with any provided guest details first
            const { guests, guestName, email, checkIn, checkOut } = req.body;

            if (guests || guestName || email) {
                const updateQuery = `UPDATE bookings SET guests = ?, guest_name = ?, guest_email = ? WHERE id = ?`;
                await new Promise((resolve) => {
                    db.run(updateQuery, [guests, guestName, email, booking.id], (err) => {
                        if (err) console.error("Failed to update booking details", err);
                        resolve();
                    });
                });
            }

            const baseUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
            const successUrl = `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${baseUrl}/cancel`;

            const session = await stripeService.createCheckoutSession(
                booking.id,
                booking.total_price,
                successUrl,
                cancelUrl,
                email, // customerEmail
                { // metadata
                    guestName,
                    guests,
                    checkIn,
                    checkOut
                }
            );

            // Save session ID
            db.run('UPDATE bookings SET stripe_session_id = ? WHERE id = ?', [session.id, booking.id], (err) => {
                if (err) console.error("Failed to update booking with session ID", err);
            });

            res.json({ sessionId: session.id });
        } catch (e) {
            console.error('Checkout error:', e);
            res.status(500).json({ error: 'Payment initialization failed' });
        }
    });
});

module.exports = router;
