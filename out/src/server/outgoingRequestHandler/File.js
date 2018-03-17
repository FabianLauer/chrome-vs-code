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
const fs_1 = require('fs');
const mime = require('../util/mime');
/**
 * Request handler for `file://` URLs.
 */
let File_1 = class File extends OutgoingRequestHandler_1.default {
    /**
     * Handles an incoming request and responds to it.
     * @param virtualRequest The request data that the browser user gets to see.
     * @param request The incoming request that should be handled.
     * @param response The response to write to.
     */
    handleRequestConcrete(virtualRequest, request, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = url_1.parse(virtualRequest.url);
            const stats = yield File_1.stat(url.path);
            if (stats.isFile()) {
                return this.handleFileRequest(url, response);
            }
            else if (stats.isDirectory()) {
                return this.handleDirectoryRequest(url, response);
            }
            else {
                this.autoRespond(404, request, response);
            }
        });
    }
    handleDirectoryRequest(directoryURL, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const files = yield File_1.readDir(directoryURL.path);
            files.unshift('.', '..');
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/html');
            const fileListItems = files.map(file => {
                return `
				<li>
					<a href='file:///${directoryURL.path}/${file}/'>${file}</a>
				</li>
			`;
            }).join('');
            response.end(`
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset='utf-8'>
					<title>${directoryURL.path}</title>
				</head>
				<body>
					<ul>
						${fileListItems}
					</ul>
				</body>
			</html>
		`);
        });
    }
    handleFileRequest(fileURL, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const content = yield File_1.readFile(fileURL.path);
            response.statusCode = 200;
            response.setHeader('Content-Type', mime.lookup(fileURL.path));
            response.setHeader('Content-Disposition', `inline; filename="${fileURL.pathname}"`);
            response.end(content.toString('base64'));
        });
    }
    /**
     * Node.js `fs.stat`.
     */
    static stat(path) {
        return new Promise((resolve, reject) => {
            fs_1.stat(path, (err, stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(stats);
            });
        });
    }
    /**
     * Node.js `fs.readFile`.
     */
    static readFile(path) {
        return new Promise((resolve, reject) => {
            fs_1.readFile(path, (err, content) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(content);
            });
        });
    }
    /**
     * Node.js `fs.readdir`.
     */
    static readDir(path) {
        return new Promise((resolve, reject) => {
            fs_1.readdir(path, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(files);
            });
        });
    }
};
let File = File_1;
File = File_1 = __decorate([
    OutgoingRequestHandler_1.default.register((virtualRequest, request) => {
        const protocol = url_1.parse(virtualRequest.url).protocol;
        return protocol === 'file:' ? 1 : 0;
    })
], File);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = File;
//# sourceMappingURL=File.js.map