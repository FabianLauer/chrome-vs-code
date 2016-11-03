import BrowserBar from './BrowserBar';
import Viewport from './Viewport';
import StatusIndicator from './StatusIndicator';
import ResponseRendererFactory from './ResponseRendererFactory';
import Dialog from './Dialog';
import IReadonlyHistory from './IReadonlyHistory';
import History from './History';
import HistoryEntry from './HistoryEntry';
import IFrameBindings from './IFrameBindings';
import initializePrompts from './webapi/prompts';

declare function escape(str: string): string;
declare function unescape(str: string): string;


/**
 * The complete browser window, including browser bar and viewport.
 */
export default class BrowserWindow {
	constructor(
		private readonly browserBar?: BrowserBar,
		private readonly viewport?: Viewport
	) {
		this.browserBar = this.browserBar || new BrowserBar(
			undefined,
			dialog => this.renderDialog(dialog),
			url => this.load(url)
		);
		this.viewport = this.viewport || new Viewport(() => this.createFrameBindings());
		this.history.push(new HistoryEntry('about://home', Date.now()));
		this.viewport.onBeginNavigation.bind(this.handleViewportBeginningNavigation.bind(this));
		this.viewport.onAfterNavigation.bind(this.handleViewportNavigating.bind(this));
		this.viewport.onRequestNavigation.bind(this.handleNavigationRequestFromViewport.bind(this));
	}


	public async render(): Promise<void> {
		// status indicator
		await this.statusIndicator.render();
		document.body.appendChild(this.statusIndicator.getDOM());
		const statusIndicatorTicket = this.statusIndicator.show('initializing');
		// browser bar
		this.browserBar.urlBar.onChange.bind(async () => {
			this.load(await this.browserBar.urlBar.getURL());
		});
		this.browserBar.onHomeButtonPressed.bind(() => {
			this.load('about://home');
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
		// resize the viewport when the window size changes
		window.addEventListener('resize', () => this.expandBrowserBar(false));
	}


	public getHistory(): IReadonlyHistory<HistoryEntry> {
		return this.history;
	}


	/**
	 * Loads a URI and renders it in the browser.
	 * @param uri The URI to load.
	 */
	public async load(uri: string, deferHistoryUdpate = false): Promise<void> {
		if (deferHistoryUdpate) {
			this.browserBar.showLoadingIndicator();
			this.statusIndicator.show(`loading...`);
		} else {
			this.history.push(new HistoryEntry(uri, Date.now()));
			this.updateHistoryButtons();
			await this.browserBar.urlBar.setURL(uri);
			this.statusIndicator.show(`loading ${uri}`);
			await this.browserBar.showLoadingProgress(10);
		}
		const collapseBrowserBar = this.isBrowserBarCollapsed();
		if (collapseBrowserBar) {
			this.expandBrowserBar(true);
		}
		const response = await this.request(uri);
		const renderer = ResponseRendererFactory.getRenderer(this.viewport, response);
		let statusIndicatorTicket = this.statusIndicator.show(`rendering ${uri}`);
		const responseURI = response.getResponseHeader('actual-uri') || uri;
		// update the browser bar to the actual URL of the page we're now on
		if (deferHistoryUdpate) {
			this.browserBar.urlBar.setURL(responseURI, false);
			this.history.push(new HistoryEntry(responseURI, Date.now()));
			this.updateHistoryButtons();
		} else if (responseURI !== uri) {
			this.browserBar.urlBar.setURL(responseURI, false);
		}
		await renderer.renderResponse(responseURI, response);
		await this.browserBar.showLoadingProgress(100);
		await this.browserBar.hideLoadingIndicator();
		this.statusIndicator.hide(statusIndicatorTicket);
		// collapse the browser bar if it was collapsed before loading started
		if (collapseBrowserBar) {
			await this.browserBar.collapse();
		}
	}


	/**
	 * Checks whether the browser bar is currently collapsed or expanded.
	 */
	public isBrowserBarCollapsed(): boolean {
		return this.browserBar.isCollapsed();
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
	 * @param overlayMode When `true`, the browser bar will open as an overlay.
	 */
	public async expandBrowserBar(overlayMode = false): Promise<void> {
		const updateViewportHeight = overlayMode ?
			// in overlay mode, the viewport is at 100% height:
			() => this.viewport.updateHeight(document.body.getBoundingClientRect().height, true) :
			// if not in overlay mode, fit the viewport into available horizontal space:
			() => this.updateViewportHeight(true);
		await Promise.all([
			this.browserBar.expand(),
			updateViewportHeight()
		]);
	}


	public async renderDialog(dialog: Dialog): Promise<void> {
		await dialog.render();
		document.body.appendChild(dialog.getDOM());
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


	/// TODO: Make this work in all circumstances!
	private isOwnURL(url: string): boolean {
		return /localhost:8080\/load\?/.test(url);
	}


	private async handleViewportBeginningNavigation(): Promise<void> {
		this.expandBrowserBar();
		this.browserBar.showLoadingIndicator();
	}


	private async handleViewportNavigating(uri: string): Promise<void> {
		uri = unescape((<string>uri) || '');
		if (this.isOwnURL(uri)) {
			uri = uri.replace(/^.*?\?/, '');
		}
		await this.load(uri, true);
	}


	private async handleNavigationRequestFromViewport(targetURI: string): Promise<void> {
		targetURI = unescape(((<string>targetURI) || '').replace(/^.*?\?/, ''));
		await this.load(targetURI);
	}


	private createFrameBindings(): IFrameBindings {
		const browserWindow = this;
		return {
			/**
			 * Initializes the frame's web API bindings.
			 */
			async initializeWebAPIs(frameWindow: Window): Promise<void> {
				await initializePrompts(browserWindow, frameWindow);
			},
			/**
			 * Updates the browser location to another URI.
			 * @param uri The URI to open.
			 */
			async load(uri: string): Promise<void> {
				return browserWindow.load(uri);
			}
		};
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
