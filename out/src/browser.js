"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const BrowserWindow_1 = require('./client/BrowserWindow');
// Import the theme file. We don't need to import any symbols, the file takes care of that itself.
require('./client/theme');
(() => __awaiter(this, void 0, void 0, function* () {
    const browser = new BrowserWindow_1.default();
    yield browser.render();
    yield browser.loadInitialPage();
}))();
//# sourceMappingURL=browser.js.map