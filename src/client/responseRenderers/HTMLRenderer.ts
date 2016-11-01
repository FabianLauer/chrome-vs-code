import ResponseRenderer from '../ResponseRenderer';
import ResponseRendererFactory from '../ResponseRendererFactory';
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
		var headHTML: string;
		var bodyHTML: string;
		const parsedDocument = document.implementation.createHTMLDocument('response');
		parsedDocument.documentElement.innerHTML = response.responseText;
		const parsedURL = HTMLRenderer.getBaseURLFromServerResponse(responseURI);
		HTMLRenderer.updateAllURIAttributes(parsedDocument, parsedURL.protocol, `${parsedURL.protocol}//${parsedURL.host}`);
		const headElement = parsedDocument.getElementsByTagName('head')[0];
		if (typeof headElement === 'undefined') {
			headHTML = '';
		} else {
			headHTML = headElement.innerHTML;
		}
		const bodyElement = parsedDocument.getElementsByTagName('body')[0];
		if (typeof bodyElement === 'undefined') {
			bodyHTML = '';
		} else {
			bodyHTML = bodyElement.innerHTML;
		}
		await this.viewport.renderHTML(headHTML, bodyHTML);
	}


	private static getBaseURLFromServerResponse(responseURL: string) {
		return parseURL(responseURL.replace(/^.*?\?/, ''));
	}


	private static updateAllURIAttributes(document: Document, baseProtocol: string, baseURL: string): void {
		const elements = document.getElementsByTagName('*');
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			for (let a = 0; a < element.attributes.length; a++) {
				const attribute = element.attributes[a];
				// full protocol in URI
				if (/^[a-z]+?:\//.test(attribute.value)) {
					attribute.value = `/load?${escape(attribute.value)}`;
				}
				// double slash as protocol shortcut
				else if (/^:?\/\/+/.test(attribute.value)) {
					attribute.value = attribute.value.replace(/^:?\/+/, '');
					attribute.value = `/load?${baseProtocol}//${escape(attribute.value)}`;
				} else if (attribute.name === 'src' || attribute.name === 'href' || attribute.name === 'xlink:href') {
					attribute.value = `/load?${baseURL}/${escape(attribute.value)}`;
				}
			}
		}
	}
}

export default HTMLRenderer;
