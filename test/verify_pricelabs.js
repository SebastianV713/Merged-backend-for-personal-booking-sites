const db = require('../db');
const priceSyncService = require('../services/priceSync');

// Mock data to simulate API response if we were mocking, but let's try to use the service logic with a real DB interaction.
// We can manually insert some rates and check if getRatesForRange works correctly.

async function testPriceLogic() {
    console.log('--- Starting PriceLabs Service Verification ---');

    // 1. Manually insert some test rates
    console.log('Seeding daily_rates with test data...');
    const testRates = [
        { date: '2025-12-01', price: 100, min_stay: 2 },
        { date: '2025-12-02', price: 150, min_stay: 2 },
        { date: '2025-12-03', price: 100, min_stay: 2 }
    ];

    db.serialize(() => {
        const stmt = db.prepare('INSERT OR REPLACE INTO daily_rates (date, price, min_stay) VALUES (?, ?, ?)');
        testRates.forEach(r => stmt.run(r.date, r.price, r.min_stay));
        stmt.finalize();

        console.log('seeded.');

        // 2. Test fetching rates for a range
        // Range: 2025-12-01 to 2025-12-03 (2 nights: Dec 1, Dec 2)
        // Expected sum: 100 + 150 = 250
        const start = '2025-12-01';
        const end = '2025-12-03';

        console.log(`Testing getRatesForRange('${start}', '${end}')...`);
        priceSyncService.getRatesForRange(start, end).then(rates => {
            console.log(`Found ${rates.length} rates.`);
            rates.forEach(r => console.log(` - ${r.date}: $${r.price}`));

            let total = rates.reduce((sum, r) => sum + r.price, 0);
            console.log(`Total calculated: $${total}`);

            if (total === 250) {
                console.log('SUCCESS: Total matches expected value.');
            } else {
                console.error(`FAILURE: Expected $250, got $${total}`);
            }
        }).catch(err => {
            console.error('Error fetching rates:', err);
        });

    });
}

testPriceLogic();
