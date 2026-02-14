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

module.exports = {
    getConfirmationEmail,
    getCheckinEmail,
    getFollowupEmail,
    getCheckoutEmail
};
