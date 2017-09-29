"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const url_1 = require("url");
class BrowserConfiguration {
    constructor(home, autoToggleAddressBar, showWelcomePage, disclaimerReadAndAccepted, webSearchURL) {
        this.home = home;
        this.autoToggleAddressBar = autoToggleAddressBar;
        this.showWelcomePage = showWelcomePage;
        this.disclaimerReadAndAccepted = disclaimerReadAndAccepted;
        this.webSearchURL = webSearchURL;
    }
    /**
     * Creates a browser configuration object using the VS Code workspace configuration.
     */
    static createFromWorkspaceConfig() {
        return new BrowserConfiguration(BrowserConfiguration.getWorkspaceConfigOrFallback('home', BrowserConfiguration.isValidURL), BrowserConfiguration.getWorkspaceConfigOrFallback('autoToggleAddressBar', BrowserConfiguration.isTypeof('boolean')), BrowserConfiguration.getWorkspaceConfigOrFallback('showWelcomePage', BrowserConfiguration.isTypeof('boolean')), BrowserConfiguration.getWorkspaceConfigOrFallback('disclaimerReadAndAccepted', BrowserConfiguration.isTypeof('boolean')), BrowserConfiguration.getWorkspaceConfigOrFallback('webSearchURL', BrowserConfiguration.isTypeof('string')));
    }
    /**
     * Creates a function that checks if the `typeof` operation evaluates an expected result.
     */
    static isTypeof(typeName) {
        return value => typeof value === typeName;
    }
    /**
     * Checks if a URL can be opened.
     */
    static isValidURL(url) {
        const parsed = url_1.parse(url);
        return typeof parsed.hostname === 'string';
    }
    static getWorkspaceConfigOrFallback(name, validator) {
        const workspaceConfig = vscode.workspace.getConfiguration('chromevscode');
        const value = workspaceConfig.get(name);
        if (validator(value)) {
            return value;
        }
        return BrowserConfiguration.defaultConfig[name];
    }
}
/**
 * A browser configuration with fallback values.
 */
BrowserConfiguration.defaultConfig = new BrowserConfiguration('http://code.visualstudio.com', true, true, false, 'http://www.google.com/search?q=${searchTerm}');
exports.default = BrowserConfiguration;
//# sourceMappingURL=BrowserConfiguration.js.map