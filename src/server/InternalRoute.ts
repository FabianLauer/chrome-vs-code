enum InternalRoute {
	/**
	 * The browser front end's main HTML file. 
	 */
	BrowserHTML = 1,
	/**
	 * The browser front end's main CSS file.
	 */
	BrowserCSS,
	/**
	 * The browser front end's main JS file.
	 */
	BrowserJS,
	/**
	 * The URL to the loader API.
	 */
	Load,
	/**
	 * The URL to the page loader API.
	 */
	LoadBase,
	/**
	 * The URL to the config reader.
	 */
	ConfigRead,
	/**
	 * The URL to the config writer.
	 */
	ConfigWrite,
	/**
	 * The URL to the hostnames API.
	 */
	Hosts
}

export default InternalRoute;
