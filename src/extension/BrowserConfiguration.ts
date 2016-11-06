import * as vscode from 'vscode';
import { parse } from 'url';
import IBrowserConfiguration from '../server/IBrowserConfiguration';

export default class BrowserConfiguration implements IBrowserConfiguration {
	/**
	 * Creates a browser configuration object using the VS Code workspace configuration.
	 */
	public static createFromWorkspaceConfig(): BrowserConfiguration {
		return new BrowserConfiguration(
			BrowserConfiguration.getWorkspaceConfigOrFallback('home', BrowserConfiguration.isValidURL)
		);
	}


	/**
	 * Checks if a URL can be opened.
	 */
	private static isValidURL(url: string): boolean {
		const parsed = parse(url);
		return typeof parsed.hostname === 'string';
	}


	private static getWorkspaceConfigOrFallback<T>(name: string, validator: (value: T) => boolean): T {
		const workspaceConfig = vscode.workspace.getConfiguration('chromevscode');
		const value = workspaceConfig.get<T>(name);
		if (validator(value)) {
			return value;
		}
		return BrowserConfiguration.defaultConfig[name];
	}


	private constructor(
		public readonly home: string
	) { }


	/**
	 * A browser configuration with fallback values.
	 */
	private static readonly defaultConfig = new BrowserConfiguration(
		'http://code.visualstudio.com'
	);
}
