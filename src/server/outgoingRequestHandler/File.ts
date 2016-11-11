import OutgoingRequestHandler from '../OutgoingRequestHandler';
import IVirtualRequest from '../IVirtualRequest';
import { parse as parseUrl, Url } from 'url';
import { IncomingMessage, ServerResponse } from 'http';
import { readFile, readdir, stat, Stats } from 'fs';
import * as mime from '../util/mime';

/**
 * Request handler for `file://` URLs.
 */
@OutgoingRequestHandler.register((virtualRequest, request) => {
	const protocol = parseUrl(virtualRequest.url).protocol;
	return protocol === 'file:' ? 1 : 0;
})
export default class File extends OutgoingRequestHandler {
	/**
	 * Handles an incoming request and responds to it.
	 * @param virtualRequest The request data that the browser user gets to see.
	 * @param request The incoming request that should be handled.
	 * @param response The response to write to.
	 */
	protected async handleRequestConcrete(
		virtualRequest: IVirtualRequest,
		request: IncomingMessage,
		response: ServerResponse
	): Promise<void> {
		const url = parseUrl(virtualRequest.url);
		const stats = await File.stat(url.path);
		if (stats.isFile()) {
			return this.handleFileRequest(url, response);
		} else if (stats.isDirectory()) {
			return this.handleDirectoryRequest(url, response);
		} else {
			this.autoRespond(404, request, response);
		}
	}


	private async handleDirectoryRequest(directoryURL: Url, response: ServerResponse): Promise<void> {
		const files = await File.readDir(directoryURL.path);
		files.unshift('.', '..');
		response.statusCode = 200;
		response.setHeader('Content-Type', 'text/html');
		const fileListItems = files.map(file => {
			return `
				<li>
					<a href='file:///${directoryURL.path}/${file}/'>${file}</a>
				</li>
			`;
		}).join('');
		response.end(`
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset='utf-8'>
					<title>${directoryURL.path}</title>
				</head>
				<body>
					<ul>
						${fileListItems}
					</ul>
				</body>
			</html>
		`);
	}


	private async handleFileRequest(fileURL: Url, response: ServerResponse): Promise<void> {
		const content = await File.readFile(fileURL.path);
		response.statusCode = 200;
		response.setHeader('Content-Type', mime.lookup(fileURL.path));
		response.setHeader('Content-Disposition', `inline; filename="${fileURL.pathname}"`);
		response.end(content.toString('base64'));
	}


	/**
	 * Node.js `fs.stat`.
	 */
	private static stat(path: string) {
		return new Promise<Stats>((resolve, reject) => {
			stat(path, (err, stats) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(stats);
			});
		});
	}


	/**
	 * Node.js `fs.readFile`.
	 */
	private static readFile(path: string) {
		return new Promise<Buffer>((resolve, reject) => {
			readFile(path, (err, content) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(content);
			});
		});
	}


	/**
	 * Node.js `fs.readdir`.
	 */
	private static readDir(path: string) {
		return new Promise<string[]>((resolve, reject) => {
			readdir(path, (err, files) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(files);
			});
		});
	}
}
