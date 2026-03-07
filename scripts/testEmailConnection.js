
require('dotenv').config();
const { Resend } = require('resend');

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
    console.error('❌ RESEND_API_KEY is missing from .env');
    process.exit(1);
}

console.log(`✅ Found RESEND_API_KEY: ${apiKey.substring(0, 4)}...`);

const resend = new Resend(apiKey);

(async () => {
    try {
        console.log('Attempting to send test email...');
        const { data, error } = await resend.emails.send({
            from: 'Muir Woods Bungalow <onboarding@resend.dev>',
            to: ['delivered@resend.dev'],
            subject: 'Test Email from Backend',
            html: '<p>This is a test email to verify the Resend configuration.</p>'
        });

        if (error) {
            console.error('❌ Error sending email:', error);
        } else {
            console.log('✅ Email sent successfully!');
            console.log('ID:', data.id);
        }
    } catch (e) {
        console.error('❌ Exception during send:', e);
    }
})();
