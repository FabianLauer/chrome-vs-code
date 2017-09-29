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
class Button {
    constructor() {
        /**
         * Triggered when the button is clicked.
         */
        this.onClick = new event_1.SmartEvent();
        this.wasRendered = false;
        this.outerElement = document.createElement('div');
        this.iconElement = document.createElement('div');
        this.textElement = document.createElement('div');
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.wasRendered) {
                return;
            }
            this.wasRendered = true;
            this.textElement.classList.add('text');
            this.iconElement.classList.add('icon');
            this.outerElement.classList.add('button');
            this.outerElement.appendChild(this.iconElement);
            this.outerElement.appendChild(this.textElement);
            this.onClick.onBeforeFirstBind.bind(() => {
                this.clickListener = (e) => this.onClick.trigger(e);
                this.outerElement.addEventListener('click', this.clickListener);
            });
            this.onClick.onAfterLastUnbind.bind(() => {
                this.outerElement.removeEventListener('click', this.clickListener);
                this.clickListener = undefined;
            });
        });
    }
    /**
     * Updates the button's text content.
     * @param text The new text content. When this is `undefined`, the current text content will be removed.
     */
    setText(text) {
        if (typeof text !== 'string' || text.length === 0) {
            this.textElement.textContent = '';
            this.outerElement.classList.remove('has-text');
        }
        else {
            this.textElement.textContent = text;
            this.outerElement.classList.add('has-text');
        }
    }
    /**
     * Updates the button's icon using a character as the icon.
     * @param text The new icon. When this is `undefined`, the button's icon will be removed.
     */
    setIconAsText(icon) {
        this.setIcon(undefined);
        if (typeof icon !== 'string' || icon.length === 0) {
            this.iconElement.innerText = '';
            this.outerElement.classList.remove('has-text-icon');
        }
        else {
            this.iconElement.innerText = icon;
            this.outerElement.classList.add('has-text-icon');
        }
    }
    /**
     * Updates the button's icon using an icon name provided by the available icon font.
     * @param text The new icon. When this is `undefined`, the button's icon will be removed.
     */
    setIcon(iconName) {
        this.iconElement.innerText = '';
        this.iconName = iconName;
        if (typeof iconName !== 'string' || iconName.length === 0) {
            this.iconElement.classList.remove(`icon-${iconName}`);
            this.outerElement.classList.remove('has-icon');
        }
        else {
            this.iconName = iconName;
            this.iconElement.classList.add(`icon-${iconName}`);
            this.outerElement.classList.add('has-icon');
        }
    }
    /**
     * Returns `true` when the button is enabled, `false` if not.
     */
    isEnabled() {
        return !this.outerElement.classList.contains('disabled');
    }
    /**
     * Enables the button. When enabled, the button's `onClick` event can be triggered.
     */
    enable() {
        this.outerElement.classList.remove('disabled');
        this.onClick.unsuspend();
    }
    /**
     * Disables the button. When disabled, the button's `onClick` event is suspended.
     */
    disable() {
        this.outerElement.classList.add('disabled');
        this.onClick.suspend();
    }
}
exports.default = Button;
//# sourceMappingURL=Button.js.map