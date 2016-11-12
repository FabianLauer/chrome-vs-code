import TypedSymbol from '../utils/TypedSymbol';

export type IPossibleValueTypes = string | number | boolean;

export class BrowserConfigSectionSymbol<T extends IPossibleValueTypes> extends TypedSymbol<T> {
	public readonly BRAND: 'browser-config-section-symbol';


	/**
	 * Creates a new typed symbol for a browser configuration section.
	 */
	public static create<T extends IPossibleValueTypes>(name: string): BrowserConfigSectionSymbol<T> {
		return new BrowserConfigSectionSymbol<T>(name);
	}
}


/**
 * The URL of the browser's home page. 
 */
export const home = BrowserConfigSectionSymbol.create<string>('home');

/**
 * Whether to automatically hide and show the address bar. 
 */
export const autoToggleAddressBar = BrowserConfigSectionSymbol.create<boolean>('autoToggleAddressBar');

/**
 * Whether to show the welcome page instead of the home page when starting the browser.
 */
export const showWelcomePage = BrowserConfigSectionSymbol.create<boolean>('showWelcomePage');

/**
 * Whether the user has read the the disclaimer and terms of use and accepts them.
 */
export const disclaimerReadAndAccepted = BrowserConfigSectionSymbol.create<boolean>('disclaimerReadAndAccepted');

/**
 * A URL to search the web with.
 */
export const webSearchURL = BrowserConfigSectionSymbol.create<string>('webSearchURL');
