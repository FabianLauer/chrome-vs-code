import { parse, format } from 'url';
import resolveInternalRoute from './internalRouteMapReader';
import InternalRoute from '../server/InternalRoute';
import IHostsMap from '../server/util/IHostsMap';
import * as configSection from './BrowserConfigSection';
import ReadonlyBrowserConfig from './ReadonlyBrowserConfig';

/**
 * URL interpreters are objects that 
 */
export default class URLInterpreter {
	/**
	 * Creates a new `URLInterpreter`.
	 * @param config A browser configuration reader.
	 */
	public constructor(
		private config: ReadonlyBrowserConfig
	) { /* do nothing */ }


	/**
	 * @param urlString The URL to interpret.
	 */
	public async interpret(urlString: string): Promise<string> {
		urlString = urlString.trim();
		const url = parse(urlString);
		if (typeof url.protocol === 'string') {
			return format(url);
		}
		// There's no protocol. Return a web search URL if:
		if (
			// the input isn't defined as a hostname in the system OR
			!(await URLInterpreter.isKnownHostName(urlString)) ||
			// there's any whitespace in the URL
			/\s/g.test(decodeURIComponent(url.path))
		) {
			return this.getSearchURL(urlString);
		}
		// No protocol and no spaces. Remove all protocol-like content at the
		// beginning of the string, then prepend `http://` and return.
		urlString = urlString.replace(/^[a-z]*\:?\/+/, '');
		return `http://${urlString}`;
	}


	/**
	 * Returns a URL to a web search.
	 * @param search The text to search for.
	 */
	private async getSearchURL(search: string): Promise<string> {
		const url = await this.config.get(configSection.webSearchURL);
		return url.replace(/\${searchTerm}/g, encodeURIComponent(search));
	}


	private static async isKnownHostName(str: string): Promise<boolean> {
		const map = await URLInterpreter.loadHostsMap();
		return Array.isArray(map[str]) && map[str].length > 0;
	}


	private static async loadHostsMap(): Promise<IHostsMap> {
		return new Promise<IHostsMap>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.onerror = reject;
			request.onreadystatechange = () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					resolve(JSON.parse(request.responseText));
				}
			};
			request.open('GET', resolveInternalRoute(InternalRoute.Hosts), true);
			request.send();
		});
	}
}
