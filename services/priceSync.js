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

        // Updated to POST /get_prices endpoint as requested
        const response = await axios.post('https://api.pricelabs.co/v1/get_prices',
            {
                listing_ids: [LISTING_ID],
                pms: 'airbnb'
            },
            {
                headers: {
                    'X-API-KEY': PRICELABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                validateStatus: function (status) {
                    return status >= 200 && status < 600;
                }
            }
        );

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

        // The /get_prices endpoint typically returns an array of objects, each containing a 'data' array for the listing
        // Or it might be an object keyed by listing_id. 
        // We need to find the data for our LISTING_ID.

        // Detailed logging to help understand the structure if it fails
        if (!data) {
            console.error('PriceLabs returned empty data');
            return;
        }

        let rates = [];

        // Attempt to extract rates based on common structures for this endpoint
        if (Array.isArray(data)) {
            // Check if it's an array of listings
            const listingData = data.find(item => item.listing_id == LISTING_ID);
            if (listingData && Array.isArray(listingData.data)) {
                rates = listingData.data;
            } else if (data.length > 0 && data[0].date) {
                // Maybe it returned the rates directly (unlikely for bulk endpoint but possible if only 1 requested)
                rates = data;
            }
        } else if (typeof data === 'object') {
            // Check if keyed by ID
            if (data[LISTING_ID] && Array.isArray(data[LISTING_ID])) {
                rates = data[LISTING_ID];
            } else if (data.data && Array.isArray(data.data)) {
                // Fallback to standard data wrapper
                rates = data.data;
            }
        }

        if (!rates || rates.length === 0) {
            console.error('Could not find rates data in PriceLabs response. Response keys:', Object.keys(data));
            console.log('Response sample:', JSON.stringify(data).substring(0, 200));
            return;
        }

        console.log(`Received ${rates.length} daily rates from get_prices. Updating database...`);

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
