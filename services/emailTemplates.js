// Helper: format "2026-02-09" → "Feb 9, 2026"
function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[month - 1]} ${day}, ${year}`;
}

const getConfirmationEmail = (guestName) => {
    return {
        subject: 'Booking Confirmation - Muir Woods Bungalow',
        text: `Hi ${guestName},\n\nYour booking at Muir Woods Bungalow is confirmed! We look forward to hosting you.\n\nIf you have any questions, feel free to contact Peter at 415-381-2949.\n\nBest,\nThe Team`,
        html: `<p>Hi ${guestName},</p><p>Your booking at <strong>Muir Woods Bungalow</strong> is confirmed! We look forward to hosting you.</p><p>If you have any questions, feel free to contact Peter at <strong>415-381-2949</strong>.</p><p>Best,<br>The Team</p>`
    };
};

const getCheckinEmail = (guestName, checkInDate) => {
    const formattedDate = checkInDate ? formatDate(checkInDate) : 'your arrival date';
    return {
        subject: 'Check-In Instructions - Muir Woods Bungalow',
        html: `
<p>Welcome ${guestName}!</p>

<p>I'm reaching out to reconfirm your reservation for <strong>3:00 PM on ${formattedDate}</strong> at the Muir Woods Bungalow.</p>

<p>The house is located at:<br>
<strong>538 Shoreline Highway A, Mill Valley, CA 94941, United States</strong></p>

<h3>📍 Important Navigation Note</h3>
<p>Some navigation systems may incorrectly guide you to <strong>538 Pine Crest Road</strong>, which is about 0.1 miles away. Please ensure you are heading to <strong>538 Shoreline Highway (AKA Route One)</strong>. The correct driveway faces the main road with a double yellow line. If your GPS leads you up a narrow, steep road (Pine Crest), you have gone the wrong way.</p>

<h3>A few important details for your stay:</h3>
<ul>
  <li><strong>Lockbox Code:</strong> The code to the lockbox containing the key is <strong>4981</strong>. Feel free to let yourself in and make yourself at home.</li>
  <li><strong>Parking:</strong> Please park only in the driveway in front of the house and avoid using the neighboring driveway.</li>
  <li><strong>Wi-Fi:</strong> Network: <strong>Muir Woods</strong> | Password: <strong>11223344</strong></li>
  <li><strong>Heating:</strong> The house is heated by a gas fireplace in the living room, controlled by a thermostat set to 69°F. You may notice a flame ignite automatically — that's normal. You can adjust the temperature using the remote on top of the dresser or leave it as is.</li>
  <li><strong>Occupancy:</strong> Please ensure that the number of guests matches your reservation, as occupancy is limited to those listed.</li>
</ul>

<p>If you have any questions about the house or the area, feel free to reach out. You can contact me anytime at <strong>415-381-2949</strong>.</p>

<p>I hope you have a wonderful stay!</p>

<p>Best,<br>-Peter</p>`
    };
};

const getFollowupEmail = (guestName) => {
    return {
        subject: 'Checking In - Muir Woods Bungalow',
        html: `
<p>Dear ${guestName},</p>

<p>Just wanted to check in to make sure you're comfortable in the house.</p>

<p>If you have any questions or need anything at all, please don't hesitate to reach out — we're nearby and happy to help. We want to make sure you have a great stay!</p>

<p>Thank you,</p>
<p>-Peter &amp; Monica</p>`
    };
};

const getCheckoutEmail = (guestName) => {
    return {
        subject: 'Checkout Reminder - Muir Woods Bungalow',
        html: `
<p>Dear ${guestName},</p>

<p>We hope you're enjoying your stay at the Muir Woods Bungalow — thank you for being our guest!</p>

<p>As a quick reminder, <strong>check-out is tomorrow before 11:00 AM</strong>. Please leave one key in the lockbox (code: <strong>4981</strong>) and the other on the counter.</p>

<p>If you have a lot of garbage or recycling, kindly place it in the cans in the driveway — black for garbage, blue for recycling. If needed, please also start the dishwasher before you go.</p>

<p>Before leaving, we'd appreciate it if you could log out of any Wi-Fi accounts, such as Netflix or Amazon.</p>

<p>We always welcome feedback, so if you have any suggestions on how we can improve the cottage and guest experience, we'd love to hear them.</p>

<p>Wishing you safe travels, and we'd love to host you again in the future!</p>

<p>Best,<br>Peter &amp; Monica</p>`
    };
};

const getDepositConfirmationEmail = (guestName, depositCents, remainingCents, checkInDate, bookingLink) => {
    const depositDollars = (depositCents / 100).toFixed(2);
    const remainingDollars = (remainingCents / 100).toFixed(2);
    const formattedDate = checkInDate ? formatDate(checkInDate) : 'your arrival date';
    return {
        subject: 'Booking Confirmed - Muir Woods Bungalow',
        html: `
<p>Dear ${guestName},</p>

<p>Thank you for booking a stay at the Muir Woods Bungalow!</p>

<p>We're delighted to confirm that your rental home at <strong>538 Shoreline Highway A, Mill Valley, CA 94941, United States</strong> will be ready for your arrival at <strong>3 PM on ${formattedDate}</strong>.</p>

<p>Upon arrival, you'll find a lockbox with the key at the front door. An access code will be emailed to you the day before your arrival.</p>

<p>🏡 We live on the same property, but about 300 feet up the driveway. We are available if you need anything.</p>

<h3>📖 Local Recommendations</h3>
<p>Here is a link to a guidebook with some of our favorite local spots:<br>
<a href="https://www.airbnb.com/s/guidebooks?refinement_paths[]=/guidebooks/1222521&s=67&unique_share_id=54c1bd5d-9106-475f-9369-9081d31b5110">Muir Woods Area Guidebook</a></p>

<h3>Payment Summary</h3>
<p>
  Deposit paid: <strong>$${depositDollars}</strong><br>
  Remaining balance: <strong>$${remainingDollars}</strong> (automatically charged 24 hours before check-in)
</p>

<p><a href="${bookingLink}">View or manage your booking</a></p>

<p>If you have any questions, please don't hesitate to reach out. We want to ensure you have a wonderful and comfortable stay.</p>

<p>Looking forward to hosting you!</p>

<p>Best regards,<br>Peter &amp; Monica</p>`
    };
};

const getSecondPaymentReceiptEmail = (guestName, amountCents) => {
    const amountDollars = (amountCents / 100).toFixed(2);
    return {
        subject: 'Final Payment Received - Muir Woods Bungalow',
        html: `<p>Hi ${guestName},</p>
<p>Your final payment of <strong>$${amountDollars}</strong> has been successfully processed. Your balance is now paid in full.</p>
<p>We're looking forward to your stay at Muir Woods Bungalow! If you have any questions before your arrival, contact Peter at <strong>415-381-2949</strong>.</p>
<p>See you soon!</p>
<p>Best,<br>Peter &amp; Monica</p>`
    };
};

const getSecondPaymentFailedGuestEmail = (guestName, amountCents) => {
    const amountDollars = (amountCents / 100).toFixed(2);
    return {
        subject: 'Action Required: Final Payment Failed - Muir Woods Bungalow',
        html: `<p>Hi ${guestName},</p>
<p>We were unable to process your final payment of <strong>$${amountDollars}</strong> for your upcoming stay at Muir Woods Bungalow.</p>
<p>Please contact Peter immediately at <strong>415-381-2949</strong> to resolve this before your check-in.</p>
<p>Thank you,<br>Peter &amp; Monica</p>`
    };
};

const getSecondPaymentFailedHostEmail = (guestName, guestEmail, bookingId, amountCents, checkInDate) => {
    const amountDollars = (amountCents / 100).toFixed(2);
    return {
        subject: `Payment Failure Alert - Booking ${bookingId}`,
        html: `<p>Hi Peter,</p>
<p>The automatic final payment charge has <strong>failed</strong> for the following booking:</p>
<ul>
  <li><strong>Booking ID:</strong> ${bookingId}</li>
  <li><strong>Guest:</strong> ${guestName}</li>
  <li><strong>Guest Email:</strong> ${guestEmail}</li>
  <li><strong>Check-In Date:</strong> ${checkInDate}</li>
  <li><strong>Amount:</strong> $${amountDollars}</li>
</ul>
<p>No automated action has been taken. Please follow up with the guest directly to collect payment.</p>`
    };
};

module.exports = {
    getConfirmationEmail,
    getCheckinEmail,
    getFollowupEmail,
    getCheckoutEmail,
    getDepositConfirmationEmail,
    getSecondPaymentReceiptEmail,
    getSecondPaymentFailedGuestEmail,
    getSecondPaymentFailedHostEmail
};
