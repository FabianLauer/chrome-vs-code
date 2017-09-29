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
class IconButton {
    constructor() {
        /**
         * Triggered when the icon button is clicked.
         */
        this.onClick = new event_1.SmartEvent();
        this.outerElement = document.createElement('div');
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('icon-button');
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
    setIconAsText(icon) {
        this.outerElement.innerText = icon;
    }
    setIcon(iconName) {
        this.outerElement.innerText = '';
        this.outerElement.classList.add(`icon-${iconName}`);
    }
    isEnabled() {
        return !this.outerElement.classList.contains('disabled');
    }
    enable() {
        this.outerElement.classList.remove('disabled');
        this.onClick.unsuspend();
    }
    disable() {
        this.outerElement.classList.add('disabled');
        this.onClick.suspend();
    }
}
exports.default = IconButton;
//# sourceMappingURL=IconButton.js.map