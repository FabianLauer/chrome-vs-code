import * as http from 'http';
import HTTPServer from './HTTPServer';
import FileReader from './FileReader';
import { format } from 'url';

declare function unescape(str: string): string;

export default class Server {
	/**
	 * @param browserHTML An object that reads the main HTML file for the browser client.
	 * @param browserJS An object that reads the main JS file for the browser client.
	 * @param browserCSS An object that reads the main CSS file for the browser client.
	 * @param aboutPages An array containing readers for the `about:` pages.
	 */
	public constructor(
		private browserHTML: FileReader<string>,
		private browserJS: FileReader<string>,
		private browserCSS: FileReader<string>,
		private aboutPages: Array<{ name: string; reader: FileReader<string> }>
	) {
		this.createFileReaderRoute('/', 'text/html', this.browserHTML);
		this.createFileReaderRoute('/browser.js', 'text/javascript', this.browserJS);
		this.createFileReaderRoute('/browser.css', 'text/css', this.browserCSS);
		const createProxyHandler = (base: boolean) => {
			return async (
				request: http.IncomingMessage,
				response: http.ServerResponse
			) => {
				var query = unescape(HTTPServer.createURLFromString(request.url).query.replace(/\?/, ''));
				const url = HTTPServer.createURLFromString(query);
				// normalize the URL
				query = format(url);
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
		this.httpServer.addHandler(HTTPServer.createURLFromString('/config'), (request, response) => {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/json');
			response.end(JSON.stringify({
				home: 'about://web-api-tests'
			}));
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
	 * Simple logging utility.
	 */
	private log(message: string): void {
		process.stdout.write(`(server) ${message || 'empty message'} \n`);
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
			this.log(`[404 -> proxy]: ${request.url}`);
			this.delegateToProxy(`${this.previousBaseURL}/${request.url}`, request, response);
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
		switch (HTTPServer.createURLFromString(requestURL).protocol) {
			case 'http:':
			case 'https:':
				return this.delegateToHttpProxy(requestURL, request, response);
			case 'about:':
				return this.delegateToAboutProxy(requestURL, request, response);
			default:
				this.respondTo404(response);
				break;
		}
	}


	private async delegateToHttpProxy(requestURL: string, request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
		return new Promise<void>(resolve => {
			var requestFn: typeof http.get = require('follow-redirects').http.get;
			if (HTTPServer.createURLFromString(requestURL).protocol === 'https:') {
				requestFn = require('follow-redirects').https.get;
			}
			requestFn(requestURL, clientResponse => {
				response.statusCode = clientResponse.statusCode;
				response.setHeader('actual-uri', (<any>clientResponse).responseUrl);
				for (const headerName in clientResponse.headers) {
					response.setHeader(headerName, clientResponse.headers[headerName]);
				}
				this.log(`[proxy: ${clientResponse.statusCode}] ${requestURL}`);
				clientResponse.on('data', (data: Buffer) => response.write(data));
				clientResponse.on('end', () => response.end());
				resolve();
			});
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
