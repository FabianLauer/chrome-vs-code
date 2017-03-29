"use strict";
const crypto_1 = require('crypto');
const InternalRoute_1 = require('../../server/InternalRoute');
/**
 * Generates a random sha hash.
 */
function generateRandomHash() {
    return '/' + crypto_1.createHash('sha256').update(Math.random() + Date.now().toString(32)).digest('hex');
}
/**
 * Generates a route map with URLs that are almost impossible to be found by websites hosted by this browser.
 */
function generateSafeInternalRouteMap() {
    const map = new Map();
    for (const keyAsString in InternalRoute_1.default) {
        const key = parseInt(keyAsString, 10);
        // skipt enum literals, use only the numeric keys
        if (isNaN(key) || !isFinite(key) || typeof key !== 'number') {
            continue;
        }
        // generate a random hash for the URL and prepend a slash so the server can resolve it
        let hash;
        const ensureUnique = () => {
            hash = generateRandomHash();
            for (const value of map.values()) {
                if (hash === value) {
                    ensureUnique();
                    return;
                }
            }
        };
        ensureUnique();
        // actually update the hash
        map.set(key, hash);
    }
    return map;
}
exports.generateSafeInternalRouteMap = generateSafeInternalRouteMap;
//# sourceMappingURL=generateRouteMap.js.map