import * as vscode from 'vscode';
import * as net from 'net';
import Server from './server/Server';
import InternalRoute from './server/InternalRoute';
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
					id='browser-frame'
					width="100%"
					height="100%"
					frameborder="0"
					src="http://localhost:${this.backEndPort}${internalRouteMap.get(InternalRoute.BrowserHTML)}"
					style="
						position: absolute;
						left: 0;
						right: 0;
						bottom: 0;
						top: 0;
					">
				</iframe>
				<script>
					var frame = document.getElementById('browser-frame');

					// watch the body element for CSS class name changes and update the
					// theme after every change:
					new MutationObserver(function(mutations) {
						mutations.forEach(updateTheme);
					}).observe(document.body, {
						attributes: true,
						childList: false,
						characterData: false
					});

					try {
						updateTheme();
					} catch (err) {
						// if the first attempt didn't work, wait a while and try again:
						setTimeout(updateTheme, 1000);
						// just to make sure:
						setTimeout(updateTheme, 4000);
					}

					function updateTheme() {
						var theme;
						if (document.body.classList.contains('vscode-light')) {
							theme = 'light';
						} else if (document.body.classList.contains('vscode-dark')) {
							theme = 'dark';
						} else if (document.body.classList.contains('vscode-vscode-high-contrast')) {
							theme = 'high-contrast';
						}
						frame.contentWindow.setChromeVSCodeTheme(theme);
					}
				</script>
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
var internalRouteMap = Server.generateSafeInternalRouteMap();


async function startBackEnd(): Promise<number> {
	backEndPort = await findFreePort();
	server = new Server(
		internalRouteMap,
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
	const registration = vscode.workspace.registerTextDocumentContentProvider('chromevscode', provider);
	return { provider, registration };
}


const previewUri = vscode.Uri.parse('chromevscode://');
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
	log(`back end started, url http://localhost:${backEndPort}${internalRouteMap.get(InternalRoute.BrowserHTML)}`);
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
