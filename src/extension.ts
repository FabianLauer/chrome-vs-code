import * as vscode from 'vscode';
import LogWriter from './extension/LogWriter';
import BrowserBackend from './extension/BrowserBackend';
import PreviewUriSchemePool from './extension/PreviewUriSchemePool';
import FileReader from './server/FileReader';
import { findFreePort } from './extension/util/port';
import { generateSafeInternalRouteMap } from './extension/util/generateRouteMap';
import { StaticFileReader, generateAboutPageReaders } from './createServer';

const registeredCommands: vscode.Disposable[] = [];
const schemePool = new PreviewUriSchemePool('chromevscode');
/**
 * Contains all started browser backend instances.
 */
const backends: BrowserBackend[] = [];
const browserFileReader = {
	js: new StaticFileReader(`${__dirname}/browser.all.js`),
	css: new StaticFileReader(`${__dirname}/all.css`)
};
/**
 * **Do not use this variable directly. Use `getAboutPageReaders()` instead.**
 */
var aboutPageReaders: Array<{ name: string; reader: FileReader<string> }>;


async function getAboutPageReaders() {
	aboutPageReaders = aboutPageReaders || await generateAboutPageReaders();
	return aboutPageReaders;
}


async function startBackend(logWriter: LogWriter): Promise<BrowserBackend> {
	const port = await findFreePort();
	const map = generateSafeInternalRouteMap();
	const backend = new BrowserBackend(
		logWriter,
		port,
		map,
		schemePool.generatePreviewUriScheme(),
		browserFileReader.js,
		browserFileReader.css,
		await getAboutPageReaders()
	);
	await backend.start();
	backends.push(backend);
	return backend;
}


async function openWebBrowser(logWriter: LogWriter, viewColumn: vscode.ViewColumn) {
	const backend = await startBackend(logWriter);
	return vscode.commands.executeCommand(
		'vscode.previewHtml',
		backend.getPreviewUri(),
		vscode.ViewColumn.Two,
		'Web Browser'
	);
}


/**
 * Registers a command that can be invoked via a keyboard shortcut,
 * a menu item, an action, or directly.
 *
 * Registering a command with an existing command identifier twice
 * will cause an error.
 *
 * @param command A unique identifier for the command.
 * @param callback A command handler function.
 */
function registerCommand(
	context: vscode.ExtensionContext,
	commandName: string,
	callback: (...args: any[]) => any
): void {
	const command = vscode.commands.registerCommand(commandName, callback);
	registeredCommands.push(command);
	// context.subscriptions.push(command, registration);
}


/**
 * Activates the extension.
 */
export function activate(context: vscode.ExtensionContext): void {
	// process.on('uncaughtException', err => {
	// 	console.warn(err);
	// });
	// process.on('unhandledRejection', err => {
	// 	console.warn(err);
	// });
	const logWriter = new LogWriter();
	registerCommand(
		context,
		'extension.openWebBrowser',
		() => openWebBrowser(logWriter, vscode.ViewColumn.One));
	registerCommand(
		context,
		'extension.openWebBrowserSplitView',
		() => openWebBrowser(logWriter, vscode.ViewColumn.Two));
}


/**
 * Deactivates the extension.
 */
export function deactivate(): void {
	backends.forEach(backend => backend.dispose());
}
