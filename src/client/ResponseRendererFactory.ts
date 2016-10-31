import Viewport from './Viewport';
import ResponseRenderer from './ResponseRenderer';

/**
 * @singleton
 */
export default class ResponseRendererFactory {
	/**
	 * Decorator for `ResponseRenderer` implementations.
	 * @param score A function that checks whether the decorated renderer is capable of rendering
	 *              a certain server response. If two or more registered renderer classes register
	 *              are applicable to render a response, the one with the highest score is used.
	 */
	public static register(score: (response: XMLHttpRequest) => number) {
		return (target: typeof ResponseRenderer) => {
			this.registry.set(score, target);
		};
	}


	/**
	 * Returns a renderer for a certain viewport and response.
	 */
	public static getRenderer(viewport: Viewport, response: XMLHttpRequest): ResponseRenderer {
		// find the best matching renderer
		var highest: {
			score: number;
			rendererClass: typeof ResponseRenderer
		} = {
				score: -Infinity,
				rendererClass: undefined
			};
		for (const registered of this.registry) {
			const score = registered[0](response);
			if (score > highest.score) {
				highest.score = score;
				highest.rendererClass = registered[1];
			}
		}
		// fall back to another renderer if no matching renderer for the response was found
		if (highest.score < 1) {
			highest.rendererClass = class FallbackRenderer extends ResponseRenderer {
				protected async renderResponseConcrete(): Promise<void> {
					await this.viewport.renderHTML('Rendering failed.');
				}
			};
		}
		// get or create a renderer instance for the given viewport 
		if (!Array.isArray(this.instancesByViewport.get(viewport))) {
			this.instancesByViewport.set(viewport, []);
		}
		let instance = this.instancesByViewport.get(viewport).find(renderer => renderer instanceof highest.rendererClass);
		if (!(instance instanceof ResponseRenderer)) {
			instance = new (<any>highest.rendererClass)(viewport);
			this.instancesByViewport.get(viewport).push(instance);
		}
		return instance;
	}


	private static registry = new Map<(response: XMLHttpRequest) => number, typeof ResponseRenderer>();
	private static instancesByViewport = new Map<Viewport, ResponseRenderer[]>();
}


// import all response renderers:
import './responseRenderers';
