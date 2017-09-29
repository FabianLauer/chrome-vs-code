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
const utils_1 = require("../utils");
class Dialog {
    constructor() {
        this.outerElement = document.createElement('div');
        this.bodyElement = document.createElement('div');
        this.rendered = false;
        this.innerWrapper = document.createElement('div');
        this.titleElement = document.createElement('div');
        this.bottomBarElement = document.createElement('div');
    }
    /**
     * Creates a new dialog.
     */
    static create() {
        return __awaiter(this, void 0, void 0, function* () {
            const dialog = new Dialog();
            yield dialog.render();
            return dialog;
        });
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.wasRendered()) {
                return;
            }
            this.rendered = true;
            this.outerElement.classList.add('dialog');
            this.titleElement.classList.add('title');
            this.innerWrapper.appendChild(this.titleElement);
            this.bodyElement.classList.add('body');
            this.innerWrapper.appendChild(this.bodyElement);
            this.bottomBarElement.classList.add('bottom-bar');
            this.innerWrapper.appendChild(this.bottomBarElement);
            this.innerWrapper.classList.add('inner-wrapper');
            this.outerElement.appendChild(this.innerWrapper);
        });
    }
    getTitle() {
        return this.titleElement.textContent.trim();
    }
    setTitle(title) {
        this.titleElement.textContent = title;
    }
    getContent() {
        return this.bodyElement.innerHTML.trim();
    }
    setContentAsText(text) {
        this.bodyElement.innerHTML = '';
        this.bodyElement.textContent = text;
    }
    setContentAsHTML(...html) {
        this.bodyElement.innerHTML = '';
        html.forEach(part => {
            if (typeof part === 'string') {
                this.bodyElement.innerHTML += part;
            }
            else {
                this.bodyElement.appendChild(part);
            }
        });
    }
    prependButton(button) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.bottomBarElement.childElementCount === 0) {
                return this.appendButton(button);
            }
            yield button.render();
            this.bottomBarElement.insertBefore(button.getDOM(), this.bottomBarElement.firstChild);
        });
    }
    appendButton(button) {
        return __awaiter(this, void 0, void 0, function* () {
            yield button.render();
            this.bottomBarElement.appendChild(button.getDOM());
        });
    }
    /**
     * Checks whether the dialog is currently open or not.
     */
    isOpen() {
        return this.outerElement.classList.contains('open');
    }
    /**
     * Opens the dialog.
     */
    open() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isOpen()) {
                return;
            }
            this.outerElement.style.display = 'block';
            yield utils_1.sleep(10);
            this.outerElement.classList.add('open');
            yield utils_1.sleep(200);
        });
    }
    /**
     * Closes the dialog.
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isOpen()) {
                return;
            }
            this.outerElement.classList.remove('open');
            yield utils_1.sleep(200);
            this.outerElement.style.display = '';
            this.outerElement.remove();
        });
    }
    wasRendered() {
        return this.rendered;
    }
}
exports.default = Dialog;
//# sourceMappingURL=Dialog.js.map