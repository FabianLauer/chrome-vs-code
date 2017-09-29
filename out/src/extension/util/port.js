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
const net = require("net");
/**
 * Finds an unused network interface port.
 * @see https://gist.github.com/mikeal/1840641
 */
function findFreePort() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const port = Math.floor(Math.random() * 10000) + 8000;
            const server = net.createServer();
            server.on('error', () => __awaiter(this, void 0, void 0, function* () { return resolve(yield findFreePort()); }));
            server.listen(port, () => {
                server.once('close', () => resolve(port));
                server.close();
            });
        });
    });
}
exports.findFreePort = findFreePort;
//# sourceMappingURL=port.js.map