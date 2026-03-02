const Stripe = require('stripe');
require('dotenv').config();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(bookingId, amountCents, successUrl, cancelUrl, customerEmail, metadata = {}, hasPets = false, isDeposit = false) {
    const taxRates = process.env.STRIPE_TAX_RATE_ID ? [process.env.STRIPE_TAX_RATE_ID] : [];

    let lineItems;
    let sessionOptions = {};

    if (isDeposit) {
        // Deposit mode: single line item, tax already baked in, save card for later
        lineItems = [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: '50% Deposit - Property Rental',
                        metadata: { booking_id: bookingId }
                    },
                    unit_amount: amountCents,
                },
                quantity: 1,
            }
        ];
        sessionOptions.payment_intent_data = { setup_future_usage: 'off_session' };
    } else {
        lineItems = [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Property Rental',
                        metadata: { booking_id: bookingId }
                    },
                    unit_amount: amountCents,
                },
                quantity: 1,
                tax_rates: taxRates,
            },
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Cleaning Fee',
                    },
                    unit_amount: 16500, // $165.00
                },
                quantity: 1,
                tax_rates: taxRates,
            }
        ];

        if (hasPets) {
            lineItems.push({
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Pet Fee',
                    },
                    unit_amount: 6500, // $65.00
                },
                quantity: 1,
                // No tax on pet fee
            });
        }
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: customerEmail,
        line_items: lineItems,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            bookingId: bookingId,
            hasPets: String(hasPets),
            isDeposit: String(isDeposit),
            ...metadata
        },
        ...sessionOptions
    });

    return session;
}

async function chargeRemainingPayment(bookingId, customerId, paymentMethodId, remainingCents) {
    return stripe.paymentIntents.create({
        amount: remainingCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        metadata: { bookingId, chargeType: 'remaining_50_percent' }
    });
}

async function createRefund(paymentIntentId, amountCents = null) {
    const params = { payment_intent: paymentIntentId };
    if (amountCents) params.amount = amountCents;
    return stripe.refunds.create(params);
}

async function retrieveCheckoutSession(sessionId, options = {}) {
    return stripe.checkout.sessions.retrieve(sessionId, options);
}

async function constructEvent(payload, signature) {
    return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
}

module.exports = {
    createCheckoutSession,
    constructEvent,
    chargeRemainingPayment,
    createRefund,
    retrieveCheckoutSession
};
