"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const IconButton_1 = require('./IconButton');
const MainMenuDialog_1 = require('./MainMenuDialog');
const event_1 = require('../utils/event');
const utils_1 = require('../utils');
/**
 * Controller for the browser top bar.
 */
class BrowserBar {
    constructor(urlBar, renderDialog, openURL) {
        this.urlBar = urlBar;
        this.renderDialog = renderDialog;
        this.openURL = openURL;
        /**
         * Triggered when the browser bar's 'go back' navigation button was pressed.
         */
        this.onBackButtonPressed = new event_1.Event();
        /**
         * Triggered when the browser bar's 'go forward' navigation button was pressed.
         */
        this.onForwardButtonPressed = new event_1.Event();
        /**
         * Triggered when the browser bar's 'go home' navigation button was pressed.
         */
        this.onHomeButtonPressed = new event_1.Event();
        /**
         * Triggered when the browser bar's 'refresh' navigation button was pressed.
         */
        this.onRefreshButtonPressed = new event_1.Event();
        /**
         * Triggered when the browser bar's 'refresh without cache' navigation button was pressed.
         */
        this.onNoCacheRefreshButtonPressed = new event_1.Event();
        this.outerElement = document.createElement('div');
        this.innerWrapper = document.createElement('div');
        this.backButton = new IconButton_1.default();
        this.forwardButton = new IconButton_1.default();
        this.homeButton = new IconButton_1.default();
        this.refreshButton = new IconButton_1.default();
        this.menuButton = new IconButton_1.default();
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('browser-bar');
            this.innerWrapper.classList.add('browser-bar-wrapper');
            this.outerElement.appendChild(this.innerWrapper);
            // 'go back' button
            yield this.backButton.render();
            this.backButton.setIconAsText('←');
            this.innerWrapper.appendChild(this.backButton.getDOM());
            this.backButton.onClick.bind(() => this.onBackButtonPressed.trigger());
            // 'go forward' button
            yield this.forwardButton.render();
            this.forwardButton.setIconAsText('→');
            this.innerWrapper.appendChild(this.forwardButton.getDOM());
            this.forwardButton.onClick.bind(() => this.onForwardButtonPressed.trigger());
            // 'refresh' button
            yield this.refreshButton.render();
            this.refreshButton.setIconAsText('⟳');
            this.innerWrapper.appendChild(this.refreshButton.getDOM());
            this.refreshButton.onClick.bind(e => {
                if (e.shiftKey) {
                    this.onNoCacheRefreshButtonPressed.trigger();
                }
                else {
                    this.onRefreshButtonPressed.trigger();
                }
            });
            // URL bar
            yield this.urlBar.render();
            this.innerWrapper.appendChild(this.urlBar.getDOM());
            // 'go home' button
            yield this.homeButton.render();
            this.homeButton.setIconAsText('⌂');
            this.innerWrapper.appendChild(this.homeButton.getDOM());
            this.homeButton.onClick.bind(() => this.onHomeButtonPressed.trigger());
            // menu button
            yield this.menuButton.render();
            this.menuButton.setIconAsText('+');
            this.innerWrapper.appendChild(this.menuButton.getDOM());
            this.menuButton.onClick.bind(() => __awaiter(this, void 0, void 0, function* () {
                const dialog = yield MainMenuDialog_1.default.createMainMenuDialog(this.openURL);
                yield this.renderDialog(dialog);
                yield dialog.open();
            }));
        });
    }
    /**
     * Checks whether the browser bar is currently collapsed or expanded.
     */
    isCollapsed() {
        return this.outerElement.classList.contains('collapsed');
    }
    /**
     * Collapses the browser bar and returns when the animation is complete.
     */
    collapse() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('collapsed');
            return utils_1.sleep(200);
        });
    }
    /**
     * Expands the browser bar and returns when the animation is complete.
     */
    expand() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.remove('collapsed');
            return utils_1.sleep(200);
        });
    }
    showLoadingIndicator() {
        this.urlBar.showLoadingIndicator();
    }
    showLoadingProgress(percentComplete) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.urlBar.showLoadingProgress(percentComplete);
        });
    }
    hideLoadingIndicator() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.urlBar.hideLoadingIndicator();
        });
    }
    enableHistoryForwardButton() {
        this.forwardButton.enable();
    }
    disableHistoryForwardButton() {
        this.forwardButton.disable();
    }
    enableHistoryBackButton() {
        this.backButton.enable();
    }
    disableHistoryBackButton() {
        this.backButton.disable();
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BrowserBar;
//# sourceMappingURL=BrowserBar.js.map