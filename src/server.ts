import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as url from 'url';

declare function unescape(str: string): string;

function loadBrowserJS(): string {
	return cp.execSync('browserify ./out/src/browser.js').toString();
}

const server = http.createServer((request, response) => {
	const parsedUrl = url.parse(request.url);
	switch (parsedUrl.pathname) {
		case '':
		case '/':
			response.statusCode = 200;
			response.end(fs.readFileSync('./src/browser.html').toString());
			break;
		case '/browser.js':
			response.statusCode = 200;
			response.end(loadBrowserJS());
			break;
		case '/load':
			loadURL(unescape(parsedUrl.query.replace(/\?/, '')), request, response);
			break;
		default:
			if (/\/[a-zA-Z]+\.less/.test(request.url)) {
				response.statusCode = 200;
				response.end(fs.readFileSync(`./src${request.url}`).toString());
				break;
			}
			response.statusCode = 404;
			response.end('');
			break;
	}
	console.log(response.statusCode, request.url, parsedUrl.pathname);
});

server.listen(8080, 'localhost');


function loadURL(requestURL: string, request: http.IncomingMessage, response: http.ServerResponse): void {
	var requestFn: typeof http.get = http.get;
	if (url.parse(requestURL).protocol === 'https:') {
		requestFn = https.get;
	}
	requestFn(requestURL, clientResponse => {
		response.statusCode = clientResponse.statusCode;
		console.log('[load]', requestURL, clientResponse.statusCode);
		clientResponse.on('data', (data: Buffer) => response.write(data));
		clientResponse.on('end', () => response.end());
	});
}
