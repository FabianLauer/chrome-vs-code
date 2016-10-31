import BrowserBar from './BrowserBar';
import Viewport from './Viewport';
import StatusIndicator from './StatusIndicator';
import ResponseRendererFactory from './ResponseRendererFactory';
import History from './History';
import HistoryEntry from './HistoryEntry';

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
		this.history.push(new HistoryEntry('about://home', Date.now()));
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
			this.load(this.history.getCurrent().uri);
		});
		this.browserBar.onNoCacheRefreshButtonPressed.bind(() => {
			this.load(this.history.getCurrent().uri);
		});
		this.browserBar.onBackButtonPressed.bind(async () => {
			await this.history.goBack();
			this.load(this.history.getCurrent().uri);
		});
		this.browserBar.onForwardButtonPressed.bind(async () => {
			await this.history.goForward();
			this.load(this.history.getCurrent().uri);
		});
		await this.browserBar.render();
		this.updateHistoryButtons();
		document.body.appendChild(this.browserBar.getDOM());
		// browser viewport
		await this.viewport.render();
		document.body.appendChild(this.viewport.getDOM());
		this.updateViewportHeight(false);
		this.viewport.onScroll.bind(this.handleViewportScroll.bind(this));
		// hide the status indicator
		this.statusIndicator.hide(statusIndicatorTicket);
	}


	public async load(uri: string): Promise<void> {
		this.history.push(new HistoryEntry(uri, Date.now()));
		this.updateHistoryButtons();
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


	/**
	 * Collapses the browser bar and returns when the animation is complete.
	 */
	public async collapseBrowserBar(): Promise<void> {
		await Promise.all([
			this.browserBar.collapse(),
			this.viewport.updateHeight(document.body.getBoundingClientRect().height, true)
		]);
	}


	/**
	 * Expands the browser bar and returns when the animation is complete.
	 */
	public async expandBrowserBar(): Promise<void> {
		await Promise.all([
			this.browserBar.expand(),
			this.updateViewportHeight(true)
		]);
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


	private updateHistoryButtons(): void {
		// forward button
		if (this.history.canGoForward()) {
			this.browserBar.enableHistoryForwardButton();
		} else {
			this.browserBar.disableHistoryForwardButton();
		}
		// back button
		if (this.history.canGoBackward()) {
			this.browserBar.enableHistoryBackButton();
		} else {
			this.browserBar.disableHistoryBackButton();
		}
	}


	private updateViewportHeight(animated: boolean): void {
		const bodyHeight = document.body.getBoundingClientRect().height;
		const browserBarHeight = this.browserBar.getDOM().getBoundingClientRect().height;
		this.viewport.updateHeight(bodyHeight - browserBarHeight, animated);
	}


	private handleViewportScroll(): void {
		const now = Date.now();
		if (now - this.lastViewportScroll.recordedTime <= 300) {
			return;
		}
		const currentScrollY = this.viewport.getScroll().y;
		const threshold = this.viewport.getDOM().getBoundingClientRect().height / 10;
		if (Math.abs(currentScrollY - this.lastViewportScroll.scrollY) < threshold) {
			return;
		}
		console.log(currentScrollY > this.lastViewportScroll.scrollY, currentScrollY, this.lastViewportScroll.scrollY);
		// scrolling down:
		if (currentScrollY > this.lastViewportScroll.scrollY) {
			this.collapseBrowserBar();
		}
		// scrolling up:
		else {
			this.expandBrowserBar();
		}
		this.lastViewportScroll.recordedTime = now;
		this.lastViewportScroll.scrollY = currentScrollY;
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
	private history = new History();
	private lastViewportScroll: {
		recordedTime: number;
		scrollY: number;
	} = {
		recordedTime: Date.now(),
		scrollY: 0
	};
}
