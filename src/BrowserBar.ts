import IRenderable from './IRenderable';
import URLBar from './URLBar';

/**
 * Controller for the browser top bar.
 */
export default class BrowserBar implements IRenderable {
	constructor(
		public readonly urlBar: URLBar = new URLBar()
	) { }


	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('browser-bar');
		await this.urlBar.render();
		this.outerElement.appendChild(this.urlBar.getDOM());
	}


	private outerElement = document.createElement('div');
}
