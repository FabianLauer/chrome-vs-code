import IRenderable from './IRenderable';
import { Event } from '../utils/event';
import { sleep } from '../utils';

declare function escape(str: string): string;

export default class Viewport implements IRenderable {
	/**
	 * Triggered after the viewport has navigated to another page.
	 */
	public readonly onAfterNavigation = new Event<(uri: string) => void>();

	/**
	 * Triggered when navigation is requested by the user, for example when clicking a link.
	 */
	public readonly onRequestNavigation = new Event<(targetURI: string) => void>();

	/**
	 * Triggered when the viewport is scrolling.
	 */
	public readonly onScroll = new Event<() => void>();


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
	 * @param animated Whether to animate the height change or not.
	 */
	public async updateHeight(height: number, animated: boolean): Promise<void> {
		if (animated) {
			this.outerElement.classList.add('animate-height');
			await sleep(10);
		}
		this.outerElement.style.height = `${height}px`;
		if (animated) {
			await sleep(200);
			this.outerElement.classList.remove('animate-height');
			await sleep(10);
		}
	}


	public async renderHTML(html: string): Promise<void> {
		// this.createNewFrame(`data:text/html;charset=utf-8,${escape(html)}`);
		this.createNewFrame(html);
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
		this.frame.contentWindow.addEventListener('scroll', () => this.onScroll.trigger());
	}


	/**
	 * Returns the viewports current scroll offsets.
	 */
	public getScroll(): { readonly x: number; readonly y: number; } {
		if (!(this.frame instanceof HTMLElement)) {
			return {
				x: undefined,
				y: undefined
			};
		}
		return {
			x: this.frame.contentWindow.scrollX,
			y: this.frame.contentWindow.scrollY
		};
	}


	private createNewFrame(src?: string): void {
		if (this.frame instanceof HTMLElement) {
			this.frame.remove();
		}
		this.frame = document.createElement('iframe');
		if (typeof src === 'string') {
			(<any>this.frame).srcdoc = src;
		}
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
