import ResponseRenderer from '../ResponseRenderer';
import ResponseRendererFactory from '../ResponseRendererFactory';

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
		await this.viewport.renderHTML(response.responseText);
	}
}

export default HTMLRenderer;
