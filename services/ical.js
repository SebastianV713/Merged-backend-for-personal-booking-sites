const ical = require('node-ical');
const axios = require('axios');

let blockedDatesCache = [];
let lastFetchTime = null;

const ICAL_REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Fetches and parses the Airbnb iCal feed.
 * Updates the in-memory cache of blocked dates.
 */
async function refreshIcal() {
    const iCalUrl = process.env.AIRBNB_ICAL_URL;

    if (!iCalUrl) {
        console.warn('AIRBNB_ICAL_URL is not set. Skipping iCal sync.');
        return;
    }

    console.log('Fetching Airbnb iCal...');
    try {
        const response = await axios.get(iCalUrl);
        const data = await ical.async.parseICS(response.data);

        const newBlockedDates = [];

        for (const k in data) {
            const event = data[k];
            if (event.type === 'VEVENT') {
                const start = new Date(event.start);
                const end = new Date(event.end);

                // Airbnb blocks are usually "Confirmed" or "Not available"
                // We treat all events in the iCal as blocked.
                newBlockedDates.push({
                    start: start,
                    end: end,
                    summary: event.summary || 'Blocked'
                });
            }
        }

        blockedDatesCache = newBlockedDates;
        lastFetchTime = new Date();
        console.log(`Updated iCal cache. Found ${blockedDatesCache.length} blocked ranges.`);

    } catch (error) {
        console.error('Error fetching/parsing iCal:', error.message);
    }
}

/**
 * Returns the cached blocked dates.
 * Triggers a refresh if the cache is stale or empty (and hasn't been fetched yet).
 */
function getBlockedDates() {
    // If never fetched, trigger one in background (async)
    if (!lastFetchTime) {
        refreshIcal();
    }
    return blockedDatesCache;
}

/**
 * Starts the automatic refresh interval.
 */
function startAutoRefresh() {
    // Initial fetch
    refreshIcal();

    // Set interval
    setInterval(refreshIcal, ICAL_REFRESH_INTERVAL_MS);
}

/**
 * Checks if the requested date range overlaps with any blocked dates from iCal.
 * @param {string|Date} startDate 
 * @param {string|Date} endDate 
 * @returns {Promise<boolean>} true if blocked (overlapping), false if available
 */
async function checkAvailability(startDate, endDate) {
    const blockedDates = getBlockedDates();
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (const blocked of blockedDates) {
        // Check for overlap
        // Overlap condition: Not (EndA <= StartB or StartA >= EndB)
        // Equivalent to: StartA < EndB and EndA > StartB
        const blockedStart = blocked.start;
        const blockedEnd = blocked.end;

        if (start < blockedEnd && end > blockedStart) {
            console.log(`iCal Conflict found: ${start.toISOString()} - ${end.toISOString()} overlaps with ${blockedStart.toISOString()} - ${blockedEnd.toISOString()}`);
            return true;
        }
    }

    return false;
}

module.exports = {
    checkAvailability,
    getBlockedDates,
    startAutoRefresh,
    refreshIcal // Exported for testing/manual trigger
};
