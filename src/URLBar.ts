import IRenderable from './IRenderable';
import { Event } from './event';

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
		this.outerElement.addEventListener('keyup', (e) => {
			// trigger change event on enter
			if (e.keyCode === 13) {
				this.onChange.trigger();
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


	private outerElement = document.createElement('div');
	private input = document.createElement('input');
}
