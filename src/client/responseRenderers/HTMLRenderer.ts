import ResponseRenderer from '../ResponseRenderer';
import ResponseRendererFactory from '../ResponseRendererFactory';
import resolveInternalRoute from '../internalRouteMapReader';
import InternalRoute from '../../server/InternalRoute';
import { parseURL } from '../../utils';

declare function escape(str: string): string;

@ResponseRendererFactory.register(response => {
	var score = 0;
	if (response.status === 200) {
		score += 1;
	}
	if (response.getResponseHeader('Content-Type') === 'text/html') {
		score += 100;
	}
	return score;
})
class HTMLRenderer extends ResponseRenderer {
	/**
	 * Renders a certain response in the renderer's current viewport.
	 * @param responseURI The URI from which the response was loaded.
	 * @param response The response to render.
	 */
	protected async renderResponseConcrete(responseURI: string, response: XMLHttpRequest): Promise<void> {
		const parsedDocument = HTMLRenderer.parseResponseAsHTMLDocument(responseURI, response);
		await this.viewport.renderHTML(parsedDocument.documentElement.outerHTML);
	}


	/**
	 * Attempts to generate a favicon for the rendered response.
	 * @param responseURI The URI from which the response was loaded.
	 * @param response The response to render.
	 */
	protected async generateFaviconConcrete?(responseURI: string, response: XMLHttpRequest): Promise<string | void> {
		if (/^about:/.test(responseURI)) {
			return HTMLRenderer.ownFavicon;
		}
		const parsedDocument = HTMLRenderer.parseResponseAsHTMLDocument(responseURI, response);
		const links = parsedDocument.getElementsByTagName('link');
		for (let i = 0; i < links.length; i++) {
			const link = links[i];
			if (link.hasAttribute('href') && /icon|shortcut/i.test(link.getAttribute('rel'))) {
				return link.getAttribute('href');
			}
		}
		return undefined;
	}


	private static parseResponseAsHTMLDocument(responseURI: string, response: XMLHttpRequest) {
		// check if the last document we parsed can be used again
		if (
			typeof HTMLRenderer.lastRecentParsed === 'object' &&
			HTMLRenderer.lastRecentParsed !== null &&
			HTMLRenderer.lastRecentParsed.responseURI === responseURI &&
			HTMLRenderer.lastRecentParsed.response === response
		) {
			return HTMLRenderer.lastRecentParsed.parsedDocument;
		}
		// parse the document
		const parsedDocument = document.implementation.createHTMLDocument('response');
		parsedDocument.documentElement.innerHTML = response.responseText;
		HTMLRenderer.updateAllURIAttributes(parsedDocument, responseURI);
		// update the cache
		HTMLRenderer.lastRecentParsed = HTMLRenderer.lastRecentParsed || <any>{};
		HTMLRenderer.lastRecentParsed.responseURI = responseURI;
		HTMLRenderer.lastRecentParsed.response = response;
		HTMLRenderer.lastRecentParsed.parsedDocument = parsedDocument;
		return parsedDocument;
	}


	private static getBaseURLFromServerResponse(responseURL: string) {
		return parseURL(responseURL.replace(/^.*?\?/, ''));
	}


	private static updateAllURIAttributes(document: Document, responseURI: string): void {
		responseURI = responseURI.trim();
		const parsedResponseURL = parseURL(responseURI);
		const parsedURL = HTMLRenderer.getBaseURLFromServerResponse(responseURI);
		const baseURL = `${parsedURL.protocol}//${parsedURL.host}`;
		const elements = document.getElementsByTagName('*');
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			for (let a = 0; a < element.attributes.length; a++) {
				const attribute = element.attributes[a];
				// remove 'target' attributes to prevent pages attempting to open another tab/window
				if (attribute.name === 'target') {
					element.removeAttributeNode(attribute);
				}
				if (attribute.name !== 'src' && attribute.name !== 'href' && attribute.name !== 'xlink:href') {
					continue;
				}
				// skip all...
				if (
					// data URIs
					/^data:/.test(attribute.value) ||
					// hash only links (e.g. href="#foo")
					/^#/.test(attribute.value)
				) {
					continue;
				}
				// full protocol in URI
				if (/^[a-z]+?:\//.test(attribute.value)) {
					attribute.value = `${resolveInternalRoute(InternalRoute.Load)}?${escape(attribute.value)}`;
				}
				// double slash as protocol shortcut
				else if (/^:?\/\/+/.test(attribute.value)) {
					attribute.value = attribute.value.replace(/^:?\/+/, '');
					attribute.value = `${resolveInternalRoute(InternalRoute.Load)}?${parsedURL.protocol}//${escape(attribute.value)}`;
				}
				// URIs without protocol, host and leading slash
				else if (!/^\//.test(attribute.value)) {
					// if the page URI ends with a slash, treat the URI in the attribute as relative to the page URI
					if (/\/$/.test(parsedResponseURL.pathname)) {
						attribute.value =
							resolveInternalRoute(InternalRoute.Load) +
							`?${parsedResponseURL.protocol}//${parsedResponseURL.host}/${parsedResponseURL.path}/${escape(attribute.value)}`;
					}
					// otherwise, treat the URI in the attribute value as relative to the host
					else {
						attribute.value = `${resolveInternalRoute(InternalRoute.Load)}?${parsedResponseURL.protocol}//${parsedResponseURL.host}/${escape(attribute.value)}`;
					}
				} else {
					attribute.value = `${resolveInternalRoute(InternalRoute.Load)}?${baseURL}/${escape(attribute.value)}`;
				}
			}
		}
	}


	private static lastRecentParsed: {
		responseURI: string;
		response: XMLHttpRequest;
		parsedDocument: Document;
	};


	private static readonly ownFavicon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAABKVBMVEUAAAD+1ABCuDnsJhwFlN7sJyL/2gDnDCXnxAQAmumTOENHqjY9rz0wxz5Muik5sU3ULS8AlOdSqDbXJx8Mj8wAmOUmzz1Mvh7iKSMAkt2jMTVIwzQ5wDr/4wD/9wABkN0Dj9aNGRUBWYYzmDoDj9bnJiFSqzcAhP+3IxsAh/MKkNL//QD/5gBnEg8Dj9bJeguJs2HAOhcznam0TycHhdgVmKTeFRYpj01nlzSTKxIwnLH+GREHjNp3IA791AABlN5CuDkCkNP/MSbsKSEAi/oAoPUAiPUCj9kHhdTtESj/7wD/4AAAme8Bkd0Wis0eir0/tkAxyTw6wTtGrTZGvDFNySzmFSflJSPdIiHmISDUxh7ZMR7lGx7/Dxz4xQX/GQPr1wDuyADwDAAssYJaAAAAPnRSTlMAm5zEv6eIfHH19PPy8PDh4N/c29bRzs7MysW2ta+uqaWRj42Mi4iDgH9/enl4c3JuZGJCQT08OzggHRcSAvY0/88AAACvSURBVBjTY8ALtIysUPh6jm4iBgwWakKqEL6Ko4tHlCyDTGBwJCuIr+Do5p/ozcjAFMQd48zMwMDi7q7J4W0HFHAQM46Nl2Cxt1dn0LEDC/AyWAv4uXKaMDCwQQT4GGwEXe25zOAC4qYu9qJSSc7sDNpggRAeD19JBgZm53B2Di+ggHRogI88yFpWp7DoBC9GBnNlfiWIwxSdPCPi5JCdruvkKayP4hkNQ0tbDB8DAOyhGpl7KuXzAAAAAElFTkSuQmCC';
}

export default HTMLRenderer;
