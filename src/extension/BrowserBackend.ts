import { workspace, Uri, Disposable } from 'vscode';
import LogWriter from './LogWriter';
import Server from '../server/Server';
import InternalRoute from '../server/InternalRoute';
import BrowserConfiguration from './BrowserConfiguration';
import TextDocumentContentProvider from './TextDocumentContentProvider';
import FileReader from '../server/FileReader';

export default class BrowserBackend extends Disposable {
	/**
	 * Creates a new backend instance.
	 * @param logWriter An object to write log messages with.
	 * @param serverPort The port the backend's server should to listen to.
	 * @param internalRouteMap All internal route mappings. Optional.
	 * @param previewUri The VS Code preview URI scheme to use for this backend instance, for example 'chromevscode001'.
	 */
	public constructor(
		private readonly logWriter: LogWriter,
		private readonly serverPort: number,
		private readonly internalRouteMap: Map<InternalRoute, string>,
		private readonly previewUriScheme: string,
		private readonly browserJsFileReader: FileReader<string>,
		private readonly browserCssFileReader: FileReader<string>,
		private readonly aboutPageReaders: Array<{ name: string; reader: FileReader<string> }>
	) {
		super(() => {
			if (this.isStarted()) {
				this.stop();
			}
			this.documentContentProvider = undefined;
			this.documentContentProviderRegistration.dispose();
			this.documentContentProviderRegistration = undefined;
			(this.logWriter as any) = undefined;
			(this.serverPort as any) = undefined;
			(this.internalRouteMap as any) = undefined;
			(this.previewUriScheme as any) = undefined;
		});
		this.previewUri = Uri.parse(`${this.previewUriScheme}://`);
	}


	public getPreviewUri(): Uri {
		return this.previewUri;
	}


	public isStarted(): boolean {
		return this.started;
	}


	/**
	 * Stops the backend instance.
	 */
	public stop(): void {
		if (!this.isStarted()) {
			throw new Error('cannot stop backend: not started yet');
		}
		this.started = false;
		this.logWriter.writeLine(`stopping backend for ${this.previewUriScheme}:// at port ${this.serverPort}`);
		this.server.stop();
	}


	public async start(): Promise<void> {
		if (this.isStarted()) {
			throw new Error('cannot start backend: already started');
		}
		this.started = true;
		this.logWriter.writeLine(`starting backend for ${this.previewUriScheme}:// at port ${this.serverPort}`);
		this.setupDocumentContentProvider();
		await this.startServer();
	}


	private setupDocumentContentProvider(): void {
		if (!(this.documentContentProvider instanceof TextDocumentContentProvider)) {
			this.documentContentProvider = new TextDocumentContentProvider(this.serverPort, this.internalRouteMap);
			this.documentContentProvider.update(this.getPreviewUri());
		}
		this.documentContentProviderRegistration =
			this.documentContentProviderRegistration ||
			workspace.registerTextDocumentContentProvider(
				this.previewUriScheme,
				this.documentContentProvider
			);
	}


	/**
	 * Start's the backend's server.
	 */
	private async startServer(): Promise<void> {
		this.server = new Server(
			this.internalRouteMap,
			this.browserJsFileReader,
			this.browserCssFileReader,
			this.aboutPageReaders,
			this.logWriter.writeLine.bind(this.logWriter),
			BrowserConfiguration.createFromWorkspaceConfig,
			async (data) => {
				this.logWriter.writeLine('updating browser config:', JSON.stringify(data));
				for (const section in data) {
					/// TODO: Find out why the `udpate` method is missing in the `WorkspaceConfiguration` declaration.
					const workspaceConfig = workspace.getConfiguration(section) as any;
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
		await this.server.start('localhost', this.serverPort);
	}


	private started = false;
	private readonly previewUri: Uri;
	private server: Server;
	private documentContentProvider: TextDocumentContentProvider;
	private documentContentProviderRegistration: Disposable;
}
