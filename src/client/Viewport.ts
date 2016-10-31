import IRenderable from './IRenderable';

export default class Viewport implements IRenderable {
	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		return;
	}


	/**
	 * Updates the viewport's height.
	 * @param height The new height in pixels.
	 */
	public updateHeight(height: number): void {
		this.outerElement.style.height = `${height}px`;
	}


	public async renderHTML(headHTML: string, bodyHTML: string): Promise<void> {
		this.outerElement.classList.add('viewport');
		this.outerElement.appendChild(this.frame);
		this.frame.contentWindow.document.head.innerHTML = headHTML;
		this.frame.contentWindow.document.body.innerHTML = bodyHTML;
	}


	private readonly outerElement = document.createElement('div');
	private readonly frame = document.createElement('iframe');
}
