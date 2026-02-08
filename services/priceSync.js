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
        const url = 'https://api.pricelabs.co/v1/listing_prices';
        const body = { listings: [LISTING_ID] };

        console.log(`Fetching rates from PriceLabs via POST ${url} for listing ${LISTING_ID}...`);
        console.log('Syncing listings: ' + JSON.stringify(body));

        const response = await axios.post(
            url,
            body,
            {
                headers: {
                    'X-API-KEY': PRICELABS_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        if (response.status !== 200) {
            console.error(`PriceLabs API error (Status ${response.status}):`, JSON.stringify(response.data));
            return;
        }

        const data = response.data;

        // processing logic: map response to daily_rates
        // Expecting an array of dates and prices, or an object containing it
        const rates = Array.isArray(data) ? data : (data.data || []);

        if (!Array.isArray(rates) || rates.length === 0) {
            console.error('Could not find rates array in PriceLabs response. Response keys:', Object.keys(data || {}));
            // Log a snippet of data to help debugging if structure is different
            console.error('Response data snippet:', JSON.stringify(data).substring(0, 200));
            return;
        }

        console.log(`Received ${rates.length} daily rates. Updating database...`);

        db.serialize(() => {
            const stmt = db.prepare('INSERT OR REPLACE INTO daily_rates (date, price, min_stay) VALUES (?, ?, ?)');

            db.run('BEGIN TRANSACTION');

            rates.forEach(day => {
                // Adjust property access based on actual API response keys if needed
                // Assuming standard keys: date, price, min_stay
                const date = day.date || day.day; // 'day' is sometimes used in other endpoints, keeping fallback check
                const price = day.price;
                const min_stay = day.min_stay || day.minimum_stay;

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
