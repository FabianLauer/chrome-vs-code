"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Returns the path to an internal route.
 * @param route The internal route to get the path to.
 */
function get(route) {
    return CHROME_VS_CODE_INTERNAL_ROUTE_MAP.get(route);
}
exports.default = get;
//# sourceMappingURL=internalRouteMapReader.js.map