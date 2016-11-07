import * as http from 'http';
import HTTPServer from './HTTPServer';
import FileReader from './FileReader';
import IBrowserConfiguration from './IBrowserConfiguration';
import { Url, format } from 'url';
const normalizeStringUrl: (url: string) => string = require('normalize-url');

declare function unescape(str: string): string;


function normalizeUrl(url: string | Url): string {
	if (typeof url !== 'string') {
		url = format(url);
	}
	return normalizeStringUrl(url);
}


export default class Server {
	/**
	 * @param browserJS An object that reads the main JS file for the browser client.
	 * @param browserCSS An object that reads the main CSS file for the browser client.
	 * @param aboutPages An array containing readers for the `about:` pages.
	 * @param logFunction A function that performs message logging.
	 * @param getConfig A function that returns an object with browser configuration data.
	 * @param updateConfig A function that updates the browser configuration.
	 */
	public constructor(
		private browserJS: FileReader<string>,
		private browserCSS: FileReader<string>,
		private aboutPages: Array<{ name: string; reader: FileReader<string> }>,
		private logFunction: (message: string) => void,
		private getConfig: () => IBrowserConfiguration | Promise<IBrowserConfiguration>,
		private updateConfig: (data: { [section: string]: { [key: string]: any; }; }) => void | Promise<void>
	) {
		this.httpServer.addHandler(HTTPServer.createURLFromString('/'), (request, response) => {
			response.statusCode = 200;
			response.end(`
				<!DOCTYPE html>
				<html>
					<head>
						<meta charset="utf-8" />
					</head>
					<body class="vscode-light">
						<link rel="stylesheet" type="text/css" href="browser.css">
						<script src="browser.js"></script>
					</body>
				</html>
			`);
		});
		this.createFileReaderRoute('/browser.js', 'text/javascript', this.browserJS);
		this.createFileReaderRoute('/browser.css', 'text/css', this.browserCSS);
		const createProxyHandler = (base: boolean) => {
			return async (
				request: http.IncomingMessage,
				response: http.ServerResponse
			) => {
				var query = unescape(HTTPServer.createURLFromString(request.url).query.replace(/\?/, ''));
				const url = this.convert(HTTPServer.createURLFromString(query));
				// normalize the URL
				query = normalizeUrl(url);
				if (base) {
					this.previousBaseURL = `${url.protocol}//${url.host}/`;
				}
				await this.delegateToProxy(query, request, response);
			};
		};
		this.httpServer.addHandler(
			HTTPServer.createURLFromString('/load'),
			createProxyHandler(false)
		);
		this.httpServer.addHandler(
			HTTPServer.createURLFromString('/load/base'),
			createProxyHandler(true)
		);
		this.httpServer.addHandler(HTTPServer.createURLFromString('/config/read'), async (request, response) => {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/json');
			response.end(JSON.stringify(await this.getConfig()));
		});
		this.httpServer.addHandler(HTTPServer.createURLFromString('/config/write'), async (request, response) => {
			const parsedURL = HTTPServer.createURLFromString(request.url);
			const data = JSON.parse(unescape(parsedURL.query));
			if (typeof data !== 'object' || data === null || Object.keys(data).length === 0) {
				this.log('blocked invalid request to update config');
				this.respondTo500(response);
			}
			await this.updateConfig(data);
			response.statusCode = 200;
			response.end();
		});
	}


	/**
	 * Starts the server.
	 * @param hostname The hostname to listen to.
	 * @param port The port to listen to.
	 */
	public async start(hostname: string, port: number): Promise<void> {
		this.log('starting...');
		await this.httpServer.listen(hostname, port);
		this.log('...started!');
	}


	/**
	 * Stops the server.
	 */
	public stop(): void {
		this.log('stopping...');
		this.httpServer.stop();
		this.log('...stopped!');
	}


	/**
	 * Checks if this server is listening to a certain URL.
	 */
	private isListeningTo(url: string | Url): boolean {
		if (typeof url === 'string') {
			url = HTTPServer.createURLFromString(url);
		}
		// If the URL contains a port, check if the URL is actually an URL our HTTP server is listening to. If that's the case,
		// cancel the request immediately.
		if (
			typeof url.port === 'string' && url.port.length > 0 &&
			this.httpServer.isListeningTo(url.hostname, parseInt(url.port, 10))
		) {
			return true;
		}
	}


	private convert(url: string | Url): Url {
		if (typeof url === 'string') {
			url = HTTPServer.createURLFromString(url);
		}
		if (
			typeof this.previousBaseURL !== 'string' ||
			this.previousBaseURL.length < 1 ||
			!this.isListeningTo(url)
		) {
			return url;
		}
		const previousBaseURL = HTTPServer.createURLFromString(this.previousBaseURL);
		url.protocol = previousBaseURL.protocol;
		url.host = previousBaseURL.host;
		url.port = previousBaseURL.port;
		return url;
	}


	/**
	 * Simple logging utility.
	 */
	private log(message: string): void {
		this.logFunction(`(server) ${message || 'empty message'} \n`);
	}


	/**
	 * Creates a request handler for a certain URL that will respond the content of
	 * a given file reader object. The response status code will always be `200`. 
	 * @param url The URL to create the handler for.
	 * @param contentType The value of the content type header to respond.
	 * @param reader The object to read the response text for.
	 */
	private createFileReaderRoute(url: string, contentType: string, reader: FileReader<string>): void {
		this.httpServer.addHandler(HTTPServer.createURLFromString(url), async (request, response) => {
			response.statusCode = 200;
			response.setHeader('Content-Type', contentType);
			response.end(await reader.getContent());
		});
	}


	private async respondWithStatusCodeAboutPage(statusCode: number, response: http.ServerResponse): Promise<void> {
		response.statusCode = statusCode;
		response.setHeader('Content-Type', 'text/html');
		const page = this.aboutPages.find(aboutPage => aboutPage.name === statusCode.toString());
		if (typeof page === 'object' && page !== null) {
			response.end(await page.reader.getContent());
		} else {
			response.end();
		}
	}


	private async respondTo404(response: http.ServerResponse): Promise<void> {
		return this.respondWithStatusCodeAboutPage(404, response);
	}


	private async respondTo500(response: http.ServerResponse): Promise<void> {
		return this.respondWithStatusCodeAboutPage(500, response);
	}


	/**
	 * Handles 404 errors from `this.httpServer`.
	 */
	private handle404(request: http.IncomingMessage, response: http.ServerResponse): void {
		if (typeof this.previousBaseURL === 'string' && !(/^[a-z]+:\//.test(request.url))) {
			const url = normalizeUrl(HTTPServer.createURLFromString(`${this.previousBaseURL}/${request.url}`));
			this.log(`[404 -> proxy]: ${url}`);
			this.delegateToProxy(url, request, response);
		} else {
			this.log(`[404]: ${HTTPServer.urlToString(request.url)}`);
			this.respondTo404(response);
		}
	}


	/**
	 * Handles 500 errors from `this.httpServer`.
	 */
	private handle500(error: Error, request: http.IncomingMessage, response: http.ServerResponse): void {
		this.log(`[500]: ${HTTPServer.urlToString(request.url)}: ${error}`);
		this.respondTo500(response);
	}


	private async delegateToProxy(requestURL: string, request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
		if (this.isListeningTo(requestURL)) {
			return this.respondTo404(response);
		}
		const parsedURL = HTTPServer.createURLFromString(requestURL);
		switch (parsedURL.protocol) {
			case 'http:':
			case 'https:':
				return this.delegateToHttpProxy(requestURL, request, response);
			case 'about:':
				return this.delegateToAboutProxy(requestURL, request, response);
			default:
				return this.respondTo404(response);
		}
	}


	private async delegateToHttpProxy(requestURL: string, request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
		return new Promise<void>(resolve => {
			var requestFn: typeof http.request = require('follow-redirects').http.get;
			const parsedRequestURL = HTTPServer.createURLFromString(requestURL);
			if (parsedRequestURL.protocol === 'https:') {
				requestFn = require('follow-redirects').https.get;
			}
			delete request.headers.referer;
			delete request.headers.Referer;
			delete request.headers.host;
			delete request.headers.Host;
			delete request.headers.cookie;
			delete request.headers.Cookie;
			request.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36';
			const options: http.RequestOptions = {
				hostname: parsedRequestURL.hostname,
				path: parsedRequestURL.path,
				headers: request.headers
			};
			const clientRequest = requestFn(options, clientResponse => {
				response.statusCode = clientResponse.statusCode;
				response.setHeader('actual-uri', normalizeUrl((<any>clientResponse).responseUrl));
				delete clientResponse.headers['x-frame-options'];
				delete clientResponse.headers['content-security-policy'];
				for (const headerName in clientResponse.headers) {
					response.setHeader(headerName, clientResponse.headers[headerName]);
				}
				this.log(`[proxy: ${clientResponse.statusCode}] ${requestURL}`);
				clientResponse.on('data', (data: Buffer) => response.write(data));
				clientResponse.on('end', () => response.end());
				resolve();
			});
			clientRequest.on('error', (error: any) => {
				if (
					typeof error === 'object' &&
					(error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')
				) {
					this.respondTo404(response);
				} else {
					this.respondTo500(response);
				}
				this.log(`[proxy: error] ${requestURL} : ${error.toString()}`);
			});
			clientRequest.end();
		});
	}


	private async delegateToAboutProxy(requestURL: string, request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
		const name = requestURL.replace(/^about:\/+/, '');
		const page = this.aboutPages.find(aboutPage => aboutPage.name === name);
		if (typeof page !== 'object' || page === null) {
			await this.respondTo404(response);
		} else {
			response.statusCode = 200;
			response.end(await page.reader.getContent());
		}
		this.log(`[about: ${response.statusCode}] ${requestURL}`);
	}


	private httpServer = new HTTPServer(
		this.handle404.bind(this),
		this.handle500.bind(this),
		error => {
			this.log(`ERROR: ${error}`);
		}
	);

	private previousBaseURL: string;
}
