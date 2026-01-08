const Stripe = require('stripe');
require('dotenv').config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(bookingId, amountCents, successUrl, cancelUrl) {
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: 'Property Rental',
                    metadata: { booking_id: bookingId }
                },
                unit_amount: amountCents,
            },
            quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            bookingId: bookingId
        }
    });

    return session;
}

async function constructEvent(payload, signature) {
    return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = {
    createCheckoutSession,
    constructEvent
};
