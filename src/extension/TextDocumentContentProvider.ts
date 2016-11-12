import { TextDocumentContentProvider as BaseTextDocumentContentProvider, EventEmitter, Event, Uri } from 'vscode';
import InternalRoute from '../server/InternalRoute';

export default class TextDocumentContentProvider implements BaseTextDocumentContentProvider {
	/**
	 * @param backEndPort The port to which the back end is listening.
	 */
	constructor(
		private readonly backEndPort: number,
		private readonly internalRouteMap: Map<InternalRoute, string>
	) { /* do nothing */ }

	public readonly _onDidChange = new EventEmitter<Uri>();

	public provideTextDocumentContent(uri: Uri): string {
		return `
			<body>
				<iframe
					id='browser-frame'
					width="100%"
					height="100%"
					frameborder="0"
					src="http://localhost:${this.backEndPort}${this.internalRouteMap.get(InternalRoute.BrowserHTML)}"
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

	public get onDidChange(): Event<Uri> {
		return this._onDidChange.event;
	}

	public update(uri: Uri) {
		this._onDidChange.fire(uri);
	}
}
