/**
 * Utilities for reading /etc/hosts.
 */
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const fs = require('fs');
/**
 * Returns the path to the hosts file.
 */
function getPath() {
    switch (process.platform) {
        default:
            return '/etc/hosts';
        case 'win32':
            return 'C:/Windows/System32/drivers/etc/hosts';
    }
}
/**
 * Reads the hosts file and returns its content as a string.
 */
function readHostsFile() {
    return new Promise((resolve, reject) => {
        fs.readFile(getPath(), (err, content) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(content.toString());
        });
    });
}
/**
 * Returns a map of all hosts and the IPs they represent.
 */
function getHostsMap() {
    return __awaiter(this, void 0, void 0, function* () {
        const content = yield readHostsFile();
        const map = {};
        content.split(/\r?\n/).map(line => {
            // skip lines that are either ...
            if (
            // ... empty OR ...
            typeof line !== 'string' ||
                line.length === 0 ||
                // ... do not start with a colon or hex/int number
                (line[0] !== ':' && !/^[\da-f]/.test(line[0]))) {
                return;
            }
            // IPv4
            let parts = /(\d+\.\d+\.\d+\.\d+)\s+(.+)/.exec(line);
            if (Array.isArray(parts) && parts.length === 3) {
                return { host: parts[2], ip: parts[1] };
            }
            // IPv6
            parts = /((?:[a-f\d]*:{0,2})+)\s+(.+)/.exec(line);
            if (Array.isArray(parts) && parts.length === 3) {
                return { host: parts[2], ip: parts[1] };
            }
        }).filter(mapped => {
            return typeof mapped === 'object' && mapped !== null;
        }).forEach(({ host, ip }) => {
            host = host.trim();
            map[host] = map[host] || [];
            map[host].push(ip);
        });
        return map;
    });
}
exports.getHostsMap = getHostsMap;
//# sourceMappingURL=hosts.js.map