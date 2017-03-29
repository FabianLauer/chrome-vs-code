"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const internalRouteMapReader_1 = require('./internalRouteMapReader');
const InternalRoute_1 = require('../server/InternalRoute');
class ReadonlyBrowserConfig {
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.loadBrowserConfig();
            return config[key.name];
        });
    }
    /**
     * Loads and returns the complete browser configuration from the back end.
     */
    loadBrowserConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        resolve(JSON.parse(request.responseText));
                    }
                };
                request.open('GET', internalRouteMapReader_1.default(InternalRoute_1.default.ConfigRead), true);
                request.send();
            });
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReadonlyBrowserConfig;
//# sourceMappingURL=ReadonlyBrowserConfig.js.map