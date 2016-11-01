import IRenderable from './IRenderable';
import { SmartEvent } from '../utils/event';

export default class Button implements IRenderable {
	/**
	 * Triggered when the button is clicked.
	 */
	public readonly onClick = new SmartEvent<(e: MouseEvent) => void>();


	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		if (this.wasRendered) {
			return;
		}
		this.wasRendered = true;
		this.textElement.classList.add('text');
		this.iconElement.classList.add('icon');
		this.outerElement.classList.add('button');
		this.outerElement.appendChild(this.iconElement);
		this.outerElement.appendChild(this.textElement);
		this.onClick.onBeforeFirstBind.bind(() => {
			this.clickListener = (e: MouseEvent) => this.onClick.trigger(e);
			this.outerElement.addEventListener('click', this.clickListener);
		});
		this.onClick.onAfterLastUnbind.bind(() => {
			this.outerElement.removeEventListener('click', this.clickListener);
			this.clickListener = undefined;
		});
	}


	public setText(text: string): void {
		this.textElement.textContent = text;
	}


	public setIconAsText(icon: string): void {
		this.iconElement.innerText = icon;
	}


	public setIcon(iconName: string): void {
		this.iconElement.innerText = '';
		this.iconElement.classList.add(`icon-${iconName}`);
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


	private wasRendered = false;
	private readonly outerElement = document.createElement('div');
	private readonly iconElement = document.createElement('div');
	private readonly textElement = document.createElement('div');
	private clickListener: (e: MouseEvent) => void;
}
