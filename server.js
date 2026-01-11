require('dotenv').config();
const express = require('express');
const bookingRoutes = require('./routes/bookings');
const webhookRoutes = require('./routes/webhooks'); // Import webhook routes
const path = require('path');
const icalService = require('./services/ical');
const cors = require('cors');

// Start backend services
icalService.startAutoRefresh();

const app = express();

// Configure CORS
app.use(cors({
    origin: ['http://localhost:3000', 'https://workspace.vaughanbusiness.replit.app', process.env.FRONTEND_URL].filter(Boolean),
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
