"use strict";
///
/// User Prompts API Imeplemntation
/// Spec: http://w3c.github.io/html/webappapis.html#user-prompts
///
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Dialog_1 = require("../Dialog");
const Button_1 = require("../Button");
/**
 * Adds a button to a dialog that closes the dialog when pressed.
 * @param dialog The dialog to add the button to.
 * @param text The text to display on the button. Optional.
 * @param append When `true`, the button will be appended to the dialog, otherwise it will
 *               be prepended. Optional.
 */
function addCloseButtonToDialog(dialog, text = 'Close', append = true) {
    return __awaiter(this, void 0, void 0, function* () {
        const button = new Button_1.default();
        if (append) {
            yield dialog.appendButton(button);
        }
        else {
            yield dialog.prependButton(button);
        }
        button.setText(text);
        button.onClick.once(() => dialog.close());
        return button;
    });
}
/**
 * Creates a dialog that implements `window.alert`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-alert
 */
function alert(browserWindow, message) {
    return __awaiter(this, void 0, void 0, function* () {
        // hello github 😇
        if (/for +security +reasons, +framing +is +not +allowed/i.test(message)) {
            return;
        }
        // build the dialog
        const dialog = yield Dialog_1.default.create();
        dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
        dialog.setContentAsText(message || '');
        // dialog button
        yield addCloseButtonToDialog(dialog, 'OK');
        // render and open
        browserWindow.renderDialog(dialog);
        yield dialog.open();
    });
}
exports.alert = alert;
/**
 * Shows a customizable confirm dialog.
 * **This must not be exposed to web pages.**
 * @param title The dialog title.
 * @param message A message to show in the dialog.
 * @param allowHTML Whether to allow HTML in the dialog message or not.
 * @param yesButtonText An optional override for the confirmation button's text.
 * @param yesButtonText An optional override for the refuse button's text.
 */
function internalConfirm(browserWindow, title = `'${browserWindow.getHistory().getCurrent().uri}' says:`, message, allowHTML = false, yesButtonText = 'Yes', noButtonText = 'No') {
    return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
        // build the dialog
        const dialog = yield Dialog_1.default.create();
        dialog.setTitle(title);
        if (allowHTML) {
            dialog.setContentAsHTML(`
				<iframe
					style="border: none; width: 50vw; height: 60vh;"
					src="data:text/html;base64,${btoa(message || '')}"
					/>
			`);
        }
        else {
            dialog.setContentAsText(message || '');
        }
        // dialog buttons
        const noButton = yield addCloseButtonToDialog(dialog, noButtonText);
        noButton.onClick.once(() => resolve(false));
        const yesButton = yield addCloseButtonToDialog(dialog, yesButtonText);
        yesButton.onClick.once(() => resolve(true));
        // render and open
        browserWindow.renderDialog(dialog);
        yield dialog.open();
    }));
}
exports.internalConfirm = internalConfirm;
/**
 * Creates a dialog that implements `window.confirm`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-confirm
 */
function confirm(browserWindow, message) {
    return __awaiter(this, void 0, void 0, function* () {
        return internalConfirm(browserWindow, undefined, message, false);
    });
}
exports.confirm = confirm;
/**
 * Creates a dialog that implements `window.prompt`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-prompt
 */
function prompt(browserWindow, message, defaultValue = '') {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            // build the dialog's inner DOM
            const messageElement = document.createTextNode(message || '');
            const inputElement = document.createElement('input');
            inputElement.type = 'text';
            inputElement.value = defaultValue;
            // build the dialog
            const dialog = yield Dialog_1.default.create();
            dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
            dialog.setContentAsHTML(messageElement, inputElement);
            // dialog buttons
            const cancelButton = yield addCloseButtonToDialog(dialog);
            cancelButton.onClick.once(() => resolve(null));
            const confirmButton = yield addCloseButtonToDialog(dialog, 'OK');
            confirmButton.onClick.once(() => resolve(inputElement.value));
            // render and open
            browserWindow.renderDialog(dialog);
            yield dialog.open();
        }));
    });
}
exports.prompt = prompt;
/**
 * Initializes the 'User Prompts' implementations on a certain window.
 * @param window The window to initialize the API on.
 */
function initialize(browserWindow, window) {
    window.alert = (message) => alert(browserWindow, message);
    window.confirm = ((message) => confirm(browserWindow, message));
    window.prompt = ((message, defaultValue) => prompt(browserWindow, message, defaultValue));
}
exports.initialize = initialize;
//# sourceMappingURL=prompts.js.map