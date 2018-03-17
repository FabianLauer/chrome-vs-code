"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const vscode = require('vscode');
const LogWriter_1 = require('./extension/LogWriter');
const BrowserBackend_1 = require('./extension/BrowserBackend');
const PreviewUriSchemePool_1 = require('./extension/PreviewUriSchemePool');
const port_1 = require('./extension/util/port');
const generateRouteMap_1 = require('./extension/util/generateRouteMap');
const createServer_1 = require('./createServer');
const registeredCommands = [];
const schemePool = new PreviewUriSchemePool_1.default('chromevscode');
/**
 * Contains all started browser backend instances.
 */
const backends = [];
const browserFileReader = {
    js: new createServer_1.StaticFileReader(`${__dirname}/browser.all.js`),
    css: new createServer_1.StaticFileReader(`${__dirname}/all.css`)
};
/**
 * **Do not use this variable directly. Use `getAboutPageReaders()` instead.**
 */
var aboutPageReaders;
function getAboutPageReaders() {
    return __awaiter(this, void 0, void 0, function* () {
        aboutPageReaders = aboutPageReaders || (yield createServer_1.generateAboutPageReaders());
        return aboutPageReaders;
    });
}
function startBackend(logWriter) {
    return __awaiter(this, void 0, void 0, function* () {
        const port = yield port_1.findFreePort();
        const map = generateRouteMap_1.generateSafeInternalRouteMap();
        const backend = new BrowserBackend_1.default(logWriter, port, map, schemePool.generatePreviewUriScheme(), browserFileReader.js, browserFileReader.css, yield getAboutPageReaders());
        yield backend.start();
        backends.push(backend);
        return backend;
    });
}
function openWebBrowser(logWriter, viewColumn) {
    return __awaiter(this, void 0, void 0, function* () {
        const backend = yield startBackend(logWriter);
        return vscode.commands.executeCommand('vscode.previewHtml', backend.getPreviewUri(), vscode.ViewColumn.Two, 'Web Browser');
    });
}
/**
 * Registers a command that can be invoked via a keyboard shortcut,
 * a menu item, an action, or directly.
 *
 * Registering a command with an existing command identifier twice
 * will cause an error.
 *
 * @param command A unique identifier for the command.
 * @param callback A command handler function.
 */
function registerCommand(context, commandName, callback) {
    const command = vscode.commands.registerCommand(commandName, callback);
    registeredCommands.push(command);
    // context.subscriptions.push(command, registration);
}
/**
 * Activates the extension.
 */
function activate(context) {
    // process.on('uncaughtException', err => {
    // 	console.warn(err);
    // });
    // process.on('unhandledRejection', err => {
    // 	console.warn(err);
    // });
    const logWriter = new LogWriter_1.default();
    registerCommand(context, 'extension.openWebBrowser', () => openWebBrowser(logWriter, vscode.ViewColumn.One));
    registerCommand(context, 'extension.openWebBrowserSplitView', () => openWebBrowser(logWriter, vscode.ViewColumn.Two));
}
exports.activate = activate;
/**
 * Deactivates the extension.
 */
function deactivate() {
    backends.forEach(backend => backend.dispose());
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map