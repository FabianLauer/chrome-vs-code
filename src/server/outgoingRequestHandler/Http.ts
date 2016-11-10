import OutgoingRequestHandler from '../OutgoingRequestHandler';
import IVirtualRequest from '../IVirtualRequest';
import { parse as parseUrl } from 'url';
import { IncomingMessage, ServerResponse, request as httpRequest, RequestOptions } from 'http';

@OutgoingRequestHandler.register((virtualRequest, request) => {
	const protocol = parseUrl(virtualRequest.url).protocol;
	return protocol === 'http:' || protocol === 'https:' ? 1 : 0;
})
export default class Http extends OutgoingRequestHandler {
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
		return new Promise<void>(resolve => {
			var requestFn: typeof httpRequest = require('follow-redirects').http.get;
			const parsedRequestURL = parseUrl(virtualRequest.url);
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
			const options: RequestOptions = {
				hostname: parsedRequestURL.hostname,
				path: parsedRequestURL.path,
				headers: request.headers
			};
			const clientRequest = requestFn(options, clientResponse => {
				response.statusCode = clientResponse.statusCode;
				response.setHeader('actual-uri', (<any>clientResponse).responseUrl);
				delete clientResponse.headers['x-frame-options'];
				delete clientResponse.headers['content-security-policy'];
				for (const headerName in clientResponse.headers) {
					response.setHeader(headerName, clientResponse.headers[headerName]);
				}
				this.log(`[proxy: ${clientResponse.statusCode}] ${virtualRequest.url}`);
				clientResponse.on('data', (data: Buffer) => response.write(data));
				clientResponse.on('end', () => response.end());
				resolve();
			});
			clientRequest.on('error', (error: any) => {
				if (
					typeof error === 'object' &&
					(error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED')
				) {
					this.autoRespond(404, request, response);
				} else {
					this.autoRespond(500, request, response);;
				}
				this.log(`[proxy: error] ${virtualRequest.url} : ${error.toString()}`);
			});
			clientRequest.end();
		});
	}
}
