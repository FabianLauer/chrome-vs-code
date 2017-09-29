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
const event_1 = require("../utils/event");
const utils_1 = require("../utils");
class Viewport {
    /**
     * Creates a new viewport.
     * @param getFrameBindings A function that creates an `IFrameBindings` object for every
     *                         frame created by this viewport.
     */
    constructor(getFrameBindings, defaultScrollBehaviour = 'smooth') {
        this.getFrameBindings = getFrameBindings;
        this.defaultScrollBehaviour = defaultScrollBehaviour;
        /**
         * Triggered after the viewport has navigated to another page.
         */
        this.onAfterNavigation = new event_1.Event();
        /**
         * Triggered when the frame starts to navigate.
         */
        this.onBeginNavigation = new event_1.Event();
        /**
         * Triggered when the viewport is scrolling.
         */
        this.onScroll = new event_1.Event();
        this.outerElement = document.createElement('div');
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('viewport');
            yield this.createNewFrame();
        });
    }
    /**
     * Updates the viewport's height.
     * @param height The new height in pixels.
     * @param animated Whether to animate the height change or not.
     */
    updateHeight(height, animated) {
        return __awaiter(this, void 0, void 0, function* () {
            if (animated) {
                this.outerElement.classList.add('animate-height');
                yield utils_1.sleep(10);
            }
            this.outerElement.style.height = `${height}px`;
            if (animated) {
                yield utils_1.sleep(200);
                this.outerElement.classList.remove('animate-height');
                yield utils_1.sleep(10);
            }
        });
    }
    renderHTML(html) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createNewFrame(html);
            this.overwriteBeforeUnloadInFrame();
            this.injectAnchorClickListener();
            // bind scroll listeners
            this.frame.contentWindow.addEventListener('scroll', () => this.onScroll.trigger());
            this.frame.contentWindow.document.addEventListener('scroll', () => this.onScroll.trigger());
            const body = this.frame.contentWindow.document.getElementsByTagName('body')[0];
            if (typeof body === 'object' && body !== null) {
                body.addEventListener('scroll', () => this.onScroll.trigger());
            }
        });
    }
    /**
     * Returns the viewports current scroll offsets.
     */
    getScroll() {
        if (!(this.frame instanceof HTMLElement)) {
            return {
                x: undefined,
                y: undefined
            };
        }
        return {
            x: this.frame.contentWindow.scrollX,
            y: this.frame.contentWindow.scrollY
        };
    }
    /**
     * Scrolls the viewport to a fragment.
     * @param hash The fragment to scroll to.
     * @param behavior The scroll behavior to use.
     */
    jumpToFragment(fragmentIdentifier, behavior = this.defaultScrollBehaviour) {
        fragmentIdentifier = fragmentIdentifier.replace(/^#/, '');
        let target = this.frame.contentDocument.getElementById(fragmentIdentifier) ||
            // If the fragment identifier didn't point to an element with an ID, try to find
            // an element with a name attribute that matches the fragment identifier.
            this.frame.contentDocument.querySelector(`[name="${fragmentIdentifier}"]`);
        // Cancel if the fragment couldn't be found.
        if (typeof target === 'undefined' || target === null) {
            return;
        }
        target.scrollIntoView({ behavior: behavior });
    }
    createNewFrame(src) {
        return __awaiter(this, void 0, void 0, function* () {
            yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                if (this.frame instanceof HTMLElement) {
                    this.frame.remove();
                }
                this.frame = document.createElement('iframe');
                this.frame.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
                if (typeof src === 'string') {
                    this.frame.srcdoc = src;
                }
                this.outerElement.appendChild(this.frame);
                if (typeof src === 'string') {
                    let iterations = 0;
                    let matches = 0;
                    while (iterations++ < 1000) {
                        if (typeof this.frame.contentWindow === 'object' && this.frame.contentWindow !== null) {
                            this.injectFrameBindings();
                        }
                        if (typeof this.frame.contentDocument === 'object' && this.frame.contentDocument !== null &&
                            typeof this.frame.contentDocument.body === 'object' && this.frame.contentDocument.body !== null) {
                            matches += 1;
                            if (matches === 2) {
                                break;
                            }
                        }
                        yield utils_1.sleep(100);
                    }
                }
                resolve();
            }));
        });
    }
    overwriteBeforeUnloadInFrame() {
        if (typeof this.frame.contentWindow !== 'object' || this.frame.contentWindow === null) {
            return;
        }
        this.frame.contentWindow.addEventListener('beforeunload', () => {
            this.frame.style.display = 'none';
            this.onBeginNavigation.trigger();
            const loadHandler = () => {
                this.frame.removeEventListener('load', loadHandler);
                this.onAfterNavigation.trigger(this.frame.contentWindow.location.href);
            };
            this.frame.addEventListener('load', loadHandler);
        });
    }
    injectFrameBindings() {
        if (
        // if there's no contentWindow
        typeof this.frame.contentWindow !== 'object' ||
            this.frame.contentWindow === null ||
            // or if the bindings were already created
            typeof this.frame.contentWindow.vscodeBrowser === 'object' &&
                this.frame.contentWindow.vscodeBrowser !== null) {
            return;
        }
        const members = [];
        const bindings = this.getFrameBindings();
        Viewport.bindings.splice(0, Viewport.bindings.length);
        window.getBinding = (bindingID) => Viewport.bindings[bindingID];
        let memberNames = [];
        let last = bindings;
        while (true) {
            last = Object.getPrototypeOf(last);
            if (last === Object.prototype) {
                break;
            }
            memberNames = memberNames.concat(Object.getOwnPropertyNames(last));
        }
        memberNames = memberNames.filter(name => {
            return (name !== 'constructor' &&
                typeof bindings[name] === 'function');
        });
        for (const key of memberNames) {
            let value = bindings[key];
            if (typeof bindings[key] === 'function') {
                const bindingID = Viewport.bindings.push(bindings[key]) - 1;
                value = new Function(`return window.parent.getBinding(${bindingID}).apply(undefined, arguments);`);
            }
            members.push({
                name: key,
                property: {
                    configurable: false,
                    enumerable: false,
                    value: value,
                    writable: false
                }
            });
        }
        const js = members.map(member => {
            var propertyCode = '{ ';
            for (const key in member.property) {
                propertyCode += `'${key}': ${member.property[key].toString()}, `;
            }
            propertyCode = propertyCode.slice(0, propertyCode.length - 2);
            propertyCode += ' }';
            return `Object.defineProperty(bindings, '${member.name}', ${propertyCode})`;
        }).join(';');
        this.frame.contentWindow.eval(`
			(function() {
				/* VS Code Browser Injected Bindings */
				'use strict';
				var bindings = {};
				Object.defineProperty(window, 'vscodeBrowser', {
					enumerable: false,
					configurable: false,
					get: () => bindings
				});
				${js};
				bindings.initializeWebAPIs(window).then(function() {
					window.dispatchEvent(new Event('vscodeBrowserBindingsReady'));
				});
			})();
		`);
    }
    injectAnchorClickListener() {
        this.frame.contentWindow.addEventListener('click', event => {
            const target = event.target;
            if (!(target instanceof this.frame.contentWindow.HTMLAnchorElement)) {
                return;
            }
            /// TODO: This does not find href's that have both hash and path/host.
            if (/^#/.test(target.getAttribute('href'))) {
                event.preventDefault();
                event.stopPropagation();
                this.jumpToFragment(target.getAttribute('href'));
            }
        });
    }
}
Viewport.bindings = [];
exports.default = Viewport;
//# sourceMappingURL=Viewport.js.map