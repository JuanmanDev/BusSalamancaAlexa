// public/notificationWorker.js
// We use a plain JS worker to avoid compilation issues, placed in public folder so it's statically served.

let intervalId = null;
const trackedItems = new Map(); // key: lineId_stopId, value: { lineId, stopId, destination }

self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'ADD_TRACKING': {
            const id = payload.id;
            trackedItems.set(id, payload);
            startTimerIfNeeded();
            // Immediate check on add
            checkArrivals();
            break;
        }
        case 'REMOVE_TRACKING': {
            const id = payload.id;
            trackedItems.delete(id);
            if (trackedItems.size === 0) {
                stopTimer();
            }
            break;
        }
        case 'STOP_ALL': {
            trackedItems.clear();
            stopTimer();
            break;
        }
    }
};

function startTimerIfNeeded() {
    if (intervalId === null && trackedItems.size > 0) {
        // Run every 10 seconds
        intervalId = setInterval(checkArrivals, 10000);
    }
}

function stopTimer() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

async function checkArrivals() {
    if (trackedItems.size === 0) return;

    // Group items by stopId so we only do 1 fetch per stop
    const stopsToTrack = new Set();
    for (const [_, item] of trackedItems) {
        stopsToTrack.add(item.stopId);
    }

    try {
        for (const stopId of stopsToTrack) {
            const url = new URL(`/api/bus/stop/${stopId}/arrivals`, self.location.origin);
            const response = await fetch(url.toString());

            if (!response.ok) continue;

            const arrivals = await response.json();

            // Check all tracked lines for this stop
            for (const [id, item] of trackedItems.entries()) {
                if (item.stopId === stopId) {
                    const lineArrivals = arrivals.filter(a => a.lineId === item.lineId);

                    if (lineArrivals.length > 0) {
                        let bestMatch = null;
                        let minDiff = Infinity;

                        for (const arr of lineArrivals) {
                            const arrTime = new Date(arr.expectedArrivalTime).getTime();
                            const diff = Math.abs(arrTime - item.targetTime);

                            if (diff < minDiff) {
                                minDiff = diff;
                                bestMatch = arr;
                            }
                        }

                        // Use 20 minutes (1200000 ms) as maximum drift threshold to avoid latching onto the next bus.
                        if (bestMatch && minDiff < 1200000) {
                            const expected = new Date(bestMatch.expectedArrivalTime);
                            const diffMs = expected.getTime() - Date.now();
                            const mins = Math.max(0, Math.floor(diffMs / 60000));

                            // Keep target time fresh in case the bus delays incrementally
                            item.targetTime = expected.getTime();

                            self.postMessage({
                                type: 'NOTIFICATION_UPDATE',
                                payload: {
                                    id,
                                    lineId: item.lineId,
                                    stopId: item.stopId,
                                    destination: bestMatch.destination || item.destination,
                                    minutesRemaining: mins,
                                    isEstimate: bestMatch.isEstimate || false,
                                    active: true,
                                    expected: bestMatch.expectedArrivalTime,
                                    targetTime: item.targetTime
                                }
                            });
                        } else {
                            // Bus disappeared or is too far -> arrived
                            self.postMessage({
                                type: 'NOTIFICATION_ARRIVED',
                                payload: { id, lineId: item.lineId, stopId: item.stopId }
                            });
                            trackedItems.delete(id);
                        }
                    } else {
                        // Bus disappeared -> arrived
                        self.postMessage({
                            type: 'NOTIFICATION_ARRIVED',
                            payload: { id, lineId: item.lineId, stopId: item.stopId }
                        });
                        trackedItems.delete(id);
                    }
                }
            }
        }

        if (trackedItems.size === 0) {
            stopTimer();
        }

    } catch (e) {
        console.error('Worker fetch error:', e);
    }
}
