import BrowserBar from './BrowserBar';
import Viewport from './Viewport';

declare function escape(str: string): string;

/**
 * The complete browser window, including browser bar and viewport.
 */
export default class BrowserWindow {
	constructor(
		private readonly browserBar: BrowserBar = new BrowserBar(),
		private readonly viewport: Viewport = new Viewport(),
	) { }


	public async render(): Promise<void> {
		this.browserBar.urlBar.onChange.bind(async () => {
			this.load(await this.browserBar.urlBar.getValue());
		});
		await this.browserBar.render();
		await this.viewport.render();
		document.body.appendChild(this.browserBar.getDOM());
		document.body.appendChild(this.viewport.getDOM());
	}


	public async load(uri: string): Promise<void> {
		await this.browserBar.urlBar.setValue(uri);
		await this.viewport.renderHTML(await this.request(uri));
	}


	private async request(uri: string): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.onerror = reject;
			request.onreadystatechange = () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					resolve(request.responseText);
				}
			};
			request.open('GET', `/load?${escape(uri)}`, true);
			request.send();
		});
	}
}
