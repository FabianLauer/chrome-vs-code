import IRenderable from './IRenderable';
import { Event } from '../utils/event';

/**
 * The browser's URL bar component.
 */
export default class URLBar implements IRenderable {
	/**
	 * Triggered when the URL bar's value has changed.
	 */
	public readonly onChange = new Event<() => void>();


	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('url-bar');
		// loading bar
		this.loadingBar.classList.add('loading-bar');
		this.hideLoadingIndicator();
		this.outerElement.appendChild(this.loadingBar);
		// input
		this.input.addEventListener('keyup', (e) => {
			// trigger change event on enter
			if (e.keyCode === 13) {
				this.onChange.trigger();
				this.input.blur();
			}
		});
		this.input.placeholder = 'Enter an address';
		this.outerElement.appendChild(this.input);
	}


	/**
	 * Returns the current URL as a string.
	 */
	public getURL(): string {
		return this.input.value;
	}


	/**
	 * Updates the URL bar's current value.
	 * @param url The new URL to show in the URL bar.
	 * @param triggerChangeEvent Whether to trigger the URL bar's change event or not.
	 */
	public async setURL(url: string, triggerChangeEvent = false): Promise<void> {
		this.input.value = url;
	}


	/**
	 * Shows an infinite loading indicator in the URL bar.
	 */
	public showLoadingIndicator(): void {
		this.loadingBar.classList.add('visible', 'infinite');
	}


	/**
	 * Shows a progress loading indicator in the URL bar.
	 * @param percentComplete The progress percentage.
	 */
	public async showLoadingProgress(percentComplete: number): Promise<void> {
		return new Promise<void>(resolve => {
			this.loadingBar.classList.remove('infinite');
			this.loadingBar.classList.add('visible');
			if (this.loadingBar.style.width === `${percentComplete}%`) {
				resolve();
				return;
			}
			this.loadingBar.style.width = `${percentComplete}%`;
			setTimeout(resolve, 200);
		});
	}


	/**
	 * Hides the loading indicator (infinite or progress).
	 */
	public async hideLoadingIndicator(): Promise<void> {
		return new Promise<void>(resolve => {
			this.loadingBar.classList.remove('visible', 'infinite');
			setTimeout(() => {
				this.loadingBar.style.width = '0%';
				resolve();
			}, 200);
		});
	}


	private readonly outerElement = document.createElement('div');
	private readonly loadingBar = document.createElement('div');
	private readonly input = document.createElement('input');
}
