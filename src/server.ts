import Server from './server/Server';
import FileReader from './server/FileReader';
import { readFile } from 'fs';
import { execSync } from 'child_process';

class BrowserHTMLReader extends FileReader<string> {
	protected async getContentConcrete() {
		return new Promise<string>((resolve, reject) => {
			readFile('./src/static/browser.html', (err, content) => {
				if (err) {
					reject(err);
				} else {
					resolve(content.toString());
				}
			});
		});
	}
}

class PreprocessorReader extends FileReader<string> {
	public constructor(
		private command: string
	) {
		super();
	}


	protected async getContentConcrete() {
		return new Promise<string>((resolve, reject) => {
			var code: string;
			try {
				code = execSync(this.command).toString();
			} catch (err) {
				reject(err);
				return;
			}
			resolve(code);
		});
	}
}

const server = new Server(
	new BrowserHTMLReader(),
	new PreprocessorReader('browserify ./out/src/browser.js'),
	new PreprocessorReader('lessc ./src/browser.less')
);
server.start('localhost', 8080);

