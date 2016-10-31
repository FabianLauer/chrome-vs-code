import IRenderable from 'client/IRenderable';

export default class IconButton implements IRenderable {
	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('icon-button');
	}


	private outerElement = document.createElement('div');
}
