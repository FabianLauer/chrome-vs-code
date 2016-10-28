declare const document: any;

export default class BrowserWindow {
	public async load(uri: string): Promise<void> {
		document.write(uri);
	}
}
