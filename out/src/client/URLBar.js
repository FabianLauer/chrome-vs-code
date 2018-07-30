"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const URLInterpreter_1 = require('./URLInterpreter');
const event_1 = require('../utils/event');
const utils_1 = require('../utils');
/**
 * The browser's URL bar component.
 */
class URLBar {
    /**
     * Creates a new `URLBar`.
     * @param config A browser configuration reader.
     */
    constructor(config, urlInterpreter = new URLInterpreter_1.default(config)) {
        this.config = config;
        this.urlInterpreter = urlInterpreter;
        /**
         * Triggered when the URL bar's value has changed.
         */
        this.onChange = new event_1.Event();
        this.outerElement = document.createElement('div');
        this.faviconElement = document.createElement('div');
        this.loadingBar = document.createElement('div');
        this.input = document.createElement('input');
        this.formattedView = document.createElement('div');
        this.formattedViewWrapper = document.createElement('div');
        this.protocol = document.createElement('div');
        this.host = document.createElement('div');
        this.path = document.createElement('div');
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            // outer element
            this.outerElement.addEventListener('click', () => {
                this.outerElement.classList.add('focused');
                this.input.focus();
            });
            this.outerElement.classList.add('url-bar');
            // icon
            this.faviconElement.classList.add('favicon');
            this.outerElement.appendChild(this.faviconElement);
            // loading bar
            this.loadingBar.classList.add('loading-bar');
            this.hideLoadingIndicator();
            this.outerElement.appendChild(this.loadingBar);
            // input
            this.input.addEventListener('keyup', e => this.handleInputKeyup(e));
            this.input.addEventListener('blur', this.handleInputBlur.bind(this));
            this.input.placeholder = 'Enter an address or search the web';
            this.outerElement.appendChild(this.input);
            // formatted view
            this.protocol.classList.add('protocol');
            this.formattedViewWrapper.appendChild(this.protocol);
            this.host.classList.add('host');
            this.formattedViewWrapper.appendChild(this.host);
            this.path.classList.add('path');
            this.formattedViewWrapper.appendChild(this.path);
            this.formattedViewWrapper.classList.add('formatted-view-wrapper');
            this.formattedView.appendChild(this.formattedViewWrapper);
            this.formattedView.classList.add('formatted-view');
            this.outerElement.appendChild(this.formattedView);
        });
    }
    /**
     * Updates the favicon source.
     * @param uri The favicon's source URI. Set this to `undefined` to remove the icon.
     */
    setFavicon(uri) {
        if (typeof uri !== 'string' || uri.length === 0) {
            this.faviconElement.style.backgroundImage = '';
        }
        else {
            this.faviconElement.style.backgroundImage = `url(${uri})`;
        }
    }
    /**
     * Returns the current URL as a string.
     */
    getURL() {
        return this.input.value;
    }
    /**
     * Updates the URL bar's current value.
     * @param url The new URL to show in the URL bar.
     * @param triggerChangeEvent Whether to trigger the URL bar's change event or not.
     */
    setURL(url, triggerChangeEvent = false) {
        return __awaiter(this, void 0, void 0, function* () {
            // update the formatted view
            const parsedURL = utils_1.parseURL(url);
            this.protocol.innerText = parsedURL.protocol.replace(/\//g, '') + '//';
            this.path.innerText = parsedURL.pathname.replace(/^\/+/, '');
            if (typeof parsedURL.hash === 'string' && parsedURL.hash.length > 0) {
                this.path.innerText += parsedURL.hash;
            }
            if (typeof parsedURL.search === 'string' && parsedURL.search.length > 0) {
                this.path.innerText += parsedURL.search;
            }
            this.host.innerText = parsedURL.host;
            if (this.host.innerText.length > 0 &&
                this.path.innerText.length > 0 &&
                this.path.innerText.slice(0) !== '#') {
                this.host.innerText += '/';
            }
            // update the input's value
            this.input.value = this.getURLFromFormattedView();
        });
    }
    /**
     * Shows an infinite loading indicator in the URL bar.
     */
    showLoadingIndicator() {
        this.loadingBar.classList.add('visible', 'infinite');
    }
    /**
     * Shows a progress loading indicator in the URL bar.
     * @param percentComplete The progress percentage.
     */
    showLoadingProgress(percentComplete) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.loadingBar.classList.remove('infinite');
                this.loadingBar.classList.add('visible');
                if (this.loadingBar.style.width === `${percentComplete}%`) {
                    resolve();
                    return;
                }
                this.loadingBar.style.width = `${percentComplete}%`;
                setTimeout(resolve, 200);
            });
        });
    }
    /**
     * Hides the loading indicator (infinite or progress).
     */
    hideLoadingIndicator() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.loadingBar.classList.remove('visible', 'infinite');
                setTimeout(() => {
                    this.loadingBar.style.width = '0%';
                    resolve();
                }, 200);
            });
        });
    }
    getURLFromFormattedView() {
        return `${this.protocol.innerText}${this.host.innerText}${this.path.innerText}`;
    }
    handleInputBlur() {
        this.outerElement.classList.remove('focused');
        // reset the input's value to the current URL
        this.setURL(this.getURLFromFormattedView(), false);
    }
    handleInputKeyup(e) {
        // Return key
        if (e.keyCode === 13) {
            this.inputReturnKeyUp();
        }
        else if (e.keyCode === 65 && e.ctrlKey) {
            this.inputSelectAll();
        }
    }
    inputReturnKeyUp() {
        return __awaiter(this, void 0, void 0, function* () {
            this.input.value = yield this.urlInterpreter.interpret(this.input.value);
            this.onChange.trigger();
            this.input.blur();
        });
    }
    inputSelectAll() {
        this.input.setSelectionRange(0, -1);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = URLBar;
//# sourceMappingURL=URLBar.js.map