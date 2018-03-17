"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
class ResponseRenderer {
    /**
     * Creates a renderer.
     * @param viewport The viewport to render in.
     */
    constructor(viewport) {
        this.viewport = viewport;
    }
    /**
     * Renders a certain response in the renderer's current viewport.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    renderResponse(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.renderResponseConcrete(responseURI, response);
        });
    }
    /**
     * Attempts to generate a favicon for the rendered response.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    generateFavicon(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof this.generateFaviconConcrete === 'function') {
                return this.generateFaviconConcrete(responseURI, response);
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResponseRenderer;
//# sourceMappingURL=ResponseRenderer.js.map