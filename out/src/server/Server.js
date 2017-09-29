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
const HTTPServer_1 = require("./HTTPServer");
const InternalRoute_1 = require("./InternalRoute");
const OutgoingRequestHandler_1 = require("./OutgoingRequestHandler");
const hosts_1 = require("./util/hosts");
const url_1 = require("url");
/* tslint:disable:no-var-requires */
const normalizeStringUrl = require('normalize-url');
function normalizeUrl(url) {
    if (typeof url !== 'string') {
        url = url_1.format(url);
    }
    return normalizeStringUrl(url);
}
class Server {
    /**
     * @param internalRouteMap Maps internal route IDs to the URLs under which they can be found.
     * @param browserJS An object that reads the main JS file for the browser client.
     * @param browserCSS An object that reads the main CSS file for the browser client.
     * @param aboutPages An array containing readers for the `about:` pages.
     * @param logFunction A function that performs message logging.
     * @param getConfig A function that returns an object with browser configuration data.
     * @param updateConfig A function that updates the browser configuration.
     */
    constructor(internalRouteMap, browserJS, browserCSS, aboutPages, logFunction, getConfig, updateConfig) {
        this.internalRouteMap = internalRouteMap;
        this.browserJS = browserJS;
        this.browserCSS = browserCSS;
        this.aboutPages = aboutPages;
        this.logFunction = logFunction;
        this.getConfig = getConfig;
        this.updateConfig = updateConfig;
        this.httpServer = new HTTPServer_1.default(this.handle404.bind(this), this.handle500.bind(this), error => {
            this.log(`ERROR: ${error}`);
        });
        this.httpServer.addHandler(HTTPServer_1.default.createURLFromString('/'), (request, response) => {
            this.respondTo404(response);
        });
        this.httpServer.addHandler(this.getInternalRoutePath(InternalRoute_1.default.BrowserHTML), (request, response) => {
            response.statusCode = 200;
            let mapTransportScript = `
				var map = new Map();
			`;
            for (const entry of this.internalRouteMap.entries()) {
                mapTransportScript += `map.set(${entry[0]}, '${entry[1]}');\n`;
            }
            response.end(`
				<!DOCTYPE html>
				<html>
					<head>
						<meta charset="utf-8" />
					</head>
					<body class="vscode-light">
						<link rel="stylesheet" type="text/css" href="${this.internalRouteMap.get(InternalRoute_1.default.BrowserCSS)}">
						<script>
							(function() {
								'use strict';
								${mapTransportScript}
								window.CHROME_VS_CODE_INTERNAL_ROUTE_MAP = map;
							}());
						</script>
						<script src="${this.internalRouteMap.get(InternalRoute_1.default.BrowserJS)}"></script>
					</body>
				</html>
			`);
        });
        this.createFileReaderRoute(InternalRoute_1.default.BrowserJS, 'text/javascript', this.browserJS);
        this.createFileReaderRoute(InternalRoute_1.default.BrowserCSS, 'text/css', this.browserCSS);
        const createProxyHandler = (base) => {
            return (request, response) => __awaiter(this, void 0, void 0, function* () {
                var query = unescape(HTTPServer_1.default.createURLFromString(request.url).query.replace(/\?/, ''));
                const url = this.convert(HTTPServer_1.default.createURLFromString(query));
                // normalize the URL
                query = normalizeUrl(url);
                if (base) {
                    this.previousBaseURL = `${url.protocol}//${url.host}/`;
                }
                yield this.delegateToProxy(query, request, response);
            });
        };
        this.httpServer.addHandler(this.getInternalRoutePath(InternalRoute_1.default.Load), createProxyHandler(false));
        this.httpServer.addHandler(this.getInternalRoutePath(InternalRoute_1.default.LoadBase), createProxyHandler(true));
        this.httpServer.addHandler(this.getInternalRoutePath(InternalRoute_1.default.ConfigRead), (request, response) => __awaiter(this, void 0, void 0, function* () {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/json');
            response.end(JSON.stringify(yield this.getConfig()));
        }));
        this.httpServer.addHandler(this.getInternalRoutePath(InternalRoute_1.default.ConfigWrite), (request, response) => __awaiter(this, void 0, void 0, function* () {
            const parsedURL = HTTPServer_1.default.createURLFromString(request.url);
            const data = JSON.parse(unescape(parsedURL.query));
            if (typeof data !== 'object' || data === null || Object.keys(data).length === 0) {
                this.log('blocked invalid request to update config');
                this.respondTo500(response);
            }
            yield this.updateConfig(data);
            response.statusCode = 200;
            response.end();
        }));
        this.httpServer.addHandler(this.getInternalRoutePath(InternalRoute_1.default.Hosts), (request, response) => __awaiter(this, void 0, void 0, function* () {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/json');
            response.end(JSON.stringify(yield hosts_1.getHostsMap()));
        }));
    }
    /**
     * Starts the server.
     * @param hostname The hostname to listen to.
     * @param port The port to listen to.
     */
    start(hostname, port) {
        return __awaiter(this, void 0, void 0, function* () {
            this.log('starting...');
            yield this.httpServer.listen(hostname, port);
            this.log('...started!');
        });
    }
    /**
     * Stops the server.
     */
    stop() {
        this.log('stopping...');
        this.httpServer.stop();
        this.log('...stopped!');
    }
    /**
     * Checks if this server is listening to a certain URL.
     */
    isListeningTo(url) {
        if (typeof url === 'string') {
            url = HTTPServer_1.default.createURLFromString(url);
        }
        // If the URL contains a port, check if the URL is actually an URL our HTTP server is listening to. If that's the case,
        // cancel the request immediately.
        if (typeof url.port === 'string' && url.port.length > 0 &&
            this.httpServer.isListeningTo(url.hostname, parseInt(url.port, 10))) {
            return true;
        }
    }
    /**
     * Returns the URL to an internal route.
     */
    getInternalRoutePath(route) {
        return HTTPServer_1.default.createURLFromString(this.internalRouteMap.get(route));
    }
    convert(url) {
        if (typeof url === 'string') {
            url = HTTPServer_1.default.createURLFromString(url);
        }
        if (typeof this.previousBaseURL !== 'string' ||
            this.previousBaseURL.length < 1 ||
            !this.isListeningTo(url)) {
            return url;
        }
        const previousBaseURL = HTTPServer_1.default.createURLFromString(this.previousBaseURL);
        url.protocol = previousBaseURL.protocol;
        url.host = previousBaseURL.host;
        url.port = previousBaseURL.port;
        return url;
    }
    /**
     * Simple logging utility.
     */
    log(message) {
        this.logFunction(`(server) ${message || 'empty message'} \n`);
    }
    /**
     * Creates a request handler for a certain URL that will respond the content of
     * a given file reader object. The response status code will always be `200`.
     * @param url The URL to create the handler for.
     * @param contentType The value of the content type header to respond.
     * @param reader The object to read the response text for.
     */
    createFileReaderRoute(route, contentType, reader) {
        this.httpServer.addHandler(this.getInternalRoutePath(route), (request, response) => __awaiter(this, void 0, void 0, function* () {
            response.statusCode = 200;
            response.setHeader('Content-Type', contentType);
            response.end(yield reader.getContent());
        }));
    }
    respondWithStatusCodeAboutPage(statusCode, response) {
        return __awaiter(this, void 0, void 0, function* () {
            response.statusCode = statusCode;
            response.setHeader('Content-Type', 'text/html');
            const page = this.aboutPages.find(aboutPage => aboutPage.name === statusCode.toString());
            if (typeof page === 'object' && page !== null) {
                response.end(yield page.reader.getContent());
            }
            else {
                response.end();
            }
        });
    }
    respondTo404(response) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.respondWithStatusCodeAboutPage(404, response);
        });
    }
    respondTo500(response) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.respondWithStatusCodeAboutPage(500, response);
        });
    }
    /**
     * Handles 404 errors from `this.httpServer`.
     */
    handle404(request, response) {
        if (typeof this.previousBaseURL === 'string' && !(/^[a-z]+:\//.test(request.url))) {
            const url = normalizeUrl(HTTPServer_1.default.createURLFromString(`${this.previousBaseURL}/${request.url}`));
            this.log(`[404 -> proxy]: ${url}`);
            this.delegateToProxy(url, request, response);
        }
        else {
            this.log(`[404]: ${HTTPServer_1.default.urlToString(request.url)}`);
            this.respondTo404(response);
        }
    }
    /**
     * Handles 500 errors from `this.httpServer`.
     */
    handle500(error, request, response) {
        this.log(`[500]: ${HTTPServer_1.default.urlToString(request.url)}: ${error}`);
        this.respondTo500(response);
    }
    delegateToProxy(requestURL, request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isListeningTo(requestURL)) {
                return this.respondTo404(response);
            }
            const parsedURL = HTTPServer_1.default.createURLFromString(requestURL);
            switch (parsedURL.protocol) {
                case 'about:':
                    return this.delegateToAboutProxy(requestURL, request, response);
                default:
                    const virtualRequest = {
                        url: requestURL
                    };
                    try {
                        yield OutgoingRequestHandler_1.default.handleRequest(virtualRequest, request, response, message => this.log(message), (status) => {
                            switch (status) {
                                default:
                                    return this.respondTo500(response);
                                case 404:
                                    return this.respondTo404(response);
                            }
                        });
                    }
                    catch (err) {
                        this.respondTo500(response);
                    }
            }
        });
    }
    delegateToAboutProxy(requestURL, request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const name = requestURL.replace(/^about:\/+/, '');
            const page = this.aboutPages.find(aboutPage => aboutPage.name === name);
            if (typeof page !== 'object' || page === null) {
                yield this.respondTo404(response);
            }
            else {
                response.statusCode = 200;
                response.end(yield page.reader.getContent());
            }
            this.log(`[about: ${response.statusCode}] ${requestURL}`);
        });
    }
}
exports.default = Server;
//# sourceMappingURL=Server.js.map