"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const ResponseRenderer_1 = require('../ResponseRenderer');
const ResponseRendererFactory_1 = require('../ResponseRendererFactory');
let ImageRenderer_1 = class ImageRenderer extends ResponseRenderer_1.default {
    /**
     * Attempts to generate a favicon for the rendered response.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    generateFaviconConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield ImageRenderer_1.loadImageFromResponse(response)).src;
        });
    }
    /**
     * Renders a certain response in the renderer's current viewport.
     * @param responseURI The URI from which the response was loaded.
     * @param response The response to render.
     */
    renderResponseConcrete(responseURI, response) {
        return __awaiter(this, void 0, void 0, function* () {
            const image = yield ImageRenderer_1.loadImageFromResponse(response);
            yield this.viewport.renderHTML(`
			<!DOCTYPE html>
			<html>
				<head>
					<title>${response.getResponseHeader('Content-Disposition') || 'Image'}</title>
					<style>
						html {
							width: 100vw;
							height: 100vh;
							padding: 0;
							margin: 0;
							background: transparent;
						}
						body {
							background-position: 0 0, 8px 0, 8px -8px, 0px 8px;
							background-size: 16px 16px;
							background-image:
								-webkit-gradient(linear, 0 100%, 100% 0, color-stop(.25, rgba(128,128,128,0.3)), color-stop(.25, transparent)),
								-webkit-gradient(linear, 0 0, 100% 100%, color-stop(.25, rgba(128,128,128,0.3)), color-stop(.25, transparent)),
								-webkit-gradient(linear, 0 100%, 100% 0, color-stop(.75, transparent), color-stop(.75, rgba(128,128,128,0.3))),
								-webkit-gradient(linear, 0 0, 100% 100%, color-stop(.75, transparent), color-stop(.75, rgba(128,128,128,0.3)));
						}
						img {
							position: fixed;
							display: block;
							left: 50%;
							top: 50%;
							transform: translate(-50%, -50%);
							max-width: 90vh;
							max-height: 90vh;
						}
					</style>
				</head>
				<body>
					<img src='${image.src}' />
					<script src=''></script>
				</body>
			</html>
		`);
        });
    }
    static loadImageFromResponse(response) {
        return __awaiter(this, void 0, void 0, function* () {
            const contentType = response.getResponseHeader('Content-Type');
            return ImageRenderer_1.loadImage(`data:${contentType};base64,${response.responseText}`);
        });
    }
    static loadImage(src) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.onerror = reject;
                image.onload = () => resolve(image);
                image.src = src;
            });
        });
    }
};
let ImageRenderer = ImageRenderer_1;
ImageRenderer = ImageRenderer_1 = __decorate([
    ResponseRendererFactory_1.default.register(response => {
        var score = 0;
        if (response.status === 200) {
            score += 1;
        }
        if (/^image\/.+/i.test(response.getResponseHeader('Content-Type'))) {
            score += 1;
        }
        return score;
    })
], ImageRenderer);
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImageRenderer;
//# sourceMappingURL=ImageRenderer.js.map