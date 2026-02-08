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
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const dateFrom = today.toISOString().split('T')[0];
        const dateTo = nextYear.toISOString().split('T')[0];

        const body = {
            listings: [
                {
                    id: String(LISTING_ID),
                    pms: 'airbnb',
                    dateFrom: dateFrom,
                    dateTo: dateTo
                }
            ]
        };

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

        // The response from /listing_prices with a list of listings should be an array of listings.
        // We need to find our listing or iterate through all returned listings (though we only asked for one).
        let listings = [];
        if (Array.isArray(data)) {
            listings = data;
        } else if (data.data && Array.isArray(data.data)) {
            // Sometimes APIs wrap arrays in a 'data' key
            listings = data.data;
        } else if (data.listings && Array.isArray(data.listings)) {
            listings = data.listings;
        } else {
            // Fallback: if it's a single object that looks like a listing
            listings = [data];
        }

        let totalRatesProcessed = 0;

        db.serialize(() => {
            const stmt = db.prepare('INSERT OR REPLACE INTO daily_rates (date, price, min_stay) VALUES (?, ?, ?)');
            db.run('BEGIN TRANSACTION');

            listings.forEach(listing => {
                // Check if this is the listing we asked for (optional safety check, but good if we asked for multiple)
                // Also check if 'data' or 'prices' exists
                // The documentation examples usually show 'data' containing the array of days
                const rates = listing.data || listing.prices || [];

                if (Array.isArray(rates)) {
                    console.log(`Processing ${rates.length} rates for listing ${listing.id || 'unknown'}...`);

                    rates.forEach(day => {
                        const date = day.date || day.day;
                        const price = day.price;
                        const min_stay = day.min_stay || day.minimum_stay;

                        if (date && price) {
                            stmt.run(date, price, min_stay);
                            totalRatesProcessed++;
                        }
                    });
                } else {
                    console.warn(`No rate data found for listing ${listing.id}. content:`, JSON.stringify(listing).substring(0, 200));
                }
            });

            db.run('COMMIT', (err) => {
                if (err) console.error('Error committing rates transaction:', err);
                else console.log(`Successfully synced ${totalRatesProcessed} rates to the database.`);
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
