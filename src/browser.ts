import BrowserWindow from './client/BrowserWindow';

(async () => {
	const browser = new BrowserWindow();
	await browser.render();
	await browser.load('https://code.visualstudio.com/');
})();
