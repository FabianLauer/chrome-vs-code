import Dialog from '../Dialog';
import BrowserWindow from '../BrowserWindow';

/**
 * Creates a dialog that implements `window.alert`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-alert
 */
async function alert(browserWindow: BrowserWindow, message?: any): Promise<void> {
	const dialog = await Dialog.create();
	dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
	dialog.setContentAsText(message || '');
	browserWindow.renderDialog(dialog);
	await dialog.open();
}


/**
 * Initializes the 'User Prompts' implementations on a certain window.
 * @param window The window to initialize the API on.
 */
export default function initialize(browserWindow: BrowserWindow, window: Window): void {
	window.alert = async function (message?: any) {
		await alert(browserWindow, message);
	};
}
