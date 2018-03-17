"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ResponseRenderer_1 = require('./ResponseRenderer');
const config_1 = require('../config');
/**
 * @singleton
 */
class ResponseRendererFactory {
    /**
     * Decorator for `ResponseRenderer` implementations.
     * @param score A function that checks whether the decorated renderer is capable of rendering
     *              a certain server response. If two or more registered renderer classes are
     *              applicable to render a response, the one with the highest score is used.
     */
    static register(score) {
        return (target) => {
            this.registry.set(score, target);
        };
    }
    /**
     * Returns a renderer for a certain viewport and response.
     */
    static getRenderer(viewport, response) {
        // find the best matching renderer
        var highest = {
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
        if (!(instance instanceof ResponseRenderer_1.default)) {
            instance = new highest.rendererClass(viewport);
            this.instancesByViewport.get(viewport).push(instance);
        }
        return instance;
    }
}
ResponseRendererFactory.registry = new Map();
/// TODO: Instances aggregated in here are never cleaned up.
ResponseRendererFactory.instancesByViewport = new Map();
ResponseRendererFactory.FallbackRenderer = class FallbackRenderer extends ResponseRenderer_1.default {
    renderResponseConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.viewport.renderHTML(`
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
					<a href='${config_1.BUG_REPORT_URL}' title='File a bug report'>Report this issue</a>
				</body>
				</html>
				`);
        });
    }
}
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResponseRendererFactory;
// import all response renderers:
require('./responseRenderers');
//# sourceMappingURL=ResponseRendererFactory.js.map