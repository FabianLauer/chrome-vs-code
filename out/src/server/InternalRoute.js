"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var InternalRoute;
(function (InternalRoute) {
    /**
     * The browser front end's main HTML file.
     */
    InternalRoute[InternalRoute["BrowserHTML"] = 1] = "BrowserHTML";
    /**
     * The browser front end's main CSS file.
     */
    InternalRoute[InternalRoute["BrowserCSS"] = 2] = "BrowserCSS";
    /**
     * The browser front end's main JS file.
     */
    InternalRoute[InternalRoute["BrowserJS"] = 3] = "BrowserJS";
    /**
     * The URL to the loader API.
     */
    InternalRoute[InternalRoute["Load"] = 4] = "Load";
    /**
     * The URL to the page loader API.
     */
    InternalRoute[InternalRoute["LoadBase"] = 5] = "LoadBase";
    /**
     * The URL to the config reader.
     */
    InternalRoute[InternalRoute["ConfigRead"] = 6] = "ConfigRead";
    /**
     * The URL to the config writer.
     */
    InternalRoute[InternalRoute["ConfigWrite"] = 7] = "ConfigWrite";
    /**
     * The URL to the hostnames API.
     */
    InternalRoute[InternalRoute["Hosts"] = 8] = "Hosts";
})(InternalRoute || (InternalRoute = {}));
exports.default = InternalRoute;
//# sourceMappingURL=InternalRoute.js.map