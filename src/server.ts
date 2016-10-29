import * as http from 'http';
import * as fs from 'fs';
import * as cp from 'child_process';

function loadBrowserJS(): string {
	return cp.execSync('browserify ./out/src/browser.js').toString();
}

const server = http.createServer((request, response) => {
	switch (request.url) {
		default:
			if (/\/[a-zA-Z]+\.less/.test(request.url)) {
				response.statusCode = 200;
				response.end(fs.readFileSync(`./src${request.url}`).toString());
				break;
			}
			response.statusCode = 404;
			break;
		case '':
		case '/':
			response.statusCode = 200;
			response.end(fs.readFileSync('./src/browser.html').toString());
			break;
		case '/browser.js':
			response.statusCode = 200;
			response.end(loadBrowserJS());
			break;
	}
	console.log(response.statusCode, request.url);
});

server.listen(8080, 'localhost');
