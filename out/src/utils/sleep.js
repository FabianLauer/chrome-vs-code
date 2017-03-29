"use strict";
/**
 * Resolves a promise after a given number of milliseconds.
 * @param milliseconds The number of milliseconds to wait before resolving the returned promise.
 */
function sleep(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = sleep;
//# sourceMappingURL=sleep.js.map