/**
 * Sends one of each guest-facing email template to a test address.
 * Run this in Railway shell: node scripts/sendTestEmails.js
 */

require('dotenv').config();
const { sendEmail } = require('../services/emailSender');
const emailTemplates = require('../services/emailTemplates');

const TEST_EMAIL = 'sebastianpvaughan@gmail.com';
const GUEST_NAME = 'Adrian';
const CHECK_IN_DATE = '2026-04-15';
const BOOKING_LINK = 'https://workspace.vaughanbusiness.replit.app/my-booking?id=test-preview-id';
const DEPOSIT_CENTS = 45000;   // $450.00
const REMAINING_CENTS = 45000; // $450.00

async function run() {
    console.log(`Sending test emails to ${TEST_EMAIL}...\n`);

    const emails = [
        {
            label: 'Deposit Confirmation',
            ...emailTemplates.getDepositConfirmationEmail(
                GUEST_NAME, DEPOSIT_CENTS, REMAINING_CENTS, CHECK_IN_DATE, BOOKING_LINK
            )
        },
        {
            label: 'Check-In Instructions',
            ...emailTemplates.getCheckinEmail(GUEST_NAME, CHECK_IN_DATE)
        },
        {
            label: 'Follow-Up',
            ...emailTemplates.getFollowupEmail(GUEST_NAME)
        },
        {
            label: 'Checkout Reminder',
            ...emailTemplates.getCheckoutEmail(GUEST_NAME)
        },
        {
            label: 'Final Payment Receipt',
            ...emailTemplates.getSecondPaymentReceiptEmail(GUEST_NAME, REMAINING_CENTS)
        },
    ];

    for (const email of emails) {
        console.log(`Sending: ${email.label}`);
        await sendEmail(TEST_EMAIL, `[TEST] ${email.subject}`, email.html, null, null);
        // Small delay so Gmail doesn't batch them
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log('\nDone. Check sebastianpvaughan@gmail.com.');
    process.exit(0);
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
