const axios = require('axios');
const db = require('../db');

const PRICELABS_API_KEY = process.env.PRICELABS_API_KEY;
const LISTING_ID = '19912038';

async function syncRates() {
    if (!PRICELABS_API_KEY) {
        console.warn('PRICELABS_API_KEY is not set. Skipping rate sync.');
        return;
    }

    try {
        console.log('Fetching rates from PriceLabs...');
        // PriceLabs Customer API endpoint to get calendar data
        const response = await axios.get(`https://api.pricelabs.co/v1/listing_prices?listing_id=${LISTING_ID}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PRICELABS_API_KEY}`
            }
        });

        const data = response.data;
        // The API response structure depends on the exact endpoint. 
        // Assuming /v1/listing_prices returns an object with a 'data' array or similar.
        // Documentation typically returns: { "listing_id": "...", "data": [ { "date": "2023-01-01", "price": 100, "min_stay": 2 }, ... ] }
        // If the structure is different (e.g. array at root), we adjust.
        // Let's assume standard format based on "fetch next 365 days".

        const rates = data.data || data; // handling potential wrapper

        if (!Array.isArray(rates)) {
            console.error('Unexpected PriceLabs response format:', data);
            return;
        }

        console.log(`Received ${rates.length} daily rates. Updating database...`);

        db.serialize(() => {
            const stmt = db.prepare('INSERT OR REPLACE INTO daily_rates (date, price, min_stay) VALUES (?, ?, ?)');

            db.run('BEGIN TRANSACTION');

            rates.forEach(day => {
                // key names might differ, assuming standard: date, price, min_stay
                // Adjust if API returns 'p' or 'm' etc.
                const date = day.date;
                const price = day.price;
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
