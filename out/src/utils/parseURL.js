"use strict";
/**
 * Parses a URL into its parts. **Requires the DOM to work.**
 * @param url The URL to parse.
 */
function parseURL(url) {
    var link = document.createElement('a');
    link.href = url;
    let path = link.pathname;
    if (/\.[a-z0-9_-]+$/i.test(path)) {
        path = path.split('/').slice(0, -1).join('/') + '/';
    }
    return {
        protocol: link.protocol,
        host: link.host,
        hostname: link.hostname,
        pathname: link.pathname,
        path,
        search: link.search,
        hash: link.hash
    };
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseURL;
;
//# sourceMappingURL=parseURL.js.map