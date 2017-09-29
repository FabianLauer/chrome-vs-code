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
const HistoryEntry_1 = require("./HistoryEntry");
class History {
    constructor() {
        this.entries = [];
        this.currentIndex = 0;
    }
    /**
     * Returns the current history entry.
     */
    getCurrent() {
        return this.entries[this.currentIndex];
    }
    /**
     * Pushes an entry to the history and makes it the current entry.
     * @param entry The entry to push to the history.
     */
    push(entry) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.getCurrent() instanceof HistoryEntry_1.default && this.getCurrent().uri === entry.uri) {
                this.entries[this.currentIndex] = entry;
            }
            else {
                this.entries.splice(0, this.currentIndex);
                this.entries.unshift(entry);
                this.currentIndex = 0;
            }
        });
    }
    canGoForward() {
        return this.currentIndex !== 0;
    }
    canGoBackward() {
        return this.currentIndex < this.entries.length - 1;
    }
    /**
     * Moves back by a certain number of entries and returns the new current entry.
     */
    goBack(entries = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentIndex = Math.min(this.currentIndex + entries, this.entries.length - 1);
        });
    }
    /**
     * Moves forward by a certain number of entries and returns the new current entry.
     */
    goForward(entries = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            this.currentIndex = Math.max(this.currentIndex - entries, 0);
        });
    }
}
exports.default = History;
//# sourceMappingURL=History.js.map