import BrowserWindow from './client/BrowserWindow';

(async () => {
	const browser = new BrowserWindow();
	await browser.render();
	await browser.load('about://web-api-tests');
})();
