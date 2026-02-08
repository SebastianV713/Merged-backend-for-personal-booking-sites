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
        const url = `https://api.pricelabs.co/v1/listings/${LISTING_ID}/calendar?pms=airbnb`;
        console.log(`Fetching rates from PriceLabs... URL: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'X-API-KEY': PRICELABS_API_KEY,
                'Accept': 'application/json'
            },
            validateStatus: function (status) {
                return true; // Resolve promise for all status codes to handle them manually
            }
        });

        // Specific handling for 400 Invalid Request as requested
        if (response.status === 400) {
            console.error('PriceLabs returned 400 Invalid Request.');
            console.error('Error Body:', JSON.stringify(response.data, null, 2));
            return;
        }

        if (response.status !== 200) {
            console.error(`PriceLabs API error (Status ${response.status}):`, JSON.stringify(response.data, null, 2));
            return;
        }

        const data = response.data;

        // The calendar endpoint typically returns an array of daily rates directly, 
        // or an object with a 'data' property containing the array.
        const rates = Array.isArray(data) ? data : (data.data || []);

        if (!Array.isArray(rates) || rates.length === 0) {
            console.error('Could not find rates array in PriceLabs response. Response keys:', Object.keys(data || {}));
            return;
        }

        console.log(`Received ${rates.length} daily rates from calendar. Updating database...`);

        db.serialize(() => {
            const stmt = db.prepare('INSERT OR REPLACE INTO daily_rates (date, price, min_stay) VALUES (?, ?, ?)');

            db.run('BEGIN TRANSACTION');

            rates.forEach(day => {
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
            [startDate, endDate],
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
