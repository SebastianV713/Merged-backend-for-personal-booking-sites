require('dotenv').config();
const express = require('express');
const bookingRoutes = require('./routes/bookings');
const webhookRoutes = require('./routes/webhooks'); // Import webhook routes
const path = require('path');
const icalService = require('./services/ical');
const cors = require('cors');

// Start backend services
icalService.startAutoRefresh();
const priceSyncService = require('./services/priceSync');
priceSyncService.syncRates();

const app = express();

// Configure CORS
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'https://workspace.vaughanbusiness.replit.app',
            'http://127.0.0.1:5000',
            'http://localhost:5000',
            // Add dynamic origin check if needed, or specific domains
            // The user asked for "https://[YOUR_PUBLISHED_REPLIT_DOMAIN]" which implies they might replace it or it's a placeholder.
            // We'll trust the process.env.FRONTEND_URL for the dynamic one if set.
            process.env.FRONTEND_URL
        ];

        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.replit.app')) {
            // allowing all replit.app subdomains to be safe since user didn't specify the exact "YOUR_PUBLISHED_REPLIT_DOMAIN" value
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
const port = process.env.PORT || 3000;

// Webhooks must be mounted BEFORE express.json() to access raw body
app.use('/webhooks', webhookRoutes);

app.use(express.json());

app.use('/bookings', bookingRoutes);

app.get('/', (req, res) => {
    res.send('Short-Term Rental Backend is running');
});

// Simple success/cancel pages for manual testing redirect
app.get('/success', (req, res) => {
    res.send('<h1>Payment Successful! Booking confirmed.</h1>');
});
app.get('/cancel', (req, res) => {
    res.send('<h1>Payment Cancelled.</h1>');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
