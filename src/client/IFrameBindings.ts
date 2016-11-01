/**
 * Describes the API exposed by the browser to content frames it loads. The API
 * is made available to the frames at `window.vscodeBrowser`.
 */
interface IFrameBindings {
	/**
	 * Updates the browser location to another URI.
	 * @param uri The URI to open.
	 */
	load(uri: string): Promise<void>;
}

export default IFrameBindings;
