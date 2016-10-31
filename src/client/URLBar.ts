import IRenderable from './IRenderable';
import { Event } from '../utils/event';

/**
 * Controller for the browser's URL bar.
 */
export default class URLBar implements IRenderable {
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


	public getValue(): string {
		return this.input.value;
	}


	public async setValue(value: string): Promise<void> {
		this.input.value = value;
	}


	public showLoadingIndicator(): void {
		this.loadingBar.classList.add('visible', 'infinite');
	}


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
