import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as net from 'net';


///
/// init:
///
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


interface IStartBackEndResult {
	process: cp.ChildProcess;
	port: number;
}


async function startBackEnd(): Promise<IStartBackEndResult> {
	return new Promise<IStartBackEndResult>(async (resolve, reject) => {
		const port = await findFreePort();
		const options: cp.SpawnOptions = {
			cwd: `${__dirname}/../../`
		};
		log(`starting back end, cwd '${options.cwd}'`);
		const process = cp.spawn('node', ['--use-strict', '--es_staging', `${__dirname}/server.js`, `${port}`], options);
		resolve({ process, port });
	});
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
	const successHandler = (success) => { /* do nothing */ };
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


var backEndProcess: cp.ChildProcess;
var backEndPort: number;
var context: vscode.ExtensionContext;
const outputChannel = vscode.window.createOutputChannel('VS Code Browser');


function log(message: any, ...additionalMessages: any[]): void {
	additionalMessages.unshift(message);
	outputChannel.appendLine(additionalMessages.join(' '));
}

function error(message: any, ...additionalMessages: any[]): void {
	additionalMessages.unshift(message);
	log('[ERROR]', additionalMessages);
}


async function start(): Promise<void> {
	outputChannel.show();
	log('VS Code Browser activated');
	let result: IStartBackEndResult;
	try {
		result = await startBackEnd();
	} catch (err) {
		vscode.window.showErrorMessage('Browser back end could not be started.');
		error('back end failed to start', err);
	}
	log(`back end started, port ${result.port}`);
	backEndProcess = result.process;
	backEndPort = result.port;
	backEndProcess.on('error', err => {
		error(err);
		vscode.window.showErrorMessage('The browser back end ran into a problem.');
	});
	backEndProcess.stdout.on('data', data => log((data || '').toString()));
	backEndProcess.stderr.on('data', data => error((data || '').toString()));
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
	backEndProcess.kill();
	log('back end stopped');
	unregisterAllCommands();
}
