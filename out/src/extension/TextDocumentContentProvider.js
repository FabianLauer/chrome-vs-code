"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const InternalRoute_1 = require("../server/InternalRoute");
class TextDocumentContentProvider {
    /**
     * @param backEndPort The port to which the back end is listening.
     */
    constructor(backEndPort, internalRouteMap) {
        this.backEndPort = backEndPort;
        this.internalRouteMap = internalRouteMap;
        this._onDidChange = new vscode_1.EventEmitter();
    }
    provideTextDocumentContent(uri) {
        return `
			<body>
				<iframe
					id='browser-frame'
					width="100%"
					height="100%"
					frameborder="0"
					src="http://localhost:${this.backEndPort}${this.internalRouteMap.get(InternalRoute_1.default.BrowserHTML)}"
					style="
						position: absolute;
						left: 0;
						right: 0;
						bottom: 0;
						top: 0;
					">
				</iframe>
				<script>
					var frame = document.getElementById('browser-frame');

					// watch the body element for CSS class name changes and update the
					// theme after every change:
					new MutationObserver(function(mutations) {
						mutations.forEach(updateTheme);
					}).observe(document.body, {
						attributes: true,
						childList: false,
						characterData: false
					});

					try {
						updateTheme();
					} catch (err) {
						// if the first attempt didn't work, wait a while and try again:
						setTimeout(updateTheme, 1000);
						// just to make sure:
						setTimeout(updateTheme, 4000);
					}

					function updateTheme() {
						var theme;
						if (document.body.classList.contains('vscode-light')) {
							theme = 'light';
						} else if (document.body.classList.contains('vscode-dark')) {
							theme = 'dark';
						} else if (document.body.classList.contains('vscode-high-contrast')) {
							theme = 'high-contrast';
						}
						frame.contentWindow.setChromeVSCodeTheme(theme);
					}
				</script>
			</body>
		`;
    }
    get onDidChange() {
        return this._onDidChange.event;
    }
    update(uri) {
        this._onDidChange.fire(uri);
    }
}
exports.default = TextDocumentContentProvider;
//# sourceMappingURL=TextDocumentContentProvider.js.map