import * as http from 'http';
import HTTPServer from './HTTPServer';

export default class Server {
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


	private httpServer = new HTTPServer(
		this.handle404.bind(this),
		this.handle500.bind(this)
	);
}
