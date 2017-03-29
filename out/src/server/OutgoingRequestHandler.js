"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
/**
 * Protocol proxies are objects that a server can use to delegate requests to.
 * Depending on its protocol (http, https, file, etc), a request will be handed
 * to an instance of this class.
 */
class OutgoingRequestHandler {
    constructor(loggingFunction, fallbackResponder) {
        this.loggingFunction = loggingFunction;
        this.fallbackResponder = fallbackResponder;
    }
    /**
     * Handles an incoming request and responds to it.
     * @param virtualRequest The request data that the browser user gets to see.
     * @param request The incoming request that should be handled.
     * @param response The response to write to.
     */
    static handleRequest(virtualRequest, request, response, loggingFunction, fallbackResponder) {
        return __awaiter(this, void 0, void 0, function* () {
            const proxy = yield this.getProxy(virtualRequest, request, loggingFunction, fallbackResponder);
            if (!(proxy instanceof OutgoingRequestHandler)) {
                throw new Error('unable to handle request: no matching handler found');
            }
            return proxy.handleRequestConcrete(virtualRequest, request, response);
        });
    }
    /**
     * Decorator. Use this to register a protocol proxy for a certain request.
     * @param score A function that checks whether the decorated proxy is capable of handling
     *              a certain request. If two or more registered classes are capable to handle
     *              a request, the one with the highest score is used.
     */
    static register(score) {
        return (proxyClass) => {
            OutgoingRequestHandler.registry.set(score, proxyClass);
        };
    }
    /**
     * Returns a proxy that can handle a certain request.
     * @param request The request to get a proxy for.
     */
    static getProxy(virtualRequest, request, loggingFunction, fallbackResponder) {
        // find the best matching proxy by score
        var highest = {
            score: -Infinity,
            proxyClass: undefined
        };
        for (const registered of OutgoingRequestHandler.registry) {
            const score = registered[0](virtualRequest, request);
            if (score > highest.score) {
                highest.score = score;
                highest.proxyClass = registered[1];
            }
        }
        // if no matching proxy was found:
        if (highest.score < 1) {
            return undefined;
        }
        return new highest.proxyClass(loggingFunction, fallbackResponder);
    }
    /**
     * Logs a simple text message.
     * @param message The message to log.
     */
    log(message) {
        this.loggingFunction(message);
    }
    autoRespond(status, request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.fallbackResponder(status, request, response);
        });
    }
}
/**
 * Holds all classes that have registered using `ProtocolProxy.register()` along with their score functions.
 */
OutgoingRequestHandler.registry = new Map();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = OutgoingRequestHandler;
//
// import concrete classes:
//
require('./outgoingRequestHandler/Http');
require('./outgoingRequestHandler/File');
//# sourceMappingURL=OutgoingRequestHandler.js.map