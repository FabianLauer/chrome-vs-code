import IRenderable from 'client/IRenderable';
import { Event } from 'utils/event';

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


	private readonly outerElement = document.createElement('div');
	private readonly input = document.createElement('input');
}
