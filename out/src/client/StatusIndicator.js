"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class StatusIndicator {
    constructor() {
        this.outerElement = document.createElement('div');
        this.lastTicket = 0;
    }
    getDOM() {
        return this.outerElement;
    }
    render() {
        return __awaiter(this, void 0, void 0, function* () {
            this.outerElement.classList.add('status-indicator');
        });
    }
    /**
     * Shows the status indicator with a certain message.
     * @param message The message to display.
     */
    show(message) {
        this.outerElement.classList.add('visible');
        this.outerElement.innerText = message;
        return ++this.lastTicket;
    }
    /**
     * Hides the status indicator.
     */
    hide(ticket) {
        if (ticket !== this.lastTicket) {
            return;
        }
        this.outerElement.classList.remove('visible');
        this.outerElement.innerText = '';
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StatusIndicator;
//# sourceMappingURL=StatusIndicator.js.map