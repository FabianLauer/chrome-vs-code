import IRenderable from './IRenderable';
import URLBar from './URLBar';
import IconButton from './IconButton';
import { Event } from '../utils/event';

/**
 * Controller for the browser top bar.
 */
export default class BrowserBar implements IRenderable {
	constructor(
		public readonly urlBar: URLBar = new URLBar()
	) { }


	/**
	 * Triggered when the browser bar's 'go back' navigation button was pressed.
	 */
	public onBackButtonPressed = new Event<() => void>();

	/**
	 * Triggered when the browser bar's 'go forward' navigation button was pressed.
	 */
	public onForwardButtonPressed = new Event<() => void>();

	/**
	 * Triggered when the browser bar's 'go home' navigation button was pressed.
	 */
	public onHomeButtonPressed = new Event<() => void>();

	/**
	 * Triggered when the browser bar's 'refresh' navigation button was pressed.
	 */
	public onRefreshButtonPressed = new Event<() => void>();

	/**
	 * Triggered when the browser bar's 'refresh without cache' navigation button was pressed.
	 */
	public onNoCacheRefreshButtonPressed = new Event<() => void>();


	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('browser-bar');
		// 'go back' button
		await this.backButton.render();
		this.outerElement.appendChild(this.backButton.getDOM());
		this.backButton.getDOM().addEventListener('click', () => this.onBackButtonPressed.trigger());
		// 'go forward' button
		await this.forwardButton.render();
		this.outerElement.appendChild(this.forwardButton.getDOM());
		this.forwardButton.getDOM().addEventListener('click', () => this.onForwardButtonPressed.trigger());
		// 'refresh' button
		await this.refreshButton.render();
		this.outerElement.appendChild(this.refreshButton.getDOM());
		this.refreshButton.getDOM().addEventListener('click', e => {
			if (e.shiftKey) {
				this.onNoCacheRefreshButtonPressed.trigger();
			} else {
				this.onRefreshButtonPressed.trigger();
			}
		});
		// URL bar
		await this.urlBar.render();
		this.outerElement.appendChild(this.urlBar.getDOM());
		// 'go home' button
		await this.homeButton.render();
		this.outerElement.appendChild(this.homeButton.getDOM());
		this.homeButton.getDOM().addEventListener('click', () => this.onHomeButtonPressed.trigger());
	}


	public showLoadingIndicator(): void {
		this.urlBar.showLoadingIndicator();
	}


	public showLoadingProgress(percentComplete: number): void {
		this.urlBar.showLoadingProgress(percentComplete);
	}


	public hideLoadingIndicator(): void {
		this.urlBar.hideLoadingIndicator();
	}


	private readonly outerElement = document.createElement('div');
	private readonly backButton = new IconButton();
	private readonly forwardButton = new IconButton();
	private readonly homeButton = new IconButton();
	private readonly refreshButton = new IconButton();
}
