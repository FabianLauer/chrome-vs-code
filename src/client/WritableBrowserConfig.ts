import resolveInternalRoute from './internalRouteMapReader';
import InternalRoute from '../server/InternalRoute';
import ReadonlyBrowserConfig from './ReadonlyBrowserConfig';
import { IPossibleValueTypes, BrowserConfigSectionSymbol } from './BrowserConfigSection';

declare function escape(str: string): string;

export default class WritableBrowserConfig extends ReadonlyBrowserConfig {
	public set<TValue extends IPossibleValueTypes>(
		key: BrowserConfigSectionSymbol<TValue>,
		value: TValue
	): Promise<void> {
		return this.updateConfigField('chromevscode', key.name, value);
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
