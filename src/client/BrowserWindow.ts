import BrowserBar from './BrowserBar';
import Viewport from './Viewport';
import StatusIndicator from './StatusIndicator';
import ResponseRendererFactory from './ResponseRendererFactory';

declare function escape(str: string): string;
declare function unescape(str: string): string;

/**
 * The complete browser window, including browser bar and viewport.
 */
export default class BrowserWindow {
	constructor(
		private readonly browserBar: BrowserBar = new BrowserBar(),
		private readonly viewport: Viewport = new Viewport()
	) {
		this.viewport.onAfterNavigation.bind(this.handleViewportNavigation.bind(this));
		this.viewport.onRequestNavigation.bind(this.handleNavigationRequestFromViewport.bind(this));
	}


	public async render(): Promise<void> {
		// status indicator
		await this.statusIndicator.render();
		document.body.appendChild(this.statusIndicator.getDOM());
		const statusIndicatorTicket = this.statusIndicator.show('initializing');
		// browser bar
		this.browserBar.urlBar.onChange.bind(async () => {
			this.load(await this.browserBar.urlBar.getValue());
		});
		this.browserBar.onRefreshButtonPressed.bind(() => {
			this.load(this.currentURI);
		});
		this.browserBar.onNoCacheRefreshButtonPressed.bind(() => {
			this.load(this.currentURI);
		});
		await this.browserBar.render();
		document.body.appendChild(this.browserBar.getDOM());
		// browser viewport
		await this.viewport.render();
		document.body.appendChild(this.viewport.getDOM());
		this.updateViewportHeight();
		// hide the status indicator
		this.statusIndicator.hide(statusIndicatorTicket);
	}


	public async load(uri: string): Promise<void> {
		this.currentURI = uri;
		await this.browserBar.urlBar.setValue(uri);
		this.statusIndicator.show(`loading ${uri}`);
		await this.browserBar.showLoadingProgress(10);
		const response = await this.request(uri);
		const renderer = ResponseRendererFactory.getRenderer(this.viewport, response);
		let statusIndicatorTicket = this.statusIndicator.show(`rendering ${uri}`);
		await renderer.renderResponse(response);
		await this.browserBar.showLoadingProgress(100);
		await this.browserBar.hideLoadingIndicator();
		this.statusIndicator.hide(statusIndicatorTicket);
	}


	private async request(uri: string) {
		return new Promise<XMLHttpRequest>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.onerror = reject;
			request.onreadystatechange = async () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					await this.browserBar.showLoadingProgress(90);
					resolve(request);
				}
			};
			request.onprogress = e => {
				if (e.lengthComputable) {
					this.browserBar.showLoadingProgress(((e.loaded / e.total) * 100) - 20);
				} else {
					this.browserBar.showLoadingIndicator();
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


	private readonly statusIndicator = new StatusIndicator();
	private currentURI: string;
}
