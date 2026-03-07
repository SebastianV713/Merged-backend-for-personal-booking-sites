require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('Using API Key:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 5) + '...' : 'MISSING');

(async function () {
    try {
        const { data, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'sebastianpvaughan@gmail.com',
            subject: 'Hello World',
            html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
        });

        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent successfully!');
            console.log('ID:', data.id);
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
})();
