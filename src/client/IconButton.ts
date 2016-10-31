import IRenderable from './IRenderable';
import { SmartEvent } from '../utils/event';

export default class IconButton implements IRenderable {
	/**
	 * Triggered when the icon button is clicked.
	 */
	public readonly onClick = new SmartEvent<(e: MouseEvent) => void>();


	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('icon-button');
		this.onClick.onBeforeFirstBind.bind(() => {
			this.clickListener = (e: MouseEvent) => this.onClick.trigger(e);
			this.outerElement.addEventListener('click', this.clickListener);
		});
		this.onClick.onAfterLastUnbind.bind(() => {
			this.outerElement.removeEventListener('click', this.clickListener);
			this.clickListener = undefined;
		});
	}


	public setIconAsText(icon: string): void {
		this.outerElement.innerText = icon;
	}


	public isEnabled(): boolean {
		return !this.outerElement.classList.contains('disabled');
	}


	public enable(): void {
		this.outerElement.classList.remove('disabled');
		this.onClick.unsuspend();
	}


	public disable(): void {
		this.outerElement.classList.add('disabled');
		this.onClick.suspend();
	}


	private readonly outerElement = document.createElement('div');
	private clickListener: (e: MouseEvent) => void;
}
