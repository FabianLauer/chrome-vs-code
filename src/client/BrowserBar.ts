import IRenderable from './IRenderable';
import URLBar from './URLBar';
import IconButton from './IconButton';
import Dialog from './Dialog';
import MainMenuDialog from './MainMenuDialog';
import { Event } from '../utils/event';
import { sleep } from '../utils';

/**
 * Controller for the browser top bar.
 */
export default class BrowserBar implements IRenderable {
	constructor(
		public readonly urlBar: URLBar = new URLBar(),
		private renderDialog: (dialog: Dialog) => Promise<void>,
		private openURL: (url: string) => Promise<void>
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
		this.innerWrapper.classList.add('browser-bar-wrapper');
		this.outerElement.appendChild(this.innerWrapper);
		// 'go back' button
		await this.backButton.render();
		this.backButton.setIconAsText('←');
		this.innerWrapper.appendChild(this.backButton.getDOM());
		this.backButton.onClick.bind(() => this.onBackButtonPressed.trigger());
		// 'go forward' button
		await this.forwardButton.render();
		this.forwardButton.setIconAsText('→');
		this.innerWrapper.appendChild(this.forwardButton.getDOM());
		this.forwardButton.onClick.bind(() => this.onForwardButtonPressed.trigger());
		// 'refresh' button
		await this.refreshButton.render();
		this.refreshButton.setIconAsText('⟳');
		this.innerWrapper.appendChild(this.refreshButton.getDOM());
		this.refreshButton.onClick.bind(e => {
			if (e.shiftKey) {
				this.onNoCacheRefreshButtonPressed.trigger();
			} else {
				this.onRefreshButtonPressed.trigger();
			}
		});
		// URL bar
		await this.urlBar.render();
		this.innerWrapper.appendChild(this.urlBar.getDOM());
		// 'go home' button
		await this.homeButton.render();
		this.homeButton.setIconAsText('⌂');
		this.innerWrapper.appendChild(this.homeButton.getDOM());
		this.homeButton.onClick.bind(() => this.onHomeButtonPressed.trigger());
		// menu button
		await this.menuButton.render();
		this.menuButton.setIconAsText('+');
		this.innerWrapper.appendChild(this.menuButton.getDOM());
		this.menuButton.onClick.bind(async () => {
			const dialog = await MainMenuDialog.createMainMenuDialog(this.openURL);
			await this.renderDialog(dialog);
			await dialog.open();
		});
	}


	/**
	 * Checks whether the browser bar is currently collapsed or expanded.
	 */
	public isCollapsed(): boolean {
		return this.outerElement.classList.contains('collapsed');
	}


	/**
	 * Collapses the browser bar and returns when the animation is complete.
	 */
	public async collapse(): Promise<void> {
		this.outerElement.classList.add('collapsed');
		return sleep(200);
	}


	/**
	 * Expands the browser bar and returns when the animation is complete.
	 */
	public async expand(): Promise<void> {
		this.outerElement.classList.remove('collapsed');
		return sleep(200);
	}


	public showLoadingIndicator(): void {
		this.urlBar.showLoadingIndicator();
	}


	public async showLoadingProgress(percentComplete: number): Promise<void> {
		return this.urlBar.showLoadingProgress(percentComplete);
	}


	public async hideLoadingIndicator(): Promise<void> {
		return this.urlBar.hideLoadingIndicator();
	}


	public enableHistoryForwardButton(): void {
		this.forwardButton.enable();
	}


	public disableHistoryForwardButton(): void {
		this.forwardButton.disable();
	}


	public enableHistoryBackButton(): void {
		this.backButton.enable();
	}


	public disableHistoryBackButton(): void {
		this.backButton.disable();
	}


	private readonly outerElement = document.createElement('div');
	private readonly innerWrapper = document.createElement('div');
	private readonly backButton = new IconButton();
	private readonly forwardButton = new IconButton();
	private readonly homeButton = new IconButton();
	private readonly refreshButton = new IconButton();
	private readonly menuButton = new IconButton();
}
