import IRenderable from './IRenderable';

export type IVisibilityTicket = number;


export default class StatusIndicator implements IRenderable {
	public getDOM(): HTMLElement {
		return this.outerElement;
	}


	public async render(): Promise<void> {
		this.outerElement.classList.add('status-indicator');
	}


	/**
	 * Shows the status indicator with a certain message.
	 * @param message The message to display.
	 */
	public show(message: string): IVisibilityTicket {
		this.outerElement.classList.add('visible');
		this.outerElement.innerText = message;
		return ++this.lastTicket;
	}


	/**
	 * Hides the status indicator.
	 */
	public hide(ticket: IVisibilityTicket): void {
		if (ticket !== this.lastTicket) {
			return;
		}
		this.outerElement.classList.remove('visible');
		this.outerElement.innerText = '';
	}


	private outerElement = document.createElement('div');
	private lastTicket: IVisibilityTicket = 0;
}
