import resolveInternalRoute from './internalRouteMapReader';
import InternalRoute from '../server/InternalRoute';
import IBrowserConfiguration from '../server/IBrowserConfiguration';
import { IPossibleValueTypes, BrowserConfigSectionSymbol } from './BrowserConfigSection';

export default class ReadonlyBrowserConfig {
	public async get<TValue extends IPossibleValueTypes>(
		key: BrowserConfigSectionSymbol<TValue>
	): Promise<TValue> {
		const config = await this.loadBrowserConfig();
		return config[key.name];
	}


	/**
	 * Loads and returns the complete browser configuration from the back end.
	 */
	public async loadBrowserConfig(): Promise<IBrowserConfiguration> {
		return new Promise<IBrowserConfiguration>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.onerror = reject;
			request.onreadystatechange = () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					resolve(JSON.parse(request.responseText));
				}
			};
			request.open('GET', resolveInternalRoute(InternalRoute.ConfigRead), true);
			request.send();
		});
	}
}
