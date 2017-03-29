"use strict";
const vscode_1 = require('vscode');
/**
 * Accepts log messages and writes them to a log file, console, etc.
 */
class LogWriter {
    constructor() {
        this.outputChannel = vscode_1.window.createOutputChannel('VS Code Browser');
    }
    /**
     * Writes a simple text message to the log. Accepts all types of input. Inputs are
     * be converted to strings using their `toString` method.
     * @param message The first and possibly only part of the log message.
     * @param additionalMessages Other parts of the log message.
     */
    writeLine(message, ...additionalMessages) {
        additionalMessages.unshift(message);
        let completeMessage = additionalMessages.join(' ');
        if (completeMessage.slice(-1) === '\n') {
            completeMessage = completeMessage.slice(0, -1);
        }
        this.outputChannel.appendLine(completeMessage);
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LogWriter;
//# sourceMappingURL=LogWriter.js.map