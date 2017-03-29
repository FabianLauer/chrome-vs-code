"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const vscode_1 = require('vscode');
const Server_1 = require('../server/Server');
const BrowserConfiguration_1 = require('./BrowserConfiguration');
const TextDocumentContentProvider_1 = require('./TextDocumentContentProvider');
class BrowserBackend extends vscode_1.Disposable {
    /**
     * Creates a new backend instance.
     * @param logWriter An object to write log messages with.
     * @param serverPort The port the backend's server should to listen to.
     * @param internalRouteMap All internal route mappings. Optional.
     * @param previewUri The VS Code preview URI scheme to use for this backend instance, for example 'chromevscode001'.
     */
    constructor(logWriter, serverPort, internalRouteMap, previewUriScheme, browserJsFileReader, browserCssFileReader, aboutPageReaders) {
        super(() => {
            if (this.isStarted()) {
                this.stop();
            }
            this.documentContentProvider = undefined;
            this.documentContentProviderRegistration.dispose();
            this.documentContentProviderRegistration = undefined;
            delete this.logWriter;
            delete this.serverPort;
            delete this.internalRouteMap;
            delete this.previewUriScheme;
        });
        this.logWriter = logWriter;
        this.serverPort = serverPort;
        this.internalRouteMap = internalRouteMap;
        this.previewUriScheme = previewUriScheme;
        this.browserJsFileReader = browserJsFileReader;
        this.browserCssFileReader = browserCssFileReader;
        this.aboutPageReaders = aboutPageReaders;
        this.started = false;
        this.previewUri = vscode_1.Uri.parse(`${this.previewUriScheme}://`);
    }
    getPreviewUri() {
        return this.previewUri;
    }
    isStarted() {
        return this.started;
    }
    /**
     * Stops the backend instance.
     */
    stop() {
        if (!this.isStarted()) {
            throw new Error('cannot stop backend: not started yet');
        }
        this.started = false;
        this.logWriter.writeLine(`stopping backend for ${this.previewUriScheme}:// at port ${this.serverPort}`);
        this.server.stop();
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isStarted()) {
                throw new Error('cannot start backend: already started');
            }
            this.started = true;
            this.logWriter.writeLine(`starting backend for ${this.previewUriScheme}:// at port ${this.serverPort}`);
            this.setupDocumentContentProvider();
            yield this.startServer();
        });
    }
    setupDocumentContentProvider() {
        if (!(this.documentContentProvider instanceof TextDocumentContentProvider_1.default)) {
            this.documentContentProvider = new TextDocumentContentProvider_1.default(this.serverPort, this.internalRouteMap);
            this.documentContentProvider.update(this.getPreviewUri());
        }
        this.documentContentProviderRegistration =
            this.documentContentProviderRegistration ||
                vscode_1.workspace.registerTextDocumentContentProvider(this.previewUriScheme, this.documentContentProvider);
    }
    /**
     * Start's the backend's server.
     */
    startServer() {
        return __awaiter(this, void 0, void 0, function* () {
            this.server = new Server_1.default(this.internalRouteMap, this.browserJsFileReader, this.browserCssFileReader, this.aboutPageReaders, this.logWriter.writeLine.bind(this.logWriter), BrowserConfiguration_1.default.createFromWorkspaceConfig, (data) => __awaiter(this, void 0, void 0, function* () {
                this.logWriter.writeLine('updating browser config:', JSON.stringify(data));
                for (const section in data) {
                    /// TODO: Find out why the `udpate` method is missing in the `WorkspaceConfiguration` declaration.
                    const workspaceConfig = vscode_1.workspace.getConfiguration(section);
                    for (const key in data[section]) {
                        yield workspaceConfig.update(
                        // config name
                        key, 
                        // config value
                        data[section][key], 
                        // global = true
                        true);
                    }
                }
            }));
            yield this.server.start('localhost', this.serverPort);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BrowserBackend;
//# sourceMappingURL=BrowserBackend.js.map