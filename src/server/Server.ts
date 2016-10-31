import * as http from 'http';
import * as https from 'https';
import HTTPServer from './HTTPServer';
import FileReader from './FileReader';

declare function unescape(str: string): string;

export default class Server {
	/**
	 * @param browserHTML An object that reads the main HTML file for the browser client.
	 * @param browserJS An object that reads the main JS file for the browser client.
	 * @param browserCSS An object that reads the main CSS file for the browser client.
	 */
	public constructor(
		private browserHTML: FileReader<string>,
		private browserJS: FileReader<string>,
		private browserCSS: FileReader<string>
	) {
		this.createFileReaderRoute('/', 'text/html', this.browserHTML);
		this.createFileReaderRoute('/browser.js', 'text/javascript', this.browserJS);
		this.createFileReaderRoute('/browser.css', 'text/css', this.browserCSS);
		this.httpServer.addHandler(
			HTTPServer.createURLFromString('/load'),
			async (
				request: http.IncomingMessage,
				response: http.ServerResponse
			) => {
				const query = unescape(HTTPServer.createURLFromString(request.url).query.replace(/\?/, ''));
				await this.delegateToProxy(query, request, response);
			}
		);
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
			response.setHeader('Content-Type', '');
			response.end(await reader.getContent());
		});
	}


	/**
	 * Handles 404 errors from `this.httpServer`.
	 */
	private handle404(request: http.IncomingMessage, response: http.ServerResponse): void {
		this.log(`[404]: ${HTTPServer.urlToString(request.url)}`);
		response.statusCode = 404;
		response.end();
	}


	/**
	 * Handles 500 errors from `this.httpServer`.
	 */
	private handle500(error: Error, request: http.IncomingMessage, response: http.ServerResponse): void {
		this.log(`[500]: ${HTTPServer.urlToString(request.url)}: ${error}`);
		response.statusCode = 500;
		response.end();
	}


	private async delegateToProxy(requestURL: string, request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
		return new Promise<void>(resolve => {
			var requestFn: typeof http.get = http.get;
			if (HTTPServer.createURLFromString(requestURL).protocol === 'https:') {
				requestFn = https.get;
			}
			requestFn(requestURL, clientResponse => {
				response.statusCode = clientResponse.statusCode;
				this.log(`[proxy: ${clientResponse.statusCode}] ${requestURL}`);
				clientResponse.on('data', (data: Buffer) => response.write(data));
				clientResponse.on('end', () => response.end());
			});
		});
	}


	private httpServer = new HTTPServer(
		this.handle404.bind(this),
		this.handle500.bind(this)
	);
}
