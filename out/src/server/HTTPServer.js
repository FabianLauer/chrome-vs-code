"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const http = require('http');
const url_1 = require('url');
/**
 * Base class for an HTTP server.
 */
class HTTPServer {
    /**
     * Creates a new server instance.
     * @param handle404 A request handler that is called if no handler can be found for a request URL.
     * @param handle500 A request handler that is called if another request handler throws an error.
     * @param handleError A function that is called when errors occur that can not be handled using `handle500`.
     */
    constructor(handle404, handle500, handleError) {
        this.handle404 = handle404;
        this.handle500 = handle500;
        this.handleError = handleError;
        this.servers = [];
        /**
         * All of the server's request handler functions by URL.
         */
        this.handlers = {};
    }
    /**
     * Converts a URL object to a string as used by `HTTPServer`.
     * @param url The URL to convert to a string.
     */
    static urlToString(url) {
        if (typeof url === 'string') {
            url = url_1.parse(url);
        }
        return url.pathname;
    }
    /**
     * Creates a URL object compatible with `HTTPServer` from a string.
     */
    static createURLFromString(url) {
        return url_1.parse(url);
    }
    /**
     * Checks if the server is listening to a certain address.
     */
    isListeningTo(hostname, port) {
        hostname = hostname.trim();
        return -1 !== this.servers.findIndex(server => {
            const address = server.address();
            if (address.port !== port) {
                return false;
            }
            if (hostname === address.address ||
                (hostname === 'localhost' && address.address === '127.0.0.1') ||
                (hostname === '127.0.0.1' && address.address === 'localhost')) {
                return true;
            }
            return false;
        });
    }
    /**
     * Lets the server listen to a certain hostname and port.
     * @param hostname The hostname to listen to.
     * @param port The port to listen to.
     */
    listen(hostname, port) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                // create the server
                const server = http.createServer((request, response) => __awaiter(this, void 0, void 0, function* () {
                    // delegate incoming requests
                    const handler = this.getHandlerForURL(url_1.parse(request.url), true);
                    try {
                        yield handler.call(this, request, response);
                    }
                    catch (err) {
                        yield this.handle500.call(this, err, request, response);
                    }
                }));
                server.on('error', this.handleError);
                // start the server, resolve the promise when the server was actually started
                server.listen(port, hostname, () => {
                    this.servers.push(server);
                    resolve();
                });
            });
        });
    }
    /**
     * Stops listening to all open sockets.
     */
    stop() {
        this.servers.forEach(server => server.destroy());
    }
    /**
     * Checks if there's a request handler for a certain URL.
     * @param url The URL to check.
     */
    hasHandlerForURL(url) {
        return typeof this.getHandlerForURL(url, false) === 'function';
    }
    /**
     * Register a request handler for a certain request URL. Throws an exception if there's already
     * a request handler for the given URL.
     * @param url The URL to listen to, for example '/alpha/beta'.
     * @param handler A function that handles the request.
     */
    addHandler(url, handler) {
        if (this.hasHandlerForURL(url)) {
            throw new Error(`can not add request handler: URL '${HTTPServer.urlToString(url)}' already has a handler`);
        }
        this.handlers[HTTPServer.urlToString(url)] = handler;
    }
    /**
     * Unregister a request handler for a certain request URL. Throws an exception if there's no
     * request handler for the given URL.
     * @param url The URL to remove the handler for, for example '/alpha/beta'.
     */
    removeHandlerForURL(url) {
        if (!this.hasHandlerForURL(url)) {
            throw new Error(`can not remove request handler: URL '${HTTPServer.urlToString(url)}' does not have a handler`);
        }
        delete this.handlers[HTTPServer.urlToString(url)];
    }
    /**
     * Checks if there's a request handler for a certain URL.
     * @param url The URL to return the handler function for.
     * @param fallbackTo404 When `true`, the method returns the server's 404 handler if no handler
     *                      for the given URL is found.
     */
    getHandlerForURL(url, fallbackTo404) {
        const handler = this.handlers[HTTPServer.urlToString(url)];
        // fallback to 404 handler if allowed and necessary
        if (fallbackTo404 && typeof handler !== 'function') {
            return this.handle404;
        }
        return handler;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HTTPServer;
//# sourceMappingURL=HTTPServer.js.map