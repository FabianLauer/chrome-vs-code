import IRenderable from './IRenderable';

export default class IconButton implements IRenderable {
	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('icon-button');
	}


	public setIconAsText(icon: string): void {
		this.outerElement.innerText = icon;
	}


	private outerElement = document.createElement('div');
}
