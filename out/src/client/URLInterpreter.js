"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const internalRouteMapReader_1 = require("./internalRouteMapReader");
const InternalRoute_1 = require("../server/InternalRoute");
const configSection = require("./BrowserConfigSection");
/**
 * URL interpreters are objects that
 */
class URLInterpreter {
    /**
     * Creates a new `URLInterpreter`.
     * @param config A browser configuration reader.
     */
    constructor(config) {
        this.config = config;
    }
    /**
     * @param urlString The URL to interpret.
     */
    interpret(urlString) {
        return __awaiter(this, void 0, void 0, function* () {
            urlString = urlString.trim();
            const url = url_1.parse(urlString);
            if (typeof url.protocol === 'string') {
                return url_1.format(url);
            }
            // There's no protocol. Return a web search URL if:
            if (
            // the input isn't defined as a hostname in the system OR
            !(yield URLInterpreter.isKnownHostName(urlString)) ||
                // there's any whitespace in the URL
                /\s/g.test(decodeURIComponent(url.path))) {
                return this.getSearchURL(urlString);
            }
            // No protocol and no spaces. Remove all protocol-like content at the
            // beginning of the string, then prepend `http://` and return.
            urlString = urlString.replace(/^[a-z]*\:?\/+/, '');
            return `http://${urlString}`;
        });
    }
    /**
     * Returns a URL to a web search.
     * @param search The text to search for.
     */
    getSearchURL(search) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = yield this.config.get(configSection.webSearchURL);
            return url.replace(/\${searchTerm}/g, encodeURIComponent(search));
        });
    }
    static isKnownHostName(str) {
        return __awaiter(this, void 0, void 0, function* () {
            const map = yield URLInterpreter.loadHostsMap();
            return Array.isArray(map[str]) && map[str].length > 0;
        });
    }
    static loadHostsMap() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        resolve(JSON.parse(request.responseText));
                    }
                };
                request.open('GET', internalRouteMapReader_1.default(InternalRoute_1.default.Hosts), true);
                request.send();
            });
        });
    }
}
exports.default = URLInterpreter;
//# sourceMappingURL=URLInterpreter.js.map