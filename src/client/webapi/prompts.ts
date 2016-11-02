///
/// User Prompts API Imeplemntation
/// Spec: http://w3c.github.io/html/webappapis.html#user-prompts
///

import Dialog from '../Dialog';
import Button from '../Button';
import BrowserWindow from '../BrowserWindow';


/**
 * Adds a button to a dialog that closes the dialog when pressed.
 * @param dialog The dialog to add the button to.
 * @param text The text to display on the button. Optional.
 * @param append When `true`, the button will be appended to the dialog, otherwise it will
 *               be prepended. Optional.
 */
async function addCloseButtonToDialog(dialog: Dialog, text = 'Close', append = true): Promise<Button> {
	const button = new Button();
	if (append) {
		await dialog.appendButton(button);
	} else {
		await dialog.prependButton(button);
	}
	button.setText(text);
	button.onClick.once(() => dialog.close());
	return button;
}


/**
 * Creates a dialog that implements `window.alert`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-alert
 */
async function alert(browserWindow: BrowserWindow, message?: any): Promise<void> {
	// build the dialog
	const dialog = await Dialog.create();
	dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
	dialog.setContentAsText(message || '');
	// dialog button
	await addCloseButtonToDialog(dialog, 'OK');
	// render and open
	browserWindow.renderDialog(dialog);
	await dialog.open();
}


/**
 * Creates a dialog that implements `window.confirm`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-confirm
 */
async function confirm(browserWindow: BrowserWindow, message?: any): Promise<boolean> {
	return new Promise<boolean>(async resolve => {
		// build the dialog
		const dialog = await Dialog.create();
		dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
		dialog.setContentAsText(message || '');
		// dialog buttons
		const noButton = await addCloseButtonToDialog(dialog, 'No');
		noButton.onClick.once(() => resolve(false));
		const yesButton = await addCloseButtonToDialog(dialog, 'Yes');
		yesButton.onClick.once(() => resolve(true));
		// render and open
		browserWindow.renderDialog(dialog);
		await dialog.open();
	});
}


/**
 * Creates a dialog that implements `window.prompt`.
 * @see http://w3c.github.io/html/webappapis.html#dom-window-prompt
 */
async function prompt(browserWindow: BrowserWindow, message: any, defaultValue: any = ''): Promise<null | string> {
	return new Promise<null | string>(async resolve => {
		// build the dialog's inner DOM
		const messageElement = document.createTextNode(message || '');
		const inputElement = document.createElement('input');
		inputElement.type = 'text';
		inputElement.value = defaultValue;
		// build the dialog
		const dialog = await Dialog.create();
		dialog.setTitle(`'${browserWindow.getHistory().getCurrent().uri}' says:`);
		dialog.setContentAsHTML(messageElement, inputElement);
		// dialog buttons
		const cancelButton = await addCloseButtonToDialog(dialog);
		cancelButton.onClick.once(() => resolve(null));
		const confirmButton = await addCloseButtonToDialog(dialog, 'OK');
		confirmButton.onClick.once(() => resolve(inputElement.value));
		// render and open
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
	window.prompt = <any>((message: any, defaultValue?: any) => prompt(browserWindow, message, defaultValue));
}
