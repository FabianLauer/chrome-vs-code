import BrowserWindow from './client/BrowserWindow';
// Import the theme file. We don't need to import any symbols, the file takes care of that itself.
import './client/theme';

(async () => {
	const browser = new BrowserWindow();
	await browser.render();
	await browser.loadInitialPage();
})();
