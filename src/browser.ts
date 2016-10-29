import BrowserWindow from './BrowserWindow';

(async () => {
	const browser = new BrowserWindow();
	await browser.render();
	await browser.load('about://home');
})();
