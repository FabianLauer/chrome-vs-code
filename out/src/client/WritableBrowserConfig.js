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
const ReadonlyBrowserConfig_1 = require('./ReadonlyBrowserConfig');
class WritableBrowserConfig extends ReadonlyBrowserConfig_1.default {
    set(key, value) {
        return this.updateConfigField('chromevscode', key.name, value);
    }
    updateConfig(config) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        resolve();
                    }
                };
                request.open('GET', `${internalRouteMapReader_1.default(InternalRoute_1.default.ConfigWrite)}?${escape(JSON.stringify(config))}`, true);
                request.send();
            });
        });
    }
    updateConfigField(section, key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const object = {};
            object[section] = {};
            object[section][key] = value;
            return this.updateConfig(object);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WritableBrowserConfig;
//# sourceMappingURL=WritableBrowserConfig.js.map