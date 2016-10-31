import BrowserBar from './BrowserBar';
import Viewport from './Viewport';
import ResponseRendererFactory from './ResponseRendererFactory';

declare function escape(str: string): string;
declare function unescape(str: string): string;

/**
 * The complete browser window, including browser bar and viewport.
 */
export default class BrowserWindow {
	constructor(
		private readonly browserBar: BrowserBar = new BrowserBar(),
		private readonly viewport: Viewport = new Viewport(),
	) {
		this.viewport.onAfterNavigation.bind(this.handleViewportNavigation.bind(this));
		this.viewport.onRequestNavigation.bind(this.handleNavigationRequestFromViewport.bind(this));
	}


	public async render(): Promise<void> {
		this.browserBar.urlBar.onChange.bind(async () => {
			this.load(await this.browserBar.urlBar.getValue());
		});
		await this.browserBar.render();
		document.body.appendChild(this.browserBar.getDOM());
		await this.viewport.render();
		document.body.appendChild(this.viewport.getDOM());
		this.updateViewportHeight();
	}


	public async load(uri: string): Promise<void> {
		await this.browserBar.urlBar.setValue(uri);
		const response = await this.request(uri);
		const renderer = ResponseRendererFactory.getRenderer(this.viewport, response);
		await renderer.renderResponse(response);
	}


	private async request(uri: string) {
		return new Promise<XMLHttpRequest>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.onerror = reject;
			request.onreadystatechange = () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					resolve(request);
				}
			};
			request.open('GET', `/load/base?${escape(uri)}`, true);
			request.send();
		});
	}


	private updateViewportHeight(): void {
		const bodyHeight = document.body.getBoundingClientRect().height;
		const browserBarHeight = this.browserBar.getDOM().getBoundingClientRect().height;
		this.viewport.updateHeight(bodyHeight - browserBarHeight);
	}


	private async handleViewportNavigation(uri: string): Promise<void> {
		uri = unescape(((<string>uri) || '').replace(/^.*?\?/, ''));
		await this.load(uri);
	}


	private async handleNavigationRequestFromViewport(targetURI: string): Promise<void> {
		targetURI = unescape(((<string>targetURI) || '').replace(/^.*?\?/, ''));
		await this.load(targetURI);
	}
}
