const Stripe = require('stripe');
require('dotenv').config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
// Native fetch is available in Node 18+


// Using native fetch if available (Node 18+), else polyfill not needed if environment is new enough.
// Assuming Node 18+ environment based on "mac" and recent context.

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;

async function runTest() {
    console.log('--- Starting Manual Integration Test ---');

    // 1. Create Booking
    console.log('\n1. Creating Pending Booking...');
    const bookingRes = await fetch(`${BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            startDate: '2026-06-01',
            endDate: '2026-06-05',
            nights: 4,
            rate: 100
        })
    });

    if (!bookingRes.ok) {
        console.error('Failed to create booking:', await bookingRes.text());
        return;
    }

    const { bookingId } = await bookingRes.json();
    console.log(`> Booking Created: ${bookingId}`);

    // 2. Get Checkout Session
    console.log('\n2. Requesting Checkout Session...');
    const checkoutRes = await fetch(`${BASE_URL}/bookings/${bookingId}/checkout`, {
        method: 'POST'
    });

    if (!checkoutRes.ok) {
        console.error('Failed to create checkout session:', await checkoutRes.text());
        return;
    }

    const { sessionId } = await checkoutRes.json();
    console.log(`> Checkout Session ID: ${sessionId}`);

    // 3. Simulate Webhook
    console.log('\n3. Simulating Stripe Webhook (Booking Confirmation)...');

    const payload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'checkout.session.completed',
        data: {
            object: {
                id: sessionId,
                metadata: {
                    bookingId: bookingId
                }
            }
        }
    };

    const payloadString = JSON.stringify(payload);

    // Generate Signature
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${payloadString}`;
    const hmac = require('crypto').createHmac('sha256', secret);
    hmac.update(signedPayload);
    const signature = `t=${timestamp},v1=${hmac.digest('hex')}`;

    const webhookRes = await fetch(`${BASE_URL}/webhooks/stripe`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Stripe-Signature': signature
        },
        body: payloadString
    });

    if (!webhookRes.ok) {
        console.error('Webhook failed:', await webhookRes.text());
    } else {
        console.log('> Webhook sent successfully.');
    }

    console.log('\n--- Test Complete ---');
    console.log('Check server logs for database confirmation output.');
}

// Wait for server to start if running immediately, but here we just run it.
runTest();
