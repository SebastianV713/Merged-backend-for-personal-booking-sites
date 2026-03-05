const getConfirmationEmail = (guestName) => {
    return {
        subject: 'Booking Confirmation - Muir Woods Bungalow',
        text: `Hi ${guestName},\n\nYour booking at Muir Woods Bungalow is confirmed! We look forward to hosting you.\n\nIf you have any questions, feel free to contact Peter at 415-381-2949.\n\nBest,\nThe Team`,
        html: `<p>Hi ${guestName},</p><p>Your booking at <strong>Muir Woods Bungalow</strong> is confirmed! We look forward to hosting you.</p><p>If you have any questions, feel free to contact Peter at <strong>415-381-2949</strong>.</p><p>Best,<br>The Team</p>`
    };
};

const getCheckinEmail = (guestName) => {
    return {
        subject: 'Check-in Instructions - Muir Woods Bungalow',
        text: `Hi ${guestName},\n\nWe're excited to host you! Here are your check-in details for tomorrow:\n\n**Lockbox Code:** 4981\n\n**Navigation Warning:**\nGPS may wrongly lead you to Pine Crest Road. This is a very narrow and steep road. Please avoid it if possible and follow the main roads.\n\n**Wi-Fi:**\nNetwork: Muir Woods\nPassword: 11223344\n\n**Contact:**\nPeter: 415-381-2949\n\nSafe travels!`,
        html: `<p>Hi ${guestName},</p>
<p>We're excited to host you! Here are your check-in details for tomorrow:</p>
<h3>Access</h3>
<p><strong>Lockbox Code:</strong> 4981</p>
<h3>Navigation Warning ⚠️</h3>
<p>GPS may wrongly lead you to <strong>Pine Crest Road</strong>. This is a very narrow and steep road. Please avoid it if possible and follow the main roads.</p>
<h3>Wi-Fi</h3>
<p><strong>Network:</strong> Muir Woods<br><strong>Password:</strong> 11223344</p>
<h3>Contact</h3>
<p><strong>Peter:</strong> 415-381-2949</p>
<p>Safe travels!</p>`
    };
};

const getFollowupEmail = (guestName) => {
    return {
        subject: 'Checking in - Is everything okay?',
        text: `Hi ${guestName},\n\nJust wanted to check in and make sure you're settling in well at Muir Woods Bungalow.\n\nIf you need anything, Peter is available at 415-381-2949.\n\nEnjoy your stay!`,
        html: `<p>Hi ${guestName},</p><p>Just wanted to check in and make sure you're settling in well at Muir Woods Bungalow.</p><p>If you need anything, Peter is available at <strong>415-381-2949</strong>.</p><p>Enjoy your stay!</p>`
    };
};

const getCheckoutEmail = (guestName) => {
    return {
        subject: 'Checkout Instructions - Muir Woods Bungalow',
        text: `Hi ${guestName},\n\nHope you enjoyed your stay! Checkout is at 11 AM.\n\nPlease lock the door behind you.\n\nSafe travels home!\n\n(Contact Peter: 415-381-2949)`,
        html: `<p>Hi ${guestName},</p><p>Hope you enjoyed your stay! Checkout is at 11 AM.</p><p>Please lock the door behind you.</p><p>Safe travels home!</p><p><small>Contact Peter: 415-381-2949</small></p>`
    };
};

const getDepositConfirmationEmail = (guestName, depositCents, remainingCents, checkInDate, bookingLink) => {
    const depositDollars = (depositCents / 100).toFixed(2);
    const remainingDollars = (remainingCents / 100).toFixed(2);
    return {
        subject: 'Deposit Received - Muir Woods Bungalow',
        html: `<p>Hi ${guestName},</p>
<p>We've received your deposit of <strong>$${depositDollars}</strong> for Muir Woods Bungalow. Your booking is confirmed!</p>
<p>The remaining balance of <strong>$${remainingDollars}</strong> will be automatically charged to your card on file 24 hours before your check-in on <strong>${checkInDate}</strong>.</p>
<p><a href="${bookingLink}">View or manage your booking</a></p>
<p>If you have any questions, feel free to contact Peter at <strong>415-381-2949</strong>.</p>
<p>We look forward to hosting you!</p>
<p>Best,<br>The Team</p>`
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
<p>Best,<br>The Team</p>`
    };
};

const getSecondPaymentFailedGuestEmail = (guestName, amountCents) => {
    const amountDollars = (amountCents / 100).toFixed(2);
    return {
        subject: 'Action Required: Final Payment Failed - Muir Woods Bungalow',
        html: `<p>Hi ${guestName},</p>
<p>We were unable to process your final payment of <strong>$${amountDollars}</strong> for your upcoming stay at Muir Woods Bungalow.</p>
<p>Please contact Peter immediately at <strong>415-381-2949</strong> to resolve this before your check-in.</p>
<p>Thank you,<br>The Team</p>`
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
