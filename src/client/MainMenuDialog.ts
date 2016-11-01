import Dialog from './Dialog';
import IconButton from './IconButton';
import { BUG_REPORT_URL } from '../config';


class MainMenuCard extends IconButton {
	public constructor(
		private icon: string,
		private text: string,
		private clickHandler: () => void
	) {
		super();
	}


	public async render(): Promise<void> {
		await super.render();
		this.onClick.bind(this.clickHandler);
		this.setIcon(this.icon);
		const textElement = document.createElement('span');
		textElement.innerText = this.text;
		this.getDOM().appendChild(textElement);
	}
}


export default class MainMenuDialog extends Dialog {
	/**
	 * Creates a new main menu dialog.
	 */
	public static async createMainMenuDialog(openURL: (url: string) => Promise<void>): Promise<Dialog> {
		if (!(this.singletonInstance instanceof MainMenuDialog)) {
			this.singletonInstance = new MainMenuDialog(openURL);
			await this.singletonInstance.render();
		}
		return this.singletonInstance;
	}


	private constructor(
		private urlOpener: (url: string) => Promise<void>
	) {
		super();
	}


	public async render(): Promise<void> {
		if (this.wasRendered()) {
			return;
		}
		await super.render();
		this.outerElement.classList.add('main-menu-dialog');
		const cards = [
			new MainMenuCard('bug', 'Report an Issue', () => this.openURL(BUG_REPORT_URL)),
			new MainMenuCard('info', 'License', () => this.openURL('about://license')),
			new MainMenuCard('checkbox-checked', 'Disclaimer', () => this.openURL('about://disclaimer'))
		];
		for (const card of cards) {
			await card.render();
			this.bodyElement.appendChild(card.getDOM());
		}
	}



	private async openURL(url: string): Promise<void> {
		await Promise.all([
			this.close(),
			this.urlOpener(url)
		]);
	}


	private static singletonInstance: MainMenuDialog;
}
