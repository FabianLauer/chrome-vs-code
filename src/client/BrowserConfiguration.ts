import resolveInternalRoute from './internalRouteMapReader';
import InternalRoute from '../server/InternalRoute';
import IBrowserConfiguration from '../server/IBrowserConfiguration';
import { IPossibleValueTypes, BrowserConfigSectionSymbol } from './BrowserConfigSection';

declare function escape(str: string): string;
declare function unescape(str: string): string;

export default class BrowserConfiguration {
	public async get<TValue extends IPossibleValueTypes>(
		key: BrowserConfigSectionSymbol<TValue>
	): Promise<TValue> {
		const config = await this.loadBrowserConfig();
		return config[key.name];
	}


	public set<TValue extends IPossibleValueTypes>(
		key: BrowserConfigSectionSymbol<TValue>,
		value: TValue
	): Promise<void> {
		return this.updateConfigField('chromevscode', key.name, value);
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


	private async updateConfig(config: { [section: string]: { [key: string]: any; }; }): Promise<void> {
		await new Promise<void>((resolve, reject) => {
			const request = new XMLHttpRequest();
			request.onerror = reject;
			request.onreadystatechange = () => {
				if (request.readyState === XMLHttpRequest.DONE) {
					resolve();
				}
			};
			request.open('GET', `${resolveInternalRoute(InternalRoute.ConfigWrite)}?${escape(JSON.stringify(config))}`, true);
			request.send();
		});
	}


	private async updateConfigField(section: string, key: string, value: any): Promise<void> {
		const object: any = {};
		object[section] = {};
		object[section][key] = value;
		return this.updateConfig(object);
	}
}
