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
const internalRouteMapReader_1 = require("./internalRouteMapReader");
const InternalRoute_1 = require("../server/InternalRoute");
const URLBar_1 = require("./URLBar");
const BrowserBar_1 = require("./BrowserBar");
const Viewport_1 = require("./Viewport");
const StatusIndicator_1 = require("./StatusIndicator");
const ResponseRendererFactory_1 = require("./ResponseRendererFactory");
const History_1 = require("./History");
const HistoryEntry_1 = require("./HistoryEntry");
const WritableBrowserConfig_1 = require("./WritableBrowserConfig");
const configSection = require("./BrowserConfigSection");
const prompts_1 = require("./webapi/prompts");
/**
 * The complete browser window, including browser bar and viewport.
 */
class BrowserWindow {
    constructor(config = new WritableBrowserConfig_1.default(), browserBar, viewport) {
        this.config = config;
        this.browserBar = browserBar;
        this.viewport = viewport;
        this.statusIndicator = new StatusIndicator_1.default();
        this.history = new History_1.default();
        this.autoToggleAddressBar = true;
        this.lastViewportScroll = {
            recordedTime: Date.now(),
            scrollY: 0
        };
        /**
         * This is `true` if the disclaimer prompt is currently visible.
         */
        this.disclaimerPromptVisible = false;
        this.browserBar = this.browserBar || new BrowserBar_1.default(new URLBar_1.default(this.config), dialog => this.renderDialog(dialog), url => this.load(url));
        this.history.push(new HistoryEntry_1.default('about://start', Date.now()));
        this.viewport = this.viewport || new Viewport_1.default(() => this.createFrameBindings());
        this.viewport.onBeginNavigation.bind(this.handleViewportBeginningNavigation.bind(this));
        this.viewport.onAfterNavigation.bind(this.handleViewportNavigating.bind(this));
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            // status indicator
            yield this.statusIndicator.render();
            document.body.appendChild(this.statusIndicator.getDOM());
            const statusIndicatorTicket = this.statusIndicator.show('initializing');
            // browser bar
            this.browserBar.urlBar.onChange.bind(() => __awaiter(this, void 0, void 0, function* () {
                this.load(yield this.browserBar.urlBar.getURL());
            }));
            this.browserBar.onHomeButtonPressed.bind(() => {
                this.load('about://home');
            });
            this.browserBar.onRefreshButtonPressed.bind(() => {
                this.load(this.history.getCurrent().uri);
            });
            this.browserBar.onNoCacheRefreshButtonPressed.bind(() => {
                this.load(this.history.getCurrent().uri);
            });
            this.browserBar.onBackButtonPressed.bind(() => __awaiter(this, void 0, void 0, function* () {
                yield this.history.goBack();
                this.load(this.history.getCurrent().uri);
            }));
            this.browserBar.onForwardButtonPressed.bind(() => __awaiter(this, void 0, void 0, function* () {
                yield this.history.goForward();
                this.load(this.history.getCurrent().uri);
            }));
            yield this.browserBar.render();
            this.updateHistoryButtons();
            document.body.appendChild(this.browserBar.getDOM());
            // browser viewport
            yield this.viewport.render();
            document.body.appendChild(this.viewport.getDOM());
            this.updateViewportHeight(false);
            this.viewport.onScroll.bind(this.handleViewportScroll.bind(this));
            // hide the status indicator
            this.statusIndicator.hide(statusIndicatorTicket);
            // resize the viewport when the window size changes
            window.addEventListener('resize', () => this.expandBrowserBar(false));
        });
    }
    getHistory() {
        return this.history;
    }
    loadInitialPage() {
        return __awaiter(this, void 0, void 0, function* () {
            // load the initial page
            let initialUrl = 'about://home';
            if (yield this.config.get(configSection.showWelcomePage)) {
                initialUrl = 'about://welcome';
            }
            yield this.load(initialUrl);
            yield this.updateBrowserConfigField('showWelcomePage', false);
        });
    }
    /**
     * Loads a URI and renders it in the browser.
     * @param uri The URI to load.
     */
    load(uri, deferHistoryUdpate = false) {
        return __awaiter(this, void 0, void 0, function* () {
            if (uri.trim() !== 'about://welcome' && !(yield this.ensureDisclaimerAccepted())) {
                return;
            }
            if (deferHistoryUdpate) {
                this.browserBar.showLoadingIndicator();
                this.statusIndicator.show(`loading...`);
            }
            else {
                this.history.push(new HistoryEntry_1.default(uri, Date.now()));
                this.updateHistoryButtons();
                yield this.browserBar.urlBar.setURL(uri);
                this.statusIndicator.show(`loading ${uri}`);
                yield this.browserBar.showLoadingProgress(10);
            }
            // refresh the `autoToggleAddressBar` config
            this.autoToggleAddressBar = yield this.config.get(configSection.autoToggleAddressBar);
            const collapseBrowserBar = this.isBrowserBarCollapsed() && this.autoToggleAddressBar;
            if (collapseBrowserBar) {
                this.expandBrowserBar(true);
            }
            const response = yield this.request(uri);
            const renderer = ResponseRendererFactory_1.default.getRenderer(this.viewport, response);
            const responseURI = response.getResponseHeader('actual-uri') || uri;
            let statusIndicatorTicket = this.statusIndicator.show(`rendering ${responseURI}`);
            // update the browser bar to the actual URL of the page we're now on
            if (deferHistoryUdpate) {
                this.browserBar.urlBar.setURL(responseURI, false);
                this.history.push(new HistoryEntry_1.default(responseURI, Date.now()));
                this.updateHistoryButtons();
            }
            else if (responseURI !== uri) {
                this.browserBar.urlBar.setURL(responseURI, false);
            }
            // render the actual response
            yield renderer.renderResponse(responseURI, response);
            // render the favicon
            const icon = yield renderer.generateFavicon(responseURI, response);
            if (typeof icon === 'string') {
                this.browserBar.urlBar.setFavicon(icon);
            }
            else {
                this.browserBar.urlBar.setFavicon(undefined);
            }
            yield this.browserBar.showLoadingProgress(100);
            yield this.browserBar.hideLoadingIndicator();
            this.statusIndicator.hide(statusIndicatorTicket);
            // collapse the browser bar if it was collapsed before loading started
            if (collapseBrowserBar) {
                yield this.collapseBrowserBar();
            }
        });
    }
    /**
     * Checks whether the browser bar is currently collapsed or expanded.
     */
    isBrowserBarCollapsed() {
        return this.browserBar.isCollapsed();
    }
    /**
     * Collapses the browser bar and returns when the animation is complete.
     */
    collapseBrowserBar() {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.browserBar.collapse(),
                this.viewport.updateHeight(document.body.getBoundingClientRect().height, true)
            ]);
        });
    }
    /**
     * Expands the browser bar and returns when the animation is complete.
     * @param overlayMode When `true`, the browser bar will open as an overlay.
     */
    expandBrowserBar(overlayMode = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const updateViewportHeight = overlayMode ?
                // in overlay mode, the viewport is at 100% height:
                () => this.viewport.updateHeight(document.body.getBoundingClientRect().height, true) :
                // if not in overlay mode, fit the viewport into available horizontal space:
                () => this.updateViewportHeight(true);
            yield Promise.all([
                this.browserBar.expand(),
                updateViewportHeight()
            ]);
        });
    }
    renderDialog(dialog) {
        return __awaiter(this, void 0, void 0, function* () {
            yield dialog.render();
            document.body.appendChild(dialog.getDOM());
        });
    }
    request(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const request = new XMLHttpRequest();
                request.onerror = reject;
                request.onreadystatechange = () => __awaiter(this, void 0, void 0, function* () {
                    if (request.readyState === XMLHttpRequest.DONE) {
                        yield this.browserBar.showLoadingProgress(90);
                        resolve(request);
                    }
                });
                request.onprogress = e => {
                    if (e.lengthComputable) {
                        this.browserBar.showLoadingProgress(((e.loaded / e.total) * 100) - 20);
                    }
                    else {
                        this.browserBar.showLoadingIndicator();
                    }
                };
                request.open('GET', `${internalRouteMapReader_1.default(InternalRoute_1.default.LoadBase)}?${escape(uri)}`, true);
                request.send();
            });
        });
    }
    /**
     * Presents the disclaimer to the user and asks to accept it.
     * Returns `true` when the user accepts it, `false` if not.
     */
    askToAcceptDisclaimer() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.disclaimerPromptVisible) {
                return;
            }
            this.disclaimerPromptVisible = true;
            const response = yield this.request('about://disclaimer');
            const accepted = yield prompts_1.internalConfirm(this, `Accept 'Chrome VS Code' Terms of Use to continue browsing`, response.responseText, true, 'Accept Terms of Use', 'Don\'t accept');
            this.disclaimerPromptVisible = false;
            return accepted;
        });
    }
    /**
     * Returns `true` when the user has accepted the disclaimer, `false` if not.
     */
    ensureDisclaimerAccepted() {
        return __awaiter(this, void 0, void 0, function* () {
            const notAccepted = () => {
                this.viewport.renderHTML('');
                this.browserBar.urlBar.setURL('about://welcome');
            };
            // disclaimer was already accepted
            if (yield this.config.get(configSection.disclaimerReadAndAccepted)) {
                return true;
            }
            // disclaimer was not accepted yet
            const accepted = yield this.askToAcceptDisclaimer();
            // update the browser config
            yield this.updateBrowserConfigField('disclaimerReadAndAccepted', accepted);
            if (!accepted) {
                notAccepted();
                return;
            }
            // Don't return the `accepted` value from above, but rather refresh the browser config
            // and return the config value from 'disclaimerReadAndAccepted'. This way, we can make
            // sure the config file is in sync.
            if (!(yield this.config.get(configSection.disclaimerReadAndAccepted))) {
                notAccepted();
                return false;
            }
            return true;
        });
    }
    updateHistoryButtons() {
        // forward button
        if (this.history.canGoForward()) {
            this.browserBar.enableHistoryForwardButton();
        }
        else {
            this.browserBar.disableHistoryForwardButton();
        }
        // back button
        if (this.history.canGoBackward()) {
            this.browserBar.enableHistoryBackButton();
        }
        else {
            this.browserBar.disableHistoryBackButton();
        }
    }
    updateViewportHeight(animated) {
        const bodyHeight = document.body.getBoundingClientRect().height;
        const browserBarHeight = this.browserBar.getDOM().getBoundingClientRect().height;
        this.viewport.updateHeight(bodyHeight - browserBarHeight, animated);
    }
    handleViewportScroll() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.autoToggleAddressBar) {
                return;
            }
            const now = Date.now();
            if (now - this.lastViewportScroll.recordedTime <= 300) {
                return;
            }
            const currentScrollY = this.viewport.getScroll().y;
            const threshold = this.viewport.getDOM().getBoundingClientRect().height / 10;
            if (Math.abs(currentScrollY - this.lastViewportScroll.scrollY) < threshold) {
                return;
            }
            // scrolling down:
            if (currentScrollY > this.lastViewportScroll.scrollY) {
                this.collapseBrowserBar();
            }
            else {
                // scrolling up:
                this.expandBrowserBar();
            }
            this.lastViewportScroll.recordedTime = now;
            this.lastViewportScroll.scrollY = currentScrollY;
        });
    }
    isInternalURL(url) {
        const getInternalRouteRegex = (routeIdentifier) => {
            const asString = internalRouteMapReader_1.default(routeIdentifier)
                .replace(/^\//, '')
                .replace(/\//, '\\/');
            return new RegExp(`${window.location.host}\/+${asString}`);
        };
        return (getInternalRouteRegex(InternalRoute_1.default.Load).test(url) ||
            getInternalRouteRegex(InternalRoute_1.default.LoadBase).test(url));
    }
    handleViewportBeginningNavigation() {
        return __awaiter(this, void 0, void 0, function* () {
            this.expandBrowserBar();
            this.browserBar.showLoadingIndicator();
        });
    }
    handleViewportNavigating(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            uri = unescape(uri || '');
            if (this.isInternalURL(uri)) {
                uri = uri.replace(/^.*?\?/, '');
            }
            yield this.load(uri, true);
        });
    }
    /**
     * Loads and returns the current browser configuration from the back end.
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
    updateBrowserConfigField(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.updateConfigField('chromevscode', key, value);
        });
    }
    createFrameBindings() {
        const browserWindow = this;
        class FrameBindings {
            /**
             * Initializes the frame's web API bindings.
             */
            initializeWebAPIs(frameWindow) {
                return __awaiter(this, void 0, void 0, function* () {
                    yield prompts_1.initialize(browserWindow, frameWindow);
                });
            }
            /**
             * Updates the browser location to another URI.
             * @param uri The URI to open.
             */
            load(uri) {
                return __awaiter(this, void 0, void 0, function* () {
                    return browserWindow.load(uri);
                });
            }
            /**
             * Attempts to show the address bar. Returns `true` when successful, `false` if not.
             */
            showAddressBar() {
                return __awaiter(this, void 0, void 0, function* () {
                    yield browserWindow.expandBrowserBar();
                    return true;
                });
            }
            /**
             * Attempts to hide the address bar. Returns `true` when successful, `false` if not.
             */
            hideAddressBar() {
                return __awaiter(this, void 0, void 0, function* () {
                    yield browserWindow.collapseBrowserBar();
                    return true;
                });
            }
        }
        class PrivilegedFrameBindings extends FrameBindings {
            /**
             * Returns the browser configuration as an object.
             */
            getConfiguration() {
                return __awaiter(this, void 0, void 0, function* () {
                    return browserWindow.loadBrowserConfig();
                });
            }
        }
        if (/^about:\/\//.test(this.history.getCurrent().uri)) {
            return new PrivilegedFrameBindings();
        }
        else {
            return new FrameBindings();
        }
    }
}
exports.default = BrowserWindow;
//# sourceMappingURL=BrowserWindow.js.map