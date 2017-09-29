"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TypedSymbol_1 = require("../utils/TypedSymbol");
class BrowserConfigSectionSymbol extends TypedSymbol_1.default {
    /**
     * Creates a new typed symbol for a browser configuration section.
     */
    static create(name) {
        return new BrowserConfigSectionSymbol(name);
    }
}
exports.BrowserConfigSectionSymbol = BrowserConfigSectionSymbol;
/**
 * The URL of the browser's home page.
 */
exports.home = BrowserConfigSectionSymbol.create('home');
/**
 * Whether to automatically hide and show the address bar.
 */
exports.autoToggleAddressBar = BrowserConfigSectionSymbol.create('autoToggleAddressBar');
/**
 * Whether to show the welcome page instead of the home page when starting the browser.
 */
exports.showWelcomePage = BrowserConfigSectionSymbol.create('showWelcomePage');
/**
 * Whether the user has read the the disclaimer and terms of use and accepts them.
 */
exports.disclaimerReadAndAccepted = BrowserConfigSectionSymbol.create('disclaimerReadAndAccepted');
/**
 * A URL to search the web with.
 */
exports.webSearchURL = BrowserConfigSectionSymbol.create('webSearchURL');
//# sourceMappingURL=BrowserConfigSection.js.map