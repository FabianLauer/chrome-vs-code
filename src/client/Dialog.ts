import IRenderable from './IRenderable';
import Button from './Button';
import { sleep } from '../utils';

export default class Dialog implements IRenderable {
	/**
	 * Creates a new dialog.
	 */
	public static async create(): Promise<Dialog> {
		const dialog = new Dialog();
		await dialog.render();
		return dialog;
	}


	protected constructor() { /* do nothing */ }


	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		if (this.wasRendered()) {
			return;
		}
		this.rendered = true;
		this.outerElement.classList.add('dialog');
		this.titleElement.classList.add('title');
		this.innerWrapper.appendChild(this.titleElement);
		this.bodyElement.classList.add('body');
		this.innerWrapper.appendChild(this.bodyElement);
		this.bottomBarElement.classList.add('bottom-bar');
		this.innerWrapper.appendChild(this.bottomBarElement);
		this.innerWrapper.classList.add('inner-wrapper');
		this.outerElement.appendChild(this.innerWrapper);
	}


	public getTitle(): string {
		return this.titleElement.textContent.trim();
	}


	public setTitle(title: string): void {
		this.titleElement.textContent = title;
	}


	public getContent(): string {
		return this.bodyElement.innerHTML.trim();
	}


	public setContentAsText(text: string): void {
		this.bodyElement.innerHTML = '';
		this.bodyElement.textContent = text;
	}


	public setContentAsHTML(...html: string[]): void;
	public setContentAsHTML(...html: Array<HTMLElement | Text>): void;
	public setContentAsHTML(...html: any[]): void {
		this.bodyElement.innerHTML = '';
		html.forEach(part => {
			if (typeof part === 'string') {
				this.bodyElement.innerHTML += part;
			} else {
				this.bodyElement.appendChild(part);
			}
		});
	}


	public async prependButton(button: Button): Promise<void> {
		if (this.bottomBarElement.childElementCount === 0) {
			return this.appendButton(button);
		}
		await button.render();
		this.bottomBarElement.insertBefore(button.getDOM(), this.bottomBarElement.firstChild);
	}


	public async appendButton(button: Button): Promise<void> {
		await button.render();
		this.bottomBarElement.appendChild(button.getDOM());
	}


	/**
	 * Checks whether the dialog is currently open or not.
	 */
	public isOpen(): boolean {
		return this.outerElement.classList.contains('open');
	}


	/**
	 * Opens the dialog.
	 */
	public async open(): Promise<void> {
		if (this.isOpen()) {
			return;
		}
		this.outerElement.style.display = 'block';
		await sleep(10);
		this.outerElement.classList.add('open');
		await sleep(200);
	}


	/**
	 * Closes the dialog.
	 */
	public async close(): Promise<void> {
		if (!this.isOpen()) {
			return;
		}
		this.outerElement.classList.remove('open');
		await sleep(200);
		this.outerElement.style.display = '';
		this.outerElement.remove();
	}


	protected wasRendered(): boolean {
		return this.rendered;
	}


	protected outerElement = document.createElement('div');
	protected bodyElement = document.createElement('div');

	private rendered = false;
	private innerWrapper = document.createElement('div');
	private titleElement = document.createElement('div');
	private bottomBarElement = document.createElement('div');
}
