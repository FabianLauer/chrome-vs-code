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
		const parsedDocument = document.implementation.createHTMLDocument('response');
		parsedDocument.documentElement.innerHTML = response.responseText;
		HTMLRenderer.updateAllURIAttributes(parsedDocument, responseURI);
		await this.viewport.renderHTML(parsedDocument.documentElement.outerHTML);
	}


	private static getBaseURLFromServerResponse(responseURL: string) {
		return parseURL(responseURL.replace(/^.*?\?/, ''));
	}


	private static updateAllURIAttributes(document: Document, responseURI: string): void {
		const parsedURL = HTMLRenderer.getBaseURLFromServerResponse(responseURI);
		const baseURL = `${parsedURL.protocol}//${parsedURL.host}`;
		const elements = document.getElementsByTagName('*');
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			for (let a = 0; a < element.attributes.length; a++) {
				const attribute = element.attributes[a];
				if (attribute.name === 'target') {
					element.removeAttributeNode(attribute);
				}
				// full protocol in URI
				if (/^[a-z]+?:\//.test(attribute.value)) {
					attribute.value = `/load?${escape(attribute.value)}`;
				}
				// double slash as protocol shortcut
				else if (/^:?\/\/+/.test(attribute.value)) {
					attribute.value = attribute.value.replace(/^:?\/+/, '');
					attribute.value = `/load?${parsedURL.protocol}//${escape(attribute.value)}`;
				} else if (attribute.name === 'src' || attribute.name === 'href' || attribute.name === 'xlink:href') {
					// relative links
					if (!/^\//.test(attribute.value)) {
						attribute.value = `/load?${parsedURL.protocol}//${parsedURL.host}/${parsedURL.pathname}/${escape(attribute.value)}`;
					} else {
						attribute.value = `/load?${baseURL}/${escape(attribute.value)}`;
					}
				}
			}
		}
	}
}

export default HTMLRenderer;
