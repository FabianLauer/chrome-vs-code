import * as http from 'http';
import * as cp from 'child_process';

const browserFile = cp.execSync('browserify ./out/src/browser.js') + ''

const server = http.createServer((request, response) => {
	switch (request.url) {
		default:
			response.statusCode = 404;
			break;
		case '':
		case '/':
			response.statusCode = 200;
			response.end(`
				<!DOCTYPE html>
				<html>
					<head>
						<meta charset="utf-8" />
					</head>
					<body>
						...
						<script src="./browser.js"></script>
					</body>
				</html>
			`);
			break;
		case '/browser.js':
			response.statusCode = 200;
			response.end(browserFile);
			break;
	}
	console.log(response.statusCode, request.url);
});

server.listen(8080, 'localhost');
