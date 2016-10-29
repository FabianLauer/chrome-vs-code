import BrowserBar from './BrowserBar';
import BrowserFrame from './BrowserFrame';

export default class BrowserWindow {
	constructor(
		private readonly browserBar: BrowserBar = new BrowserBar(),
		private readonly browserFrame: BrowserFrame = new BrowserFrame(),
	) { }


	public async render(): Promise<void> {
		this.browserBar.urlBar.onChange.bind(async () => {
			this.load(await this.browserBar.urlBar.getValue());
		});
		await this.browserBar.render();
		await this.browserFrame.render();
		document.body.appendChild(this.browserBar.getDOM());
		document.body.appendChild(this.browserFrame.getDOM());
	}


	public async load(uri: string): Promise<void> {
		await this.browserBar.urlBar.setValue(uri);
		await this.browserFrame.renderHTML(`<h1>${uri}</h1>`);
	}
}
