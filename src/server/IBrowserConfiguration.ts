export interface IBrowserConfiguration {
	/**
	 * The URL of the browser's home page. 
	 */
	home: string;
	/**
	 * Whether to automatically hide and show the address bar. 
	 */
	autoToggleAddressBar: boolean;
	/**
	 * Whether to show the welcome page instead of the home page when starting the browser.
	 */
	showWelcomePage: boolean;
	/**
	 * Whether the user has read the the disclaimer and terms of use and accepts them.
	 */
	disclaimerReadAndAccepted: boolean;
}

export default IBrowserConfiguration;
