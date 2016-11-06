import Viewport from './Viewport';

abstract class ResponseRenderer {
	/**
	 * Creates a renderer.
	 * @param viewport The viewport to render in.
	 */
	public constructor(
		protected readonly viewport: Viewport
	) { }


	/**
	 * Renders a certain response in the renderer's current viewport.
	 * @param responseURI The URI from which the response was loaded.
	 * @param response The response to render.
	 */
	public async renderResponse(responseURI: string, response: XMLHttpRequest): Promise<void> {
		await this.renderResponseConcrete(responseURI, response);
	}


	/**
	 * Attempts to generate a favicon for the rendered response.
	 * @param responseURI The URI from which the response was loaded.
	 * @param response The response to render.
	 */
	public async generateFavicon(responseURI: string, response: XMLHttpRequest): Promise<string | void> {
		if (typeof this.generateFaviconConcrete === 'function') {
			return this.generateFaviconConcrete(responseURI, response);
		}
	}


	/**
	 * Renders a certain response in the renderer's current viewport.
	 * @param responseURI The URI from which the response was loaded.
	 * @param response The response to render.
	 */
	protected abstract async renderResponseConcrete(responseURI: string, response: XMLHttpRequest): Promise<void>;


	/**
	 * Attempts to generate a favicon for the rendered response.
	 * @param responseURI The URI from which the response was loaded.
	 * @param response The response to render.
	 */
	protected async generateFaviconConcrete?(responseURI: string, response: XMLHttpRequest): Promise<string | void>;
}

export default ResponseRenderer;
