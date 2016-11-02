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


	/**
	 * Updates the button's text content.
	 * @param text The new text content. When this is `undefined`, the current text content will be removed.
	 */
	public setText(text: string | void): void {
		if (typeof text !== 'string' || text.length === 0) {
			this.textElement.textContent = '';
			this.outerElement.classList.remove('has-text');
		} else {
			this.textElement.textContent = text;
			this.outerElement.classList.add('has-text');
		}
	}


	/**
	 * Updates the button's icon using a character as the icon.
	 * @param text The new icon. When this is `undefined`, the button's icon will be removed.
	 */
	public setIconAsText(icon: string | void): void {
		this.setIcon(undefined);
		if (typeof icon !== 'string' || icon.length === 0) {
			this.iconElement.innerText = '';
			this.outerElement.classList.remove('has-text-icon');
		} else {
			this.iconElement.innerText = icon;
			this.outerElement.classList.add('has-text-icon');
		}
	}


	/**
	 * Updates the button's icon using an icon name provided by the available icon font.
	 * @param text The new icon. When this is `undefined`, the button's icon will be removed.
	 */
	public setIcon(iconName: string | void): void {
		this.iconElement.innerText = '';
		this.iconName = iconName;
		if (typeof iconName !== 'string' || iconName.length === 0) {
			this.iconElement.classList.remove(`icon-${iconName}`);
			this.outerElement.classList.remove('has-icon');
		} else {
			this.iconName = iconName;
			this.iconElement.classList.add(`icon-${iconName}`);
			this.outerElement.classList.add('has-icon');
		}
	}


	/**
	 * Returns `true` when the button is enabled, `false` if not.
	 */
	public isEnabled(): boolean {
		return !this.outerElement.classList.contains('disabled');
	}


	/**
	 * Enables the button. When enabled, the button's `onClick` event can be triggered.
	 */
	public enable(): void {
		this.outerElement.classList.remove('disabled');
		this.onClick.unsuspend();
	}


	/**
	 * Disables the button. When disabled, the button's `onClick` event is suspended.
	 */
	public disable(): void {
		this.outerElement.classList.add('disabled');
		this.onClick.suspend();
	}


	private wasRendered = false;
	private readonly outerElement = document.createElement('div');
	private readonly iconElement = document.createElement('div');
	private readonly textElement = document.createElement('div');
	private iconName: string | void;
	private clickListener: (e: MouseEvent) => void;
}
