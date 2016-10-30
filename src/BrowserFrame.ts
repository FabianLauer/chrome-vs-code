import IRenderable from './IRenderable';

/**
 * Controller for the browser top bar.
 */
export default class BrowserBar implements IRenderable {
	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		return;
	}


	public async renderHTML(html: string): Promise<void> {
		this.outerElement.classList.add('browser-frame');
		this.outerElement.appendChild(this.frame);
		this.frame.contentWindow.document.body.innerHTML = html;
	}


	private readonly outerElement = document.createElement('div');
	private readonly frame = document.createElement('iframe');
}
