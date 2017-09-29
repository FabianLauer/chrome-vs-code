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
const Dialog_1 = require("./Dialog");
const IconButton_1 = require("./IconButton");
const config_1 = require("../config");
class MainMenuCard extends IconButton_1.default {
    constructor(icon, text, clickHandler) {
        super();
        this.icon = icon;
        this.text = text;
        this.clickHandler = clickHandler;
    }
    render() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            yield _super("render").call(this);
            this.onClick.bind(this.clickHandler);
            this.setIcon(this.icon);
            const textElement = document.createElement('span');
            textElement.innerText = this.text;
            this.getDOM().appendChild(textElement);
        });
    }
}
class MainMenuDialog extends Dialog_1.default {
    constructor(urlOpener) {
        super();
        this.urlOpener = urlOpener;
    }
    /**
     * Creates a new main menu dialog.
     */
    static createMainMenuDialog(openURL) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(this.singletonInstance instanceof MainMenuDialog)) {
                this.singletonInstance = new MainMenuDialog(openURL);
                yield this.singletonInstance.render();
            }
            return this.singletonInstance;
        });
    }
    render() {
        const _super = name => super[name];
        return __awaiter(this, void 0, void 0, function* () {
            if (this.wasRendered()) {
                return;
            }
            yield _super("render").call(this);
            this.outerElement.classList.add('main-menu-dialog');
            const cards = [
                new MainMenuCard('bug', 'Report an Issue', () => this.openURL(config_1.BUG_REPORT_URL)),
                new MainMenuCard('info', 'License', () => this.openURL('about://license')),
                new MainMenuCard('checkbox-checked', 'Disclaimer', () => this.openURL('about://disclaimer'))
            ];
            for (const card of cards) {
                yield card.render();
                this.bodyElement.appendChild(card.getDOM());
            }
        });
    }
    openURL(url) {
        return __awaiter(this, void 0, void 0, function* () {
            yield Promise.all([
                this.close(),
                this.urlOpener(url)
            ]);
        });
    }
}
exports.default = MainMenuDialog;
//# sourceMappingURL=MainMenuDialog.js.map