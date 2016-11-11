import ResponseRenderer from '../ResponseRenderer';
import ResponseRendererFactory from '../ResponseRendererFactory';

declare function escape(str: string): string;

@ResponseRendererFactory.register(response => {
	var score = 0;
	if (response.status === 200) {
		score += 1;
	}
	if (/^image\/.+/i.test(response.getResponseHeader('Content-Type'))) {
		score += 1;
	}
	return score;
})
class ImageRenderer extends ResponseRenderer {
	/**
	 * Attempts to generate a favicon for the rendered response.
	 * @param responseURI The URI from which the response was loaded.
	 * @param response The response to render.
	 */
	protected async generateFaviconConcrete?(responseURI: string, response: XMLHttpRequest): Promise<string | void> {
		return (await ImageRenderer.loadImageFromResponse(response)).src;
	}


	/**
	 * Renders a certain response in the renderer's current viewport.
	 * @param responseURI The URI from which the response was loaded.
	 * @param response The response to render.
	 */
	protected async renderResponseConcrete(responseURI: string, response: XMLHttpRequest): Promise<void> {
		const image = await ImageRenderer.loadImageFromResponse(response);
		await this.viewport.renderHTML(`
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
	}


	private static async loadImageFromResponse(response: XMLHttpRequest): Promise<HTMLImageElement> {
		const contentType = response.getResponseHeader('Content-Type');
		return ImageRenderer.loadImage(`data:${contentType};base64,${response.responseText}`);
	}


	private static async loadImage(src: string): Promise<HTMLImageElement> {
		return new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
			image.onerror = reject;
			image.onload = () => resolve(image);
			image.src = src;
		});
	}
}

export default ImageRenderer;
