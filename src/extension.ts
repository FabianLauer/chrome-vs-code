import * as vscode from 'vscode';
import * as net from 'net';
import Server from './server/Server';
import BrowserConfiguration from './extension/BrowserConfiguration';
import { StaticFileReader, generateAboutPageReaders } from './createServer';


///
/// init:
///


process.on('uncaughtException', err => {
	console.warn(err);
	process.exit();
});


process.on('unhandledRejection', err => {
	console.warn(err);
	process.exit();
});


setTimeout(start, 500);




class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
	/**
	 * @param backEndPort The port to which the back end is listening.
	 */
	constructor(private backEndPort: number) { /* do nothing */ }

	public _onDidChange = new vscode.EventEmitter<vscode.Uri>();

	public provideTextDocumentContent(uri: vscode.Uri): string {
		return `
			<body>
				<iframe
					width="100%"
					height="100%"
					frameborder="0"
					src="http://localhost:${this.backEndPort}"
					style="
						position: absolute;
						left: 0;
						right: 0;
						bottom: 0;
						top: 0;
					" />
			</body>
		`;
	}

	public get onDidChange(): vscode.Event<vscode.Uri> {
		return this._onDidChange.event;
	}

	public update(uri: vscode.Uri) {
		this._onDidChange.fire(uri);
	}
}


/**
 * Finds a free port.
 * @see https://gist.github.com/mikeal/1840641
 */
async function findFreePort(): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const port = Math.floor(Math.random() * 10000) + 8000;
		const server = net.createServer();
		server.on('error', async () => resolve(await findFreePort()));
		server.listen(port, () => {
			server.once('close', () => resolve(port));
			server.close();
		});
	});
}


const outputChannel = vscode.window.createOutputChannel('VS Code Browser');
var server: Server;
var backEndPort: number;
var context: vscode.ExtensionContext;


async function startBackEnd(): Promise<number> {
	backEndPort = await findFreePort();
	server = new Server(
		new StaticFileReader(`${__dirname}/../../src/static/browser.html`),
		new StaticFileReader(`${__dirname}/browser.all.js`),
		new StaticFileReader(`${__dirname}/all.css`),
		await generateAboutPageReaders(),
		log,
		BrowserConfiguration.createFromWorkspaceConfig,
		async data => {
			log('updating browser config:', JSON.stringify(data));
			for (const section in data) {
				/// TODO: Find out why the `udpate` method is missing in the `WorkspaceConfiguration` declaration.
				const workspaceConfig = <any>vscode.workspace.getConfiguration(section);
				for (const key in data[section]) {
					await workspaceConfig.update(
						// config name
						key,
						// config value
						data[section][key],
						// global = true
						true
					);
				}
			}
		}
	);
	await server.start('localhost', backEndPort);
	return backEndPort;
}


function updateProvider(backEndPort: number) {
	const provider = new TextDocumentContentProvider(backEndPort);
	const registration = vscode.workspace.registerTextDocumentContentProvider('css-preview', provider);
	return { provider, registration };
}


const previewUri = vscode.Uri.parse('css-preview://authority/css-preview');
const registeredCommands: vscode.Disposable[] = [];


function unregisterAllCommands(): void {
	registeredCommands.forEach(command => command.dispose());
}


function updateFrontEndCommands(context: vscode.ExtensionContext, backEndPort: number) {
	if (typeof context !== 'object' || context === null || typeof backEndPort !== 'number') {
		return;
	}
	const current = updateProvider(backEndPort);
	current.provider.update(previewUri);
	const successHandler = () => { /* do nothing */ };
	const errorHandler = (reason) => {
		vscode.window.showErrorMessage(reason);
	};
	// unregisterAllCommands();
	log(`registering commands for back end at ${backEndPort}`);
	registeredCommands.push(vscode.commands.registerCommand('extension.openWebBrowserToSide', () => {
		return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, 'Web Browser')
			.then(successHandler, errorHandler);
	}));
	registeredCommands.push(vscode.commands.registerCommand('extension.openWebBrowser', () => {
		return vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.One, 'Web Browser')
			.then(successHandler, errorHandler);
	}));
	registeredCommands.forEach(disposable => context.subscriptions.push(disposable, current.registration));
}


function log(message: any, ...additionalMessages: any[]): void {
	additionalMessages.unshift(message);
	let completeMessage = additionalMessages.join(' ');
	if (completeMessage.slice(-1) === '\n') {
		completeMessage = completeMessage.slice(0, -1);
	}
	outputChannel.appendLine(completeMessage);
}

function error(message: any, ...additionalMessages: any[]): void {
	additionalMessages.unshift(message);
	log('[ERROR]', additionalMessages);
}


async function start(): Promise<void> {
	log('VS Code Browser activated', __dirname);
	try {
		await startBackEnd();
	} catch (err) {
		vscode.window.showErrorMessage('Browser back end could not be started.');
		error('back end failed to start', err);
	}
	log(`back end started, port ${backEndPort}`);
	updateFrontEndCommands(context, backEndPort);
}


/**
 * Activates the extension.
 */
export function activate(localContext: vscode.ExtensionContext): void {
	context = localContext;
	updateFrontEndCommands(context, backEndPort);
}


/**
 * Deactivates the extension.
 */
export function deactivate(): void {
	unregisterAllCommands();
	server.stop();
}
