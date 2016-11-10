import { IncomingMessage, ServerResponse } from 'http';
import IVirtualRequest from './IVirtualRequest';

/**
 * Protocol proxies are objects that a server can use to delegate requests to.
 * Depending on its protocol (http, https, file, etc), a request will be handed
 * to an instance of this class. 
 */
abstract class OutgoingRequestHandler {
	/**
	 * Handles an incoming request and responds to it.
	 * @param virtualRequest The request data that the browser user gets to see.
	 * @param request The incoming request that should be handled.
	 * @param response The response to write to.
	 */
	public static async handleRequest(
		virtualRequest: IVirtualRequest,
		request: IncomingMessage,
		response: ServerResponse,
		loggingFunction: (message: string) => void,
		fallbackResponder: (status: number, request: IncomingMessage, response: ServerResponse) => Promise<void>
	): Promise<void> {
		const proxy = await this.getProxy(virtualRequest, request, loggingFunction, fallbackResponder);
		if (!(proxy instanceof OutgoingRequestHandler)) {
			throw new Error('unable to handle request: no matching handler found');
		}
		return proxy.handleRequestConcrete(virtualRequest, request, response);
	}


	protected constructor(
		private readonly loggingFunction: (message: string) => void,
		private readonly fallbackResponder: (status: number, request: IncomingMessage, response: ServerResponse) => Promise<void>
	) { }


	/**
	 * Decorator. Use this to register a protocol proxy for a certain request.
	 * @param score A function that checks whether the decorated proxy is capable of handling
	 *              a certain request. If two or more registered classes are capable to handle
	 *              a request, the one with the highest score is used.
	 */
	protected static register(score: (virtualRequest: IVirtualRequest, request: IncomingMessage) => number) {
		return (proxyClass: typeof OutgoingRequestHandler) => {
			OutgoingRequestHandler.registry.set(score, proxyClass);
		};
	}


	/**
	 * Returns a proxy that can handle a certain request.
	 * @param request The request to get a proxy for.
	 */
	protected static getProxy(
		virtualRequest: IVirtualRequest,
		request: IncomingMessage,
		loggingFunction: (message: string) => void,
		fallbackResponder: (status: number, request: IncomingMessage, response: ServerResponse) => Promise<void>
	): OutgoingRequestHandler {
		// find the best matching proxy by score
		var highest: {
			score: number;
			proxyClass: typeof OutgoingRequestHandler
		} = {
			score: -Infinity,
			proxyClass: undefined
		};
		for (const registered of OutgoingRequestHandler.registry) {
			const score = registered[0](virtualRequest, request);
			if (score > highest.score) {
				highest.score = score;
				highest.proxyClass = registered[1];
			}
		}
		// if no matching proxy was found:
		if (highest.score < 1) {
			return undefined;
		}
		return new (<any>highest.proxyClass)(
			loggingFunction,
			fallbackResponder
		);
	}


	/**
	 * Logs a simple text message.
	 * @param message The message to log.
	 */
	protected log(message: string): void {
		this.loggingFunction(message);
	}


	protected async autoRespond(status: number, request: IncomingMessage, response: ServerResponse): Promise<void> {
		return this.fallbackResponder(status, request, response);
	}


	/**
	 * Handles an incoming request and responds to it.
	 * @param virtualRequest The request data that the browser user gets to see.
	 * @param request The incoming request that should be handled.
	 * @param response The response to write to.
	 */
	protected abstract async handleRequestConcrete(
		virtualRequest: IVirtualRequest,
		request: IncomingMessage,
		response: ServerResponse
	): Promise<void>;


	/**
	 * Holds all classes that have registered using `ProtocolProxy.register()` along with their score functions.
	 */
	private static readonly registry = new Map<(virtualRequest: IVirtualRequest, request: IncomingMessage) => number, typeof OutgoingRequestHandler>();
}

export default OutgoingRequestHandler;


//
// import concrete classes:
//

import './outgoingRequestHandler/Http';
