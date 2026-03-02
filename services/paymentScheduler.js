const cron = require('node-cron');
const db = require('../db');
const stripeService = require('./stripe');
const emailTemplates = require('./emailTemplates');
const { sendEmail } = require('./emailSender');

function startPaymentScheduler() {
    console.log('Starting Payment Scheduler...');

    // Run daily at 8 AM to charge remaining balance for tomorrow's check-ins
    cron.schedule('0 8 * * *', () => {
        console.log('Running payment scheduler job...');
        checkAndChargeRemainingPayments();
    });
}

async function checkAndChargeRemainingPayments() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    db.all(
        `SELECT * FROM bookings
         WHERE status = 'confirmed'
           AND deposit_paid = 1
           AND remaining_paid = 0
           AND remaining_charge_failed = 0
           AND start_date = ?`,
        [tomorrowStr],
        async (err, bookings) => {
            if (err) {
                console.error('Error fetching bookings for payment scheduler:', err);
                return;
            }

            console.log(`Payment scheduler: found ${bookings.length} booking(s) to charge for ${tomorrowStr}`);

            for (const booking of bookings) {
                await processRemainingCharge(booking);
            }
        }
    );
}

async function processRemainingCharge(booking) {
    const { id, guest_name, guest_email, stripe_customer_id, stripe_payment_method_id, remaining_amount, start_date } = booking;

    console.log(`Attempting remaining charge for booking ${id}: $${(remaining_amount / 100).toFixed(2)}`);

    try {
        await stripeService.chargeRemainingPayment(id, stripe_customer_id, stripe_payment_method_id, remaining_amount);

        // Success: mark remaining as paid
        db.run('UPDATE bookings SET remaining_paid = 1 WHERE id = ?', [id], (err) => {
            if (err) console.error(`Error updating remaining_paid for booking ${id}:`, err);
        });

        // Send receipt to guest
        if (guest_email) {
            const { subject, html } = emailTemplates.getSecondPaymentReceiptEmail(guest_name || 'Guest', remaining_amount);
            await sendEmail(guest_email, subject, html, id, 'sent_second_charge_receipt');
        }

        console.log(`Remaining charge succeeded for booking ${id}`);
    } catch (chargeErr) {
        console.error(`Remaining charge failed for booking ${id}:`, chargeErr.message);

        // Mark as failed
        db.run('UPDATE bookings SET remaining_charge_failed = 1 WHERE id = ?', [id], (err) => {
            if (err) console.error(`Error updating remaining_charge_failed for booking ${id}:`, err);
        });

        // Notify guest
        if (guest_email) {
            const { subject, html } = emailTemplates.getSecondPaymentFailedGuestEmail(guest_name || 'Guest', remaining_amount);
            await sendEmail(guest_email, subject, html, id, 'sent_second_charge_fail');
        }

        // Notify host
        const hostEmail = process.env.HOST_EMAIL;
        if (hostEmail) {
            const { subject, html } = emailTemplates.getSecondPaymentFailedHostEmail(
                guest_name || 'Guest',
                guest_email || 'N/A',
                id,
                remaining_amount,
                start_date
            );
            await sendEmail(hostEmail, subject, html, null, null);
        } else {
            console.warn('HOST_EMAIL not set — skipping host failure notification');
        }
    }
}

module.exports = { startPaymentScheduler, checkAndChargeRemainingPayments };
