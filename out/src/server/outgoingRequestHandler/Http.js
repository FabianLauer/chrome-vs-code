"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const OutgoingRequestHandler_1 = require('../OutgoingRequestHandler');
const url_1 = require('url');
/**
 * Request handler for `http://` and `https://` URLs.
 */
let Http = class Http extends OutgoingRequestHandler_1.default {
    /**
     * Handles an incoming request and responds to it.
     * @param virtualRequest The request data that the browser user gets to see.
     * @param request The incoming request that should be handled.
     * @param response The response to write to.
     */
    handleRequestConcrete(virtualRequest, request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                var requestFn = require('follow-redirects').http.get;
                const parsedRequestURL = url_1.parse(virtualRequest.url);
                if (parsedRequestURL.protocol === 'https:') {
                    requestFn = require('follow-redirects').https.get;
                }
                delete request.headers.referer;
                delete request.headers.Referer;
                delete request.headers.host;
                delete request.headers.Host;
                delete request.headers.cookie;
                delete request.headers.Cookie;
                request.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36';
                const options = {
                    hostname: parsedRequestURL.hostname,
                    path: parsedRequestURL.path,
                    port: parseInt(parsedRequestURL.port, 10),
                    headers: request.headers
                };
                const clientRequest = requestFn(options, clientResponse => {
                    response.statusCode = clientResponse.statusCode;
                    response.setHeader('actual-uri', clientResponse.responseUrl);
                    delete clientResponse.headers['x-frame-options'];
                    delete clientResponse.headers['content-security-policy'];
                    for (const headerName in clientResponse.headers) {
                        response.setHeader(headerName, clientResponse.headers[headerName]);
                    }
                    this.log(`[proxy: ${clientResponse.statusCode}] ${virtualRequest.url}`);
                    clientResponse.on('data', (data) => response.write(data));
                    clientResponse.on('end', () => response.end());
                    resolve();
                });
                clientRequest.on('error', (error) => {
                    if (typeof error === 'object' &&
                        (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')) {
                        this.autoRespond(404, request, response);
                    }
                    else {
                        this.autoRespond(500, request, response);
                        ;
                    }
                    this.log(`[proxy: error] ${virtualRequest.url} : ${error.toString()}`);
                });
                clientRequest.end();
            });
        });
    }
};
Http = __decorate([
    OutgoingRequestHandler_1.default.register((virtualRequest, request) => {
        const protocol = url_1.parse(virtualRequest.url).protocol;
        return protocol === 'http:' || protocol === 'https:' ? 1 : 0;
    })
], Http);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Http;
//# sourceMappingURL=Http.js.map