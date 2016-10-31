import IRenderable from './IRenderable';
import { Event } from '../utils/event';

export default class Viewport implements IRenderable {
	/**
	 * Triggered after the viewport has navigated to another page.
	 */
	public readonly onAfterNavigation = new Event<(uri: string) => void>();
	/**
	 * Triggered when navigation is requested by the user, for example when clicking a link.
	 */
	public readonly onRequestNavigation = new Event<(targetURI: string) => void>();


	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('viewport');
		this.createNewFrame();
	}


	/**
	 * Updates the viewport's height.
	 * @param height The new height in pixels.
	 */
	public updateHeight(height: number): void {
		this.outerElement.style.height = `${height}px`;
	}


	public async renderHTML(headHTML: string, bodyHTML: string): Promise<void> {
		this.createNewFrame();
		this.frame.contentWindow.document.head.innerHTML = headHTML;
		this.frame.contentWindow.document.body.innerHTML = bodyHTML;
		this.frame.contentWindow.onclick = e => {
			e.preventDefault();
			e.stopPropagation();
			const target: HTMLAnchorElement = <HTMLAnchorElement>e.target;
			if (
				target instanceof (<any>this.frame.contentWindow).HTMLAnchorElement &&
				target.tagName.toLowerCase() === 'a'
			) {
				this.onRequestNavigation.trigger(target.href);
			}
		};
		this.overwriteBeforeUnloadInFrame();
		this.overwriteBeforeUnloadInFrame();
	}


	private createNewFrame(): void {
		if (this.frame instanceof HTMLElement) {
			this.frame.remove();
		}
		this.frame = document.createElement('iframe');
		this.overwriteBeforeUnloadInFrame();
		this.outerElement.appendChild(this.frame);
	}


	private overwriteBeforeUnloadInFrame(): void {
		if (typeof this.frame.contentWindow !== 'object' || this.frame.contentWindow === null) {
			return;
		}
		this.frame.contentWindow.onbeforeunload = () => {
			console.log('unload');
		};
	}


	private readonly outerElement = document.createElement('div');
	private frame: HTMLIFrameElement;
}
