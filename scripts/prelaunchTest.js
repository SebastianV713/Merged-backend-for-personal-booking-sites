/**
 * Pre-Launch End-to-End Test Script
 *
 * Runs automated checks for Steps 0, 1, 2, 3, and 9 of the test walkthrough.
 * Steps 4–8 (browser + Stripe payment flow) must be completed manually.
 *
 * Usage (with server running on Replit or locally):
 *   BASE_URL=https://your-backend.replit.app node scripts/prelaunchTest.js
 *   or just:
 *   node scripts/prelaunchTest.js   (defaults to http://localhost:3000)
 */

require('dotenv').config();
const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ── Helpers ─────────────────────────────────────────────────────────────────

function pass(label) {
    console.log(`  ✅ PASS: ${label}`);
}

function fail(label) {
    console.log(`  ❌ FAIL: ${label}`);
}

function info(label) {
    console.log(`  ℹ  ${label}`);
}

function section(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`${title}`);
    console.log('─'.repeat(60));
}

async function get(path) {
    return new Promise((resolve, reject) => {
        const url = `${BASE_URL}${path}`;
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(body) });
                } catch {
                    resolve({ status: res.statusCode, body });
                }
            });
        }).on('error', reject);
    });
}

// ── Future dates for price test (2 weeks from today) ─────────────────────────

function futureDate(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
}

// ── Step 0: Env var check ────────────────────────────────────────────────────

function checkEnvVars() {
    section('Step 0 — Environment Variables');

    const required = [
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'STRIPE_TAX_RATE_DECIMAL',
        'GMAIL_USER',
        'GMAIL_APP_PASSWORD',
        'HOST_EMAIL',
        'PRICELABS_API_KEY',
        'PRICELABS_LISTING_ID',
        'AIRBNB_ICAL_URL',
        'FRONTEND_URL',
    ];

    let allGood = true;
    for (const key of required) {
        if (process.env[key]) {
            pass(`${key} is set`);
        } else {
            fail(`${key} is MISSING`);
            allGood = false;
        }
    }

    // Warn if STRIPE_TAX_RATE_ID is absent (non-fatal in deposit mode but worth noting)
    if (!process.env.STRIPE_TAX_RATE_ID) {
        info('STRIPE_TAX_RATE_ID not set (tax is baked into deposit amount, so this is OK)');
    }

    return allGood;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('\n========================================');
    console.log('  Phantom Sun — Pre-Launch Test Script  ');
    console.log('========================================');
    console.log(`Targeting: ${BASE_URL}`);

    // Step 0
    const envOk = checkEnvVars();
    if (!envOk) {
        console.log('\n⚠️  Fix missing env vars before continuing.\n');
    }

    // Steps 1–3, 9 require the server to be reachable
    section('Step 1 — Backend Health');
    try {
        const res = await get('/');
        if (res.status === 200 && typeof res.body === 'string' && res.body.includes('running')) {
            pass(`GET / → "${res.body.trim()}"`);
        } else {
            fail(`GET / returned status ${res.status}: ${JSON.stringify(res.body)}`);
        }
    } catch (e) {
        fail(`Cannot reach ${BASE_URL} — is the server running? (${e.message})`);
        console.log('\n  Skipping network tests. Start the server and re-run.\n');
        return;
    }

    section('Step 2 — Blocked Dates');
    try {
        const res = await get('/bookings/blocked');
        if (res.status === 200 && Array.isArray(res.body)) {
            pass(`GET /bookings/blocked → array with ${res.body.length} entries`);
            const airbnb = res.body.filter(b => b.source === 'airbnb');
            const local  = res.body.filter(b => b.source === 'local');
            info(`Airbnb entries: ${airbnb.length}, Local entries: ${local.length}`);
        } else {
            fail(`Unexpected response: ${JSON.stringify(res.body)}`);
        }
    } catch (e) {
        fail(`Error: ${e.message}`);
    }

    section('Step 3 — Price Calculation');
    const start = futureDate(30);
    const end   = futureDate(33);
    info(`Testing date range: ${start} to ${end} (3 nights)`);
    try {
        const res = await get(`/bookings/calculate-price?start=${start}&end=${end}`);
        if (res.status === 200 && res.body.total !== undefined) {
            const b = res.body;
            pass(`GET /bookings/calculate-price → total: $${b.total}`);
            info(`Nights: ${b.nights}`);
            info(`Subtotal (nightly): $${b.subtotal}`);
            info(`Cleaning fee: $${b.cleaning_fee}`);
            info(`Tax: $${b.tax}`);
            info(`Deposit (50%): $${b.deposit_amount}`);
            info(`Remaining (50%): $${b.remaining_amount}`);

            // Sanity checks
            const expectedTotal = b.subtotal + b.cleaning_fee + (b.pet_fee || 0) + b.tax;
            if (Math.abs(expectedTotal - b.total) < 0.02) {
                pass('Total = subtotal + cleaning + tax');
            } else {
                fail(`Total mismatch: ${b.total} vs expected ${expectedTotal}`);
            }

            const expectedDeposit = Math.round(b.total * 100 / 2) / 100;
            if (Math.abs(b.deposit_amount - expectedDeposit) < 0.02) {
                pass('Deposit ≈ 50% of total');
            } else {
                fail(`Deposit mismatch: ${b.deposit_amount} vs expected ${expectedDeposit}`);
            }

            const sumOfSplit = b.deposit_amount + b.remaining_amount;
            if (Math.abs(sumOfSplit - b.total) < 0.02) {
                pass('Deposit + remaining = total');
            } else {
                fail(`Split doesn't add up: ${b.deposit_amount} + ${b.remaining_amount} = ${sumOfSplit}, total = ${b.total}`);
            }
        } else if (res.status === 400) {
            info(`No PriceLabs rates for ${start}–${end}. This is expected if rates are not synced. Response: ${JSON.stringify(res.body)}`);
        } else {
            fail(`Unexpected response: ${res.status} ${JSON.stringify(res.body)}`);
        }
    } catch (e) {
        fail(`Error: ${e.message}`);
    }

    section('Step 9 — 404 on Bad Booking ID');
    try {
        const res = await get('/bookings/fake-id-that-doesnt-exist');
        if (res.status === 404 && res.body && res.body.error === 'Booking not found') {
            pass('GET /bookings/fake-id → 404 { error: "Booking not found" }');
        } else {
            fail(`Expected 404 with "Booking not found", got: ${res.status} ${JSON.stringify(res.body)}`);
        }
    } catch (e) {
        fail(`Error: ${e.message}`);
    }

    section('Manual Steps Still Required');
    console.log(`
  Step 4:  Open the frontend, select dates, fill in guest info, click Book.
  Step 5:  Pay with test card 4242 4242 4242 4242 → Stripe redirects to /booking-success.
  Step 6:  Check backend logs for webhook signature + "Payment confirmed for booking [id]".
  Step 7:  Check guest email for "Deposit Received" subject with /my-booking link.
  Step 8:  Open /my-booking?id=[uuid] → confirm status=Confirmed, refund eligibility shown.
  Step 9:  Click Cancel → confirm { success: true, refunded: true }, check Stripe dashboard.
  Step 10: GET /bookings/blocked → cancelled booking NOT present, pending booking IS present.

  Helpful DB inspection script (run on backend):
    node scripts/checkConfirmedBookings.js
    node scripts/debugEmail.js
`);

    console.log('Pre-launch automated checks complete.\n');
}

main().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
