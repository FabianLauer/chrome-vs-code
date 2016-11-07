import IRenderable from './IRenderable';
import { Event } from '../utils/event';
import { sleep } from '../utils';
import IFrameBindings from './IFrameBindings';

declare function escape(str: string): string;

export default class Viewport implements IRenderable {
	/**
	 * Creates a new viewport.
	 * @param getFrameBindings A function that creates an `IFrameBindings` object for every
	 *                         frame created by this viewport.
	 */
	public constructor(
		private readonly getFrameBindings: () => IFrameBindings,
		private readonly defaultScrollBehaviour: ScrollBehavior = 'smooth'
	) { }


	/**
	 * Triggered after the viewport has navigated to another page.
	 */
	public readonly onAfterNavigation = new Event<(uri: string) => void>();

	/**
	 * Triggered when the frame starts to navigate.
	 */
	public readonly onBeginNavigation = new Event<() => void>();

	/**
	 * Triggered when the viewport is scrolling.
	 */
	public readonly onScroll = new Event<() => void>();


	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('viewport');
		await this.createNewFrame();
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
		await this.createNewFrame(html);
		this.overwriteBeforeUnloadInFrame();
		this.injectAnchorClickListener();
		// bind scroll listeners
		this.frame.contentWindow.addEventListener('scroll', () => this.onScroll.trigger());
		this.frame.contentWindow.document.addEventListener('scroll', () => this.onScroll.trigger());
		const body = this.frame.contentWindow.document.getElementsByTagName('body')[0];
		if (typeof body === 'object' && body !== null) {
			body.addEventListener('scroll', () => this.onScroll.trigger());
		}
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


	/**
	 * Scrolls the viewport to a fragment.
	 * @param hash The fragment to scroll to.
	 * @param behavior The scroll behavior to use.
	 */
	public jumpToFragment(fragmentIdentifier: string, behavior: ScrollBehavior = this.defaultScrollBehaviour): void {
		fragmentIdentifier = fragmentIdentifier.replace(/^#/, '');
		let target =
			this.frame.contentDocument.getElementById(fragmentIdentifier) ||
			// If the fragment identifier didn't point to an element with an ID, try to find
			// an element with a name attribute that matches the fragment identifier.
			this.frame.contentDocument.querySelector(`[name="${fragmentIdentifier}"]`);
		// Cancel if the fragment couldn't be found.
		if (typeof target === 'undefined' || target === null) {
			return;
		}
		target.scrollIntoView(<ScrollIntoViewOptions>{ behavior: behavior });
	}


	private async createNewFrame(src?: string): Promise<void> {
		await new Promise<void>(async resolve => {
			if (this.frame instanceof HTMLElement) {
				this.frame.remove();
			}
			this.frame = document.createElement('iframe');
			(<any>this.frame).sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
			if (typeof src === 'string') {
				(<any>this.frame).srcdoc = src;
			}
			this.outerElement.appendChild(this.frame);
			if (typeof src === 'string') {
				let iterations = 0;
				let matches = 0;
				while (iterations++ < 1000) {
					if (typeof this.frame.contentWindow === 'object' && this.frame.contentWindow !== null) {
						this.injectFrameBindings();
					}
					if (
						typeof this.frame.contentDocument === 'object' && this.frame.contentDocument !== null &&
						typeof this.frame.contentDocument.body === 'object' && this.frame.contentDocument.body !== null
					) {
						matches += 1;
						if (matches === 2) {
							break;
						}
					}
					await sleep(100);
				}
			}
			resolve();
		});
	}


	private overwriteBeforeUnloadInFrame(): void {
		if (typeof this.frame.contentWindow !== 'object' || this.frame.contentWindow === null) {
			return;
		}
		this.frame.contentWindow.addEventListener('beforeunload', () => {
			this.frame.style.display = 'none';
			this.onBeginNavigation.trigger();
			const loadHandler = () => {
				this.frame.removeEventListener('load', loadHandler);
				this.onAfterNavigation.trigger(this.frame.contentWindow.location.href);
			};
			this.frame.addEventListener('load', loadHandler);
		});
	}


	private injectFrameBindings(): void {
		if (
			// if there's no contentWindow
			typeof this.frame.contentWindow !== 'object' ||
			this.frame.contentWindow === null ||
			// or if the bindings were already created
			typeof (<any>this.frame.contentWindow).vscodeBrowser === 'object' &&
			(<any>this.frame.contentWindow).vscodeBrowser !== null
		) {
			return;
		}
		const members: Array<{
			name: string;
			property: PropertyDescriptor;
		}> = [];
		const bindings = this.getFrameBindings();
		Viewport.bindings.splice(0, Viewport.bindings.length);
		(<any>window).getBinding = (bindingID: number) => Viewport.bindings[bindingID];
		let memberNames: string[] = [];
		let last: any = bindings;
		while (true) {
			last = Object.getPrototypeOf(last);
			if (last === Object.prototype) {
				break;
			}
			memberNames = memberNames.concat(Object.getOwnPropertyNames(last));
		}
		memberNames = memberNames.filter(name => {
			return (
				name !== 'constructor' &&
				typeof bindings[name] === 'function'
			);
		});
		for (const key of memberNames) {
			let value = bindings[key];
			if (typeof bindings[key] === 'function') {
				const bindingID = Viewport.bindings.push(bindings[key]) - 1;
				value = new Function(`return window.parent.getBinding(${bindingID}).apply(undefined, arguments);`);
			}
			members.push({
				name: key,
				property: {
					configurable: false,
					enumerable: false,
					value: value,
					writable: false
				}
			});
		}
		const js = members.map(member => {
			var propertyCode = '{ ';
			for (const key in member.property) {
				propertyCode += `'${key}': ${member.property[key].toString()}, `;
			}
			propertyCode = propertyCode.slice(0, propertyCode.length - 2);
			propertyCode += ' }';
			return `Object.defineProperty(bindings, '${member.name}', ${propertyCode})`;
		}).join(';');
		(<any>this.frame.contentWindow).eval(`
			(function() {
				/* VS Code Browser Injected Bindings */
				'use strict';
				var bindings = {};
				Object.defineProperty(window, 'vscodeBrowser', {
					enumerable: false,
					configurable: false,
					get: () => bindings
				});
				${js};
				bindings.initializeWebAPIs(window).then(function() {
					window.dispatchEvent(new Event('vscodeBrowserBindingsReady'));
				});
			})();
		`);
	}


	private injectAnchorClickListener(): void {
		this.frame.contentWindow.addEventListener('click', event => {
			const target = <HTMLAnchorElement>event.target;
			if (!(target instanceof (<any>this.frame.contentWindow).HTMLAnchorElement)) {
				return;
			}
			/// TODO: This does not find href's that have both hash and path/host.
			if (/^#/.test(target.getAttribute('href'))) {
				event.preventDefault();
				event.stopPropagation();
				this.jumpToFragment(target.getAttribute('href'));
			}
		});
	}


	private readonly outerElement = document.createElement('div');
	private frame: HTMLIFrameElement;
	private static readonly bindings: Array<Function> = [];
}
