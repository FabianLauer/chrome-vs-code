import Viewport from './Viewport';
import ResponseRenderer from './ResponseRenderer';
import { BUG_REPORT_URL } from '../config';

declare function unescape(str: string): string;

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
			highest.rendererClass = ResponseRendererFactory.FallbackRenderer;
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


	private static readonly registry = new Map<(response: XMLHttpRequest) => number, typeof ResponseRenderer>();
	private static readonly instancesByViewport = new Map<Viewport, ResponseRenderer[]>();


	private static readonly FallbackRenderer = class FallbackRenderer extends ResponseRenderer {
		protected async renderResponseConcrete(responseURI: string, response: XMLHttpRequest): Promise<void> {
			await this.viewport.renderHTML(
				`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Rendering Error</title>
					<style>
						* {
							font-family: system, -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif!important;
						}
						body {
							box-sizing: border-box;
							padding: 10vh 10vw;
							font-size: 0.8em;
							background: #fafafa;
							color: #333;
						}
						p {
							line-height: 1.3em;
						}
						a {
							color: #666;
						}
					</style>
				</head>
				<body>
					<h1>This site can't be displayed.</h1>
					<p>
						The web page at <b>${responseURI}</b> can not be displayed because no matching renderer was found.
					</p>
					<a href='${BUG_REPORT_URL}' title='File a bug report'>Report this issue</a>
				</body>
				</html>
				`
			);
		}
	};
}


// import all response renderers:
import './responseRenderers';
