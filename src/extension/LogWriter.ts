import { window } from 'vscode';

/**
 * Accepts log messages and writes them to a log file, console, etc.
 */
export default class LogWriter {
	/**
	 * Writes a simple text message to the log. Accepts all types of input. Inputs are
	 * be converted to strings using their `toString` method.
	 * @param message The first and possibly only part of the log message.
	 * @param additionalMessages Other parts of the log message.
	 */
	public writeLine(message: any, ...additionalMessages: any[]): void {
		additionalMessages.unshift(message);
		let completeMessage = additionalMessages.join(' ');
		if (completeMessage.slice(-1) === '\n') {
			completeMessage = completeMessage.slice(0, -1);
		}
		this.outputChannel.appendLine(completeMessage);
	}


	private readonly outputChannel = window.createOutputChannel('VS Code Browser');
}
