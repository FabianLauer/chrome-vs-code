///
/// User Prompts API Imeplemntation
/// Spec: http://w3c.github.io/html/webappapis.html#user-prompts
///

import Dialog from '../Dialog';
import Button from '../Button';
import BrowserWindow from '../BrowserWindow';


async function addCloseButtonToDialog(dialog: Dialog, text = 'Close'): Promise<Button> {
	const button = new Button();
	await dialog.addButton(button);
	button.setText(text);
	button.onClick.once(() => dialog.close());
	return button;
}


/**
 * Creates a dialog that implements `window.alert`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-alert
 */
async function alert(browserWindow: BrowserWindow, message?: any): Promise<void> {
	const dialog = await Dialog.create();
	dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
	dialog.setContentAsText(message || '');
	await addCloseButtonToDialog(dialog, 'OK');
	browserWindow.renderDialog(dialog);
	await dialog.open();
}


/**
 * Creates a dialog that implements `window.confirm`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-confirm
 */
async function confirm(browserWindow: BrowserWindow, message?: any): Promise<boolean> {
	return new Promise<boolean>(async resolve => {
		const dialog = await Dialog.create();
		dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
		dialog.setContentAsText(message || '');
		const yesButton = await addCloseButtonToDialog(dialog, 'Yes');
		yesButton.onClick.once(() => resolve(true));
		const noButton = await addCloseButtonToDialog(dialog, 'No');
		noButton.onClick.once(() => resolve(false));
		browserWindow.renderDialog(dialog);
		await dialog.open();
	});
}


/**
 * Initializes the 'User Prompts' implementations on a certain window.
 * @param window The window to initialize the API on.
 */
export default function initialize(browserWindow: BrowserWindow, window: Window): void {
	window.alert = (message?: any) => alert(browserWindow, message);
	window.confirm = <any>((message?: any) => confirm(browserWindow, message));
}
