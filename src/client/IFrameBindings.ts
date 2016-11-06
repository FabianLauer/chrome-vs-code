/**
 * Describes the API exposed by the browser to content frames it loads. The API
 * is made available to the frames at `window.vscodeBrowser`.
 */
interface IFrameBindings {
	/**
	 * Initializes the frame's web API bindings.
	 */
	initializeWebAPIs(frameWindow: Window): Promise<void>;
	/**
	 * Updates the browser location to another URI.
	 * @param uri The URI to open.
	 */
	load(uri: string): Promise<void>;
	/**
	 * Attempts to show the address bar. Returns `true` when successful, `false` if not.
	 */
	showAddressBar(): Promise<boolean>;
	/**
	 * Attempts to hide the address bar. Returns `true` when successful, `false` if not.
	 */
	hideAddressBar(): Promise<boolean>;
}

export default IFrameBindings;
