const axios = require('axios');
const db = require('../db');

const PRICELABS_API_KEY = process.env.PRICELABS_API_KEY;
const LISTING_ID = process.env.PRICELABS_LISTING_ID;

async function syncRates() {
    if (!PRICELABS_API_KEY || !LISTING_ID) {
        console.warn('PRICELABS_API_KEY or PRICELABS_LISTING_ID is not set. Skipping rate sync.');
        return;
    }

    try {
        console.log(`Fetching rates from PriceLabs for listing ${LISTING_ID}...`);

        // Updated endpoint and headers as requested
        const response = await axios.get(`https://api.pricelabs.co/v1/listings/${LISTING_ID}/overrides?pms=airbnb`, {
            headers: {
                'X-API-KEY': PRICELABS_API_KEY,
                'Accept': 'application/json'
            },
            validateStatus: function (status) {
                return status >= 200 && status < 600; // Accept all status codes to handle HTML error pages gracefully
            }
        });

        // Check if response is JSON
        const contentType = response.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
            const bodyPreview = typeof response.data === 'string'
                ? response.data.substring(0, 100)
                : JSON.stringify(response.data).substring(0, 100);
            console.error('PriceLabs returned non-JSON response:', bodyPreview);
            return;
        }

        if (response.status !== 200) {
            console.error(`PriceLabs API error (Status ${response.status}):`, JSON.stringify(response.data));
            return;
        }

        const data = response.data;
        // Assuming response data is the list of rates or data.data
        const rates = Array.isArray(data) ? data : (data.data || []);

        if (!Array.isArray(rates)) {
            console.error('Unexpected PriceLabs response format:', data);
            return;
        }

        console.log(`Received ${rates.length} daily rates/overrides. Updating database...`);

        db.serialize(() => {
            const stmt = db.prepare('INSERT OR REPLACE INTO daily_rates (date, price, min_stay) VALUES (?, ?, ?)');

            db.run('BEGIN TRANSACTION');

            rates.forEach(day => {
                // Map fields: assuming date, price, min_stay exist in the response
                const date = day.date;
                const price = day.price; // or price_override?
                const min_stay = day.min_stay;

                if (date && price) {
                    stmt.run(date, price, min_stay);
                }
            });

            db.run('COMMIT', (err) => {
                if (err) console.error('Error committing rates transaction:', err);
                else console.log('Rates synced successfully.');
            });

            stmt.finalize();
        });

    } catch (error) {
        console.error('Error syncing PriceLabs rates:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

function getRatesForRange(startDate, endDate) {
    return new Promise((resolve, reject) => {
        db.all(
            'SELECT * FROM daily_rates WHERE date >= ? AND date < ?',
            [startDate, endDate], // endDate is exclusive in booking logic usually, but let's check strict inequalities
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

module.exports = {
    syncRates,
    getRatesForRange
};
