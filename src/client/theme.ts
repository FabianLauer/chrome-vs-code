/**
 * This function is called by the extensions HTML preview.
 * @param theme The theme to set.
 */
export default function setChromeVSCodeTheme(theme: 'light' | 'dark' | 'high-contrast') {
	switch (theme) {
		default:
		case 'light':
			document.body.classList.add(`vscode-light`);
			document.body.classList.remove(`vscode-dark`);
			document.body.classList.remove(`vscode-high-contrast`);
			break;
		case 'dark':
			document.body.classList.add(`vscode-dark`);
			document.body.classList.remove(`vscode-light`);
			document.body.classList.remove(`vscode-high-contrast`);
			break;
		case 'high-contrast':
			document.body.classList.add(`vscode-high-contrast`);
			document.body.classList.remove(`vscode-light`);
			document.body.classList.remove(`vscode-dark`);
			break;
	}
}

(<any>window).setChromeVSCodeTheme = setChromeVSCodeTheme;
