import ResponseRenderer from '../ResponseRenderer';
import ResponseRendererFactory from '../ResponseRendererFactory';

declare function escape(str: string): string;
declare function unescape(str: string): string;

@ResponseRendererFactory.register(response => {
	var score = 0;
	if (response.status === 200) {
		score += 1;
	}
	if (response.getResponseHeader('Content-Type') === 'html') {
		score += 100;
	}
	return score;
})
class HTMLRenderer extends ResponseRenderer {
	/**
	 * Renders a certain response in the renderer's current viewport.
	 * @param response The response to render.
	 */
	protected async renderResponseConcrete(response: XMLHttpRequest): Promise<void> {
		var headHTML: string;
		var bodyHTML: string;
		const parsedDocument = document.implementation.createHTMLDocument('response');
		parsedDocument.documentElement.innerHTML = response.responseText;
		const parsedURL = HTMLRenderer.getBaseURLFromServerResponse(response);
		HTMLRenderer.updateAllURIAttributes(parsedDocument, `${parsedURL.protocol}//${parsedURL.hostname}`);
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


	private static getBaseURLFromServerResponse(response: XMLHttpRequest) {
		return HTMLRenderer.parseURL(unescape(((<string>(<any>response).responseURL) || '').replace(/^.*?\?/, '')));
	}


	private static parseURL(url: string): { protocol: string; hostname: string; pathname: string } {
		var link = document.createElement('a');
		link.href = url;
		return link;
	}


	private static updateAllURIAttributes(document: Document, baseURL: string): void {
		const elements = document.getElementsByTagName('*');
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			for (let a = 0; a < element.attributes.length; a++) {
				const attribute = element.attributes[a];
				if (/^https?:\//.test(attribute.value)) {
					attribute.value = `/load?${escape(attribute.value)}`;
				} else if (attribute.name === 'src' || attribute.name === 'href' || attribute.name === 'xlink:href') {
					attribute.value = `/load?${baseURL}/${escape(attribute.value)}`;
				}
			}
		}
	}
}

export default HTMLRenderer;
