import resolveInternalRoute from './internalRouteMapReader';
import InternalRoute from '../server/InternalRoute';
import BrowserBar from './BrowserBar';
import Viewport from './Viewport';
import StatusIndicator from './StatusIndicator';
import ResponseRendererFactory from './ResponseRendererFactory';
import Dialog from './Dialog';
import IReadonlyHistory from './IReadonlyHistory';
import History from './History';
import HistoryEntry from './HistoryEntry';
import IFrameBindings from './IFrameBindings';
import IPrivilegedFrameBindings from './IPrivilegedFrameBindings';
import IBrowserConfiguration from '../server/IBrowserConfiguration';
import { internalConfirm, initialize as initializePrompts } from './webapi/prompts';

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
		this.history.push(new HistoryEntry('about://start', Date.now()));
		this.viewport = this.viewport || new Viewport(() => this.createFrameBindings());
		this.viewport.onBeginNavigation.bind(this.handleViewportBeginningNavigation.bind(this));
		this.viewport.onAfterNavigation.bind(this.handleViewportNavigating.bind(this));
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


	public async loadInitialPage(): Promise<void> {
		// load the initial page
		const config = await this.getBrowserConfig();
		let initialUrl = 'about://home';
		if (config.showWelcomePage) {
			initialUrl = 'about://welcome';
		}
		await this.load(initialUrl);
		await this.updateBrowserConfigField('showWelcomePage', false);
	}


	/**
	 * Loads a URI and renders it in the browser.
	 * @param uri The URI to load.
	 */
	public async load(uri: string, deferHistoryUdpate = false): Promise<void> {
		if (uri.trim() !== 'about://welcome' && !(await this.ensureDisclaimerAccepted())) {
			return;
		}
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
		await this.refreshBrowserConfig();
		const collapseBrowserBar =
			this.isBrowserBarCollapsed() &&
			(await this.getBrowserConfig()).autoToggleAddressBar;
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
		// render the actual response
		await renderer.renderResponse(responseURI, response);
		// render the favicon
		const icon = await renderer.generateFavicon(responseURI, response);
		if (typeof icon === 'string') {
			this.browserBar.urlBar.setFavicon(icon);
		} else {
			this.browserBar.urlBar.setFavicon(undefined);
		}
		await this.browserBar.showLoadingProgress(100);
		await this.browserBar.hideLoadingIndicator();
		this.statusIndicator.hide(statusIndicatorTicket);
		// collapse the browser bar if it was collapsed before loading started
		if (collapseBrowserBar) {
			await this.collapseBrowserBar();
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
			request.open('GET', `${resolveInternalRoute(InternalRoute.LoadBase)}?${escape(uri)}`, true);
			request.send();
		});
	}


	/**
	 * Checks if the user has accepted the disclaimer.
	 */
	private async wasDisclaimerAccepted(): Promise<boolean> {
		const config = await this.getBrowserConfig();
		return config.disclaimerReadAndAccepted;
	}


	/**
	 * Presents the disclaimer to the user and asks to accept it.
	 * Returns `true` when the user accepts it, `false` if not.
	 */
	private async askToAcceptDisclaimer(): Promise<boolean> {
		if (this.disclaimerPromptVisible) {
			return;
		}
		this.disclaimerPromptVisible = true;
		const response = await this.request('about://disclaimer');
		const accepted = await internalConfirm(
			this,
			`Accept 'Chrome VS Code' Terms of Use to continue browsing`,
			response.responseText,
			true,
			'Accept Terms of Use',
			'Don\'t accept'
		);
		this.disclaimerPromptVisible = false;
		return accepted;
	}


	/**
	 * Returns `true` when the user has accepted the disclaimer, `false` if not.
	 */
	private async ensureDisclaimerAccepted(): Promise<boolean> {
		const notAccepted = () => {
			this.viewport.renderHTML('');
			this.browserBar.urlBar.setURL('about://welcome');
		};
		// disclaimer was already accepted
		if (await this.wasDisclaimerAccepted()) {
			return true;
		}
		// disclaimer was not accepted yet
		const accepted = await this.askToAcceptDisclaimer();
		// update the browser config
		await this.updateBrowserConfigField('disclaimerReadAndAccepted', accepted);
		if (!accepted) {
			notAccepted();
			return;
		}
		// Don't return the `accepted` value from above, but rather refresh the browser config
		// and return the config value from 'disclaimerReadAndAccepted'. This way, we can make
		// sure the config file is in sync.
		await this.refreshBrowserConfig();
		if (!(await this.getBrowserConfig()).disclaimerReadAndAccepted) {
			notAccepted();
			return false;
		}
		return true;
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


	private async handleViewportScroll(): Promise<void> {
		const config = await this.getBrowserConfig();
		if (!config.autoToggleAddressBar) {
			return;
		}
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


	private isInternalURL(url: string): boolean {
		const getInternalRouteRegex = (routeIdentifier: InternalRoute) => {
			const asString = resolveInternalRoute(routeIdentifier)
				// remove any leading slashes
				.replace(/^\//, '')
				// escape all slashes (except the leading one removed above)
				.replace(/\//, '\\/');
			return new RegExp(`${window.location.host}\/+${asString}`);
		};

		return (
			getInternalRouteRegex(InternalRoute.Load).test(url) ||
			getInternalRouteRegex(InternalRoute.LoadBase).test(url)
		);
	}


	private async handleViewportBeginningNavigation(): Promise<void> {
		this.expandBrowserBar();
		this.browserBar.showLoadingIndicator();
	}


	private async handleViewportNavigating(uri: string): Promise<void> {
		uri = unescape((<string>uri) || '');
		if (this.isInternalURL(uri)) {
			uri = uri.replace(/^.*?\?/, '');
		}
		await this.load(uri, true);
	}


	/**
	 * Loads and returns the current browser configuration from the back end.
	 */
	private async loadBrowserConfig(): Promise<IBrowserConfiguration> {
		return new Promise<IBrowserConfiguration>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.onerror = reject;
			request.onreadystatechange = () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					resolve(JSON.parse(request.responseText));
				}
			};
			request.open('GET', resolveInternalRoute(InternalRoute.ConfigRead), true);
			request.send();
		});
	}


	private async updateConfig(config: { [section: string]: { [key: string]: any; }; }): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.onerror = reject;
			request.onreadystatechange = () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					resolve();
				}
			};
			request.open('GET', `${resolveInternalRoute(InternalRoute.ConfigWrite)}?${escape(JSON.stringify(config))}`, true);
			request.send();
		});
		await this.refreshBrowserConfig();
	}


	private async updateConfigField(section: string, key: string, value: any): Promise<void> {
		const object: any = {};
		object[section] = {};
		object[section][key] = value;
		return this.updateConfig(object);
	}


	private async updateBrowserConfigField(key: string, value: any): Promise<void> {
		return this.updateConfigField('chromevscode', key, value);
	}


	/**
	 * Returns the current browser configuration.
	 */
	private async getBrowserConfig(): Promise<IBrowserConfiguration> {
		this.config = this.config || await this.loadBrowserConfig();
		return this.config;
	}


	/**
	 * Refreshes the configuration object returned by method `getBrowserConfig()`.
	 */
	private async refreshBrowserConfig(): Promise<void> {
		this.config = await this.loadBrowserConfig();
	}


	private createFrameBindings(): IFrameBindings {
		const browserWindow = this;
		class FrameBindings implements IFrameBindings {
			/**
			 * Initializes the frame's web API bindings.
			 */
			public async initializeWebAPIs(frameWindow: Window): Promise<void> {
				await initializePrompts(browserWindow, frameWindow);
			}

			/**
			 * Updates the browser location to another URI.
			 * @param uri The URI to open.
			 */
			public async load(uri: string): Promise<void> {
				return browserWindow.load(uri);
			}

			/**
			 * Attempts to show the address bar. Returns `true` when successful, `false` if not.
			 */
			public async showAddressBar(): Promise<boolean> {
				await browserWindow.expandBrowserBar();
				return true;
			}

			/**
			 * Attempts to hide the address bar. Returns `true` when successful, `false` if not.
			 */
			public async hideAddressBar(): Promise<boolean> {
				await browserWindow.collapseBrowserBar();
				return true;
			}
		}
		class PrivilegedFrameBindings extends FrameBindings implements IPrivilegedFrameBindings {
			/**
			 * Returns the browser configuration as an object.
			 */
			public async getConfiguration(): Promise<IBrowserConfiguration> {
				return browserWindow.loadBrowserConfig();
			}
		}
		if (/^about:\/\//.test(this.history.getCurrent().uri)) {
			return new PrivilegedFrameBindings();
		} else {
			return new FrameBindings();
		}
	}


	private readonly statusIndicator = new StatusIndicator();
	/**
	 * The current browser configuration. **Do not access this directly, use `getBrowserConfig()` instead.**
	 */
	private config: IBrowserConfiguration;
	private history = new History();
	private lastViewportScroll: {
		recordedTime: number;
		scrollY: number;
	} = {
		recordedTime: Date.now(),
		scrollY: 0
	};
	/**
	 * Returns `true` if the disclaimer prompt is currently visible.
	 */
	private disclaimerPromptVisible = false;
}
