"use strict";
/**
 * This function is called by the extension's HTML preview to sync the browser client's with VS Code's theme.
 * @param theme The theme to set.
 */
function setChromeVSCodeTheme(theme) {
    switch (theme) {
        default:
        case 'light':
            document.body.classList.add(`vscode-light`);
            document.body.classList.remove(`vscode-dark`);
            document.body.classList.remove(`vscode-high-contrast`);
            break;
        case 'dark':
            document.body.classList.add(`vscode-dark`);
            document.body.classList.remove(`vscode-light`);
            document.body.classList.remove(`vscode-high-contrast`);
            break;
        case 'high-contrast':
            document.body.classList.add(`vscode-high-contrast`);
            document.body.classList.remove(`vscode-light`);
            document.body.classList.remove(`vscode-dark`);
            break;
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = setChromeVSCodeTheme;
window.setChromeVSCodeTheme = setChromeVSCodeTheme;
//# sourceMappingURL=theme.js.map